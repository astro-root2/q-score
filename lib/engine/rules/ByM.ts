import type { QuizRule, MatchState, PlayerState, StateTransition, ValidationResult, ScoreDisplay, RuleParamDef, ParticipantInit, PlayerOpts } from '../types'
import { cloneState, makePlayerState, makeMatchState, applyWin, applyEliminate, statusReason } from './utils'

export class ByMRule implements QuizRule {
  readonly id = 'by_m'
  readonly name = 'm by m'
  readonly shortName = 'BY'
  readonly description = '正解Pと誤答P(初期m)の積がm²以上で勝ち抜け。誤答Pがn以下で失格。'
  readonly paramDefs: RuleParamDef[] = [
    { key: 'win', label: '勝ち抜け基準値 (m)', type: 'number', defaultValue: 10, min: 1, max: 50 },
    { key: 'lose', label: '失格誤答ポイント下限 (n)', type: 'number', defaultValue: 4, min: 0, max: 20 },
  ]
  initPlayerState(id: string, name: string, ruby: string, position: number, opts: PlayerOpts = {}): PlayerState {
    return makePlayerState(id, name, ruby, position, opts, {}, { points: 0 })
  }
  initMatchState(matchId: string, matchName: string, participants: ParticipantInit[], params: Record<string, number | string | boolean>): MatchState {
    const m = Number(params.win ?? 10)
    return makeMatchState(matchId, matchName, participants, params, this.id,
      p => makePlayerState(p.id, p.name, p.ruby, p.position, p, { wrongPts: m }))
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
    p.correct++; p.lastAnswered = 'correct'
    const wrongPts = Number(p.extra.wrongPts ?? Number(state.ruleParams.win))
    const m = Number(state.ruleParams.win)
    if (p.correct * wrongPts >= m * m) return applyWin(next, playerId)
    return { nextState: next, sideEffects: [] }
  }
  onWrong(state: MatchState, playerId: string): StateTransition {
    const next = cloneState(state)
    const p = next.players.find(pl => pl.id === playerId)!
    p.wrong++; p.lastAnswered = 'wrong'
    p.extra = { ...p.extra, wrongPts: Number(p.extra.wrongPts ?? Number(state.ruleParams.win)) - 1 }
    const lose = Number(state.ruleParams.lose)
    if (Number(p.extra.wrongPts) <= lose) return applyEliminate(next, playerId)
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
    const m = params ? Number(params.win) : 10
    const wp = Number(player.extra.wrongPts ?? m)
    return {
      primary: `${player.correct}○`, secondary: `誤答P:${wp}`,
      detail: `積:${player.correct * wp}/${m * m}`,
      towerValue: player.correct * wp, towerMax: m * m,
    }
  }
  getRuleSummary(params: Record<string, number | string | boolean>): string {
    return `${params.win} by ${params.win}（誤答P≤${params.lose}で失格）`
  }
}
