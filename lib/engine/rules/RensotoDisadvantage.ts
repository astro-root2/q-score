import type { QuizRule, MatchState, PlayerState, StateTransition, ValidationResult, ScoreDisplay, RuleParamDef, ParticipantInit, PlayerOpts } from '../types'
import { cloneState, makePlayerState, makeMatchState, applyWin, applyEliminate, statusReason } from './utils'

export class RensotoDisadvantageRule implements QuizRule {
  readonly id = 'rensoto_disadvantage'
  readonly name = '連誤答ディスアド付きm◯n×'
  readonly shortName = 'DIS'
  readonly description = 'ディスアド持ちで誤答すると2×。ディスアドは自分の正解でのみ消失。'
  readonly paramDefs: RuleParamDef[] = [
    { key: 'win', label: '勝ち抜け正解数 (m)', type: 'number', defaultValue: 5, min: 1, max: 50 },
    { key: 'lose', label: '失格誤答数 (n)', type: 'number', defaultValue: 3, min: 1, max: 20 },
  ]
  initPlayerState(id: string, name: string, ruby: string, position: number, opts: PlayerOpts = {}): PlayerState {
    return makePlayerState(id, name, ruby, position, opts, { hasDisadvantage: false })
  }
  initMatchState(matchId: string, matchName: string, participants: ParticipantInit[], params: Record<string, number | string | boolean>): MatchState {
    return makeMatchState(matchId, matchName, participants, params, this.id, p => this.initPlayerState(p.id, p.name, p.ruby, p.position, p))
  }
  canAnswer(state: MatchState, playerId: string): ValidationResult {
    const p = state.players.find(pl => pl.id === playerId)
    if (!p) return { valid: false, reason: 'Player not found' }
    if (p.status !== 'active') return { valid: false, reason: statusReason(p.status, p.restRemaining) }
    return { valid: true }
  }
  onCorrect(state: MatchState, playerId: string): StateTransition {
    const next = cloneState(state)
    const p = next.players.find(pl => pl.id === playerId)!
    p.correct++; p.extra = { ...p.extra, hasDisadvantage: false }; p.lastAnswered = 'correct'
    if (p.correct >= Number(state.ruleParams.win)) return applyWin(next, playerId)
    return { nextState: next, sideEffects: [] }
  }
  onWrong(state: MatchState, playerId: string): StateTransition {
    const next = cloneState(state)
    const p = next.players.find(pl => pl.id === playerId)!
    const addWrong = p.extra.hasDisadvantage ? 2 : 1
    p.wrong += addWrong; p.extra = { ...p.extra, hasDisadvantage: true }; p.lastAnswered = 'wrong'
    if (p.wrong >= Number(state.ruleParams.lose)) return applyEliminate(next, playerId)
    return { nextState: next, sideEffects: [] }
  }
  onPass(state: MatchState, playerId: string): StateTransition {
    const next = cloneState(state)
    next.players.find(pl => pl.id === playerId)!.lastAnswered = null
    return { nextState: next, sideEffects: [] }
  }
  onQuestionNext(state: MatchState): StateTransition {
    const next = cloneState(state)
    next.questionNumber++; next.questionText = null
    return { nextState: next, sideEffects: [] }
  }
  getScoreDisplay(player: PlayerState, params?: Record<string, number | string | boolean>): ScoreDisplay {
    const win = params ? Number(params.win) : 10
    return {
      primary: `${player.correct}○`, secondary: `${player.wrong}✕`,
      detail: player.extra.hasDisadvantage ? '⚡DIS' : undefined,
      towerValue: player.correct, towerMax: win,
    }
  }
  getRuleSummary(params: Record<string, number | string | boolean>): string {
    return `${params.win}◯${params.lose}✕連誤答ディスアド付き`
  }
}
