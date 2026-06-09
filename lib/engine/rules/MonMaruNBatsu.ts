// @ts-nocheck
import type { QuizRule, MatchState, PlayerState, StateTransition, ValidationResult, ScoreDisplay, RuleParamDef, ParticipantInit, PlayerOpts } from '../types'
import { cloneState, makePlayerState, makeMatchState, applyWin, applyEliminate, applyRest, decrementRests, statusReason } from './utils'

export class MonMaruNBatsuRule implements QuizRule {
  readonly id = 'mon_maru_n_batsu'
  readonly name = 'm◯n×x休'
  readonly shortName = 'MON'
  readonly description = 'm問正解で勝ち抜け、n問誤答で失格。誤答時x問休み(0=なし)。'
  readonly paramDefs: RuleParamDef[] = [
    { key: 'win', label: '勝ち抜け正解数 (m)', type: 'number', defaultValue: 5, min: 1, max: 50 },
    { key: 'lose', label: '失格誤答数 (n)', type: 'number', defaultValue: 2, min: 0, max: 20, description: '0=無制限' },
    { key: 'rest', label: '誤答時休み問数 (x)', type: 'number', defaultValue: 0, min: 0, max: 10 },
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
    if (p.correct >= Number(state.ruleParams.win)) return applyWin(next, playerId)
    return { nextState: next, sideEffects: [] }
  }
  onWrong(state: MatchState, playerId: string): StateTransition {
    const next = cloneState(state)
    const p = next.players.find(pl => pl.id === playerId)!
    p.wrong++; p.lastAnswered = 'wrong'
    const lose = Number(state.ruleParams.lose); const rest = Number(state.ruleParams.rest)
    if (lose > 0 && p.wrong >= lose) return applyEliminate(next, playerId)
    if (rest > 0) return applyRest(next, playerId, rest)
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
    return { primary: `${player.correct}○`, secondary: `${player.wrong}✕`, towerValue: player.correct, towerMax: win }
  }
  getRuleSummary(params: Record<string, number | string | boolean>): string {
    const rest = Number(params.rest)
    return `${params.win}◯${params.lose}✕${rest > 0 ? `${rest}休` : ''}`
  }
}
