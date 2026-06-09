// @ts-nocheck
import type { QuizRule, MatchState, PlayerState, StateTransition, ValidationResult, ScoreDisplay, RuleParamDef, ParticipantInit, PlayerOpts } from '../types'
import { cloneState, makePlayerState, makeMatchState, applyWin, applyEliminate, decrementRests, statusReason } from './utils'

export class UpDownRule implements QuizRule {
  readonly id = 'up_down'
  readonly name = 'm up-down'
  readonly shortName = 'UD'
  readonly description = '正解+1pt、誤答でリセット。mポイントで勝ち抜け、n誤答で失格。'
  readonly paramDefs: RuleParamDef[] = [
    { key: 'win', label: '勝ち抜けポイント (m)', type: 'number', defaultValue: 10, min: 1, max: 100 },
    { key: 'lose', label: '失格誤答数 (n)', type: 'number', defaultValue: 2, min: 0, max: 20, description: '0=無制限' },
  ]
  initPlayerState(id: string, name: string, ruby: string, position: number, opts: PlayerOpts = {}): PlayerState {
    return makePlayerState(id, name, ruby, position, opts)
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
    p.correct++; p.points++; p.lastAnswered = 'correct'
    if (p.points >= Number(state.ruleParams.win)) return applyWin(next, playerId)
    return { nextState: next, sideEffects: [] }
  }
  onWrong(state: MatchState, playerId: string): StateTransition {
    const next = cloneState(state)
    const p = next.players.find(pl => pl.id === playerId)!
    p.wrong++; p.points = 0; p.lastAnswered = 'wrong'
    const lose = Number(state.ruleParams.lose)
    if (lose > 0 && p.wrong >= lose) return applyEliminate(next, playerId)
    return { nextState: next, sideEffects: [] }
  }
  onPass(state: MatchState, playerId: string): StateTransition {
    const next = cloneState(state)
    next.players.find(pl => pl.id === playerId)!.lastAnswered = null
    return { nextState: next, sideEffects: [] }
  }
  onQuestionNext(state: MatchState): StateTransition {
    const next = cloneState(state)
    next.questionNumber++; next.questionText = null; decrementRests(next)
    return { nextState: next, sideEffects: [] }
  }
  getScoreDisplay(player: PlayerState, params?: Record<string, number | string | boolean>): ScoreDisplay {
    const win = params ? Number(params.win) : 10
    return { primary: `${player.points}pt`, secondary: `${player.wrong}✕`, towerValue: player.points, towerMax: win }
  }
  getRuleSummary(params: Record<string, number | string | boolean>): string {
    return `${params.win} up-down ${params.lose}✕失格`
  }
}
