import type { QuizRule, MatchState, PlayerState, StateTransition, ValidationResult, ScoreDisplay, RuleParamDef, ParticipantInit, PlayerOpts } from '../types'
import { cloneState, makePlayerState, makeMatchState, applyWin, applyEliminate, statusReason } from './utils'

export class NewYorkRule implements QuizRule {
  readonly id = 'new_york'
  readonly name = 'NewYork'
  readonly shortName = 'NY'
  readonly description = '正解+m、誤答-n。l以上で勝ち抜け、t以下or y誤答で失格。初期値x。'
  readonly paramDefs: RuleParamDef[] = [
    { key: 'gain', label: '正解獲得 (m)', type: 'number', defaultValue: 1, min: 1, max: 50 },
    { key: 'loss', label: '誤答減少 (n)', type: 'number', defaultValue: 1, min: 0, max: 50 },
    { key: 'start', label: '初期ポイント (x)', type: 'number', defaultValue: 0, min: -100, max: 100 },
    { key: 'win', label: '勝ち抜きポイント (l)', type: 'number', defaultValue: 10, min: 1, max: 200 },
    { key: 'elim_pt', label: '失格ポイント (t)', type: 'number', defaultValue: -20, min: -200, max: 0 },
    { key: 'elim_wrong', label: '失格誤答数 (y)', type: 'number', defaultValue: 0, min: 0, max: 20, description: '0=無制限' },
  ]
  initPlayerState(id: string, name: string, ruby: string, position: number, opts: PlayerOpts = {}): PlayerState {
    return makePlayerState(id, name, ruby, position, opts, {}, { points: 0 })
  }
  initMatchState(matchId: string, matchName: string, participants: ParticipantInit[], params: Record<string, number | string | boolean>): MatchState {
    const start = Number(params.start ?? 0)
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
    p.wrong++; p.points -= Number(state.ruleParams.loss); p.lastAnswered = 'wrong'
    const elimWrong = Number(state.ruleParams.elim_wrong)
    if (p.points <= Number(state.ruleParams.elim_pt)) return applyEliminate(next, playerId)
    if (elimWrong > 0 && p.wrong >= elimWrong) return applyEliminate(next, playerId)
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
    const start = params ? Number(params.start) : 0
    return { primary: `${player.points}pt`, secondary: `${player.correct}○${player.wrong}✕`, towerValue: player.points - start, towerMax: win - start }
  }
  getRuleSummary(params: Record<string, number | string | boolean>): string {
    return `NY: +${params.gain}/-${params.loss} ${params.win}pt勝ち抜け ${params.elim_pt}pt失格`
  }
}
