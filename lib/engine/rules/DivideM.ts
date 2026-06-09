// @ts-nocheck
import type { QuizRule, MatchState, PlayerState, StateTransition, ValidationResult, ScoreDisplay, RuleParamDef, ParticipantInit, PlayerOpts } from '../types'
import { cloneState, makePlayerState, makeMatchState, applyWin, applyEliminate, statusReason } from './utils'

export class DivideMRule implements QuizRule {
  readonly id = 'divide_m'
  readonly name = 'm divide m'
  readonly shortName = 'DIV'
  readonly description = '初期mpt。正解+npt。a回目の誤答でポイントを1/a倍(切捨)。xpt以上勝ち抜け、y誤答失格。'
  readonly paramDefs: RuleParamDef[] = [
    { key: 'start', label: '初期ポイント (m)', type: 'number', defaultValue: 10, min: 1, max: 200 },
    { key: 'gain', label: '正解獲得ポイント (n)', type: 'number', defaultValue: 10, min: 1, max: 100 },
    { key: 'win', label: '勝ち抜けポイント (x)', type: 'number', defaultValue: 100, min: 1, max: 1000 },
    { key: 'lose', label: '失格誤答数 (y)', type: 'number', defaultValue: 6, min: 0, max: 20, description: '0=無制限' },
  ]
  initPlayerState(id: string, name: string, ruby: string, position: number, opts: PlayerOpts = {}): PlayerState {
    return makePlayerState(id, name, ruby, position, opts, {}, { points: 0 })
  }
  initMatchState(matchId: string, matchName: string, participants: ParticipantInit[], params: Record<string, number | string | boolean>): MatchState {
    const start = Number(params.start ?? 10)
    return makeMatchState(matchId, matchName, participants, params, this.id,
      p => makePlayerState(p.id, p.name, p.ruby, p.position, p, {}, { points: start }))
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
    p.correct++; p.points += Number(state.ruleParams.gain); p.lastAnswered = 'correct'
    if (p.points >= Number(state.ruleParams.win)) return applyWin(next, playerId)
    return { nextState: next, sideEffects: [] }
  }
  onWrong(state: MatchState, playerId: string): StateTransition {
    const next = cloneState(state)
    const p = next.players.find(pl => pl.id === playerId)!
    p.wrong++; p.lastAnswered = 'wrong'
    p.points = Math.floor(p.points / p.wrong)
    const lose = Number(state.ruleParams.lose)
    if (p.points < 1) return applyEliminate(next, playerId)
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
    next.questionNumber++; next.questionText = null
    return { nextState: next, sideEffects: [] }
  }
  getScoreDisplay(player: PlayerState, params?: Record<string, number | string | boolean>): ScoreDisplay {
    const win = params ? Number(params.win) : 100
    return { primary: `${player.points}pt`, secondary: `${player.correct}○${player.wrong}✕`, towerValue: player.points, towerMax: win }
  }
  getRuleSummary(params: Record<string, number | string | boolean>): string {
    return `初期${params.start}pt+${params.gain} divide ${params.win}pt勝ち抜け`
  }
}
