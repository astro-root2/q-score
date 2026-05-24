import type { QuizRule, MatchState, PlayerState, StateTransition, ValidationResult, ScoreDisplay, RuleParamDef, ParticipantInit, PlayerOpts } from '../types'
import { cloneState, makePlayerState, makeMatchState, applyWin, applyEliminate, decrementRests, statusReason } from './utils'

export class FreezeRule implements QuizRule {
  readonly id = 'freeze'
  readonly name = 'Freeze m'
  readonly shortName = 'FRZ'
  readonly description = '誤答で通算誤答数分休み。m問正解で勝ち抜け、n誤答で失格(0=無制限)。'
  readonly paramDefs: RuleParamDef[] = [
    { key: 'win', label: '勝ち抜け正解数 (m)', type: 'number', defaultValue: 10, min: 1, max: 50 },
    { key: 'lose', label: '失格誤答数 (n)', type: 'number', defaultValue: 0, min: 0, max: 20, description: '0=無制限' },
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
    p.correct++; p.lastAnswered = 'correct'
    if (p.correct >= Number(state.ruleParams.win)) return applyWin(next, playerId)
    return { nextState: next, sideEffects: [] }
  }
  onWrong(state: MatchState, playerId: string): StateTransition {
    const next = cloneState(state)
    const p = next.players.find(pl => pl.id === playerId)!
    p.wrong++; p.lastAnswered = 'wrong'
    const lose = Number(state.ruleParams.lose)
    if (lose > 0 && p.wrong >= lose) return applyEliminate(next, playerId)
    // 累積誤答数分休み
    p.status = 'resting'; p.restRemaining = p.wrong
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
    return {
      primary: `${player.correct}○`, secondary: `${player.wrong}✕`,
      detail: player.status === 'resting' ? `🧊あと${player.restRemaining}` : undefined,
      towerValue: player.correct, towerMax: win,
    }
  }
  getRuleSummary(params: Record<string, number | string | boolean>): string {
    return `Freeze ${params.win}◯${Number(params.lose) === 0 ? '∞' : params.lose + '✕'}失格`
  }
}
