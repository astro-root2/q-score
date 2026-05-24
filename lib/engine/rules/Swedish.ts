import type { QuizRule, MatchState, PlayerState, StateTransition, ValidationResult, ScoreDisplay, RuleParamDef, ParticipantInit, PlayerOpts } from '../types'
import { cloneState, makePlayerState, makeMatchState, applyWin, applyEliminate, statusReason } from './utils'

export const SWEDISH_DEFAULT_TABLE = [
  { minCorrect: 0, wrongCount: 1 },
  { minCorrect: 1, wrongCount: 2 },
  { minCorrect: 3, wrongCount: 3 },
  { minCorrect: 6, wrongCount: 4 },
  { minCorrect: 10, wrongCount: 5 },
]

function getWrongCount(correct: number, table: typeof SWEDISH_DEFAULT_TABLE): number {
  const sorted = [...table].sort((a, b) => b.minCorrect - a.minCorrect)
  for (const entry of sorted) {
    if (correct >= entry.minCorrect) return entry.wrongCount
  }
  return 1
}

export class SwedishRule implements QuizRule {
  readonly id = 'swedish'
  readonly name = 'Swedish m'
  readonly shortName = 'SWE'
  readonly description = '正解+1pt。誤答時に正解数に応じた×数が加算。m正解で勝ち抜け。'
  readonly paramDefs: RuleParamDef[] = [
    { key: 'win', label: '勝ち抜け正解数 (m)', type: 'number', defaultValue: 10, min: 1, max: 50 },
    { key: 'max_wrong', label: '失格×数上限', type: 'number', defaultValue: 0, min: 0, max: 30, description: '0=無制限' },
    { key: 'table', label: '正解数→×数テーブル', type: 'swedish_table', defaultValue: JSON.stringify(SWEDISH_DEFAULT_TABLE) },
  ]
  initPlayerState(id: string, name: string, ruby: string, position: number, opts: PlayerOpts = {}): PlayerState {
    return makePlayerState(id, name, ruby, position, opts, { totalWrong: 0 })
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
    let table = SWEDISH_DEFAULT_TABLE
    try { table = JSON.parse(String(state.ruleParams.table)) } catch { /* use default */ }
    const addWrong = getWrongCount(p.correct, table)
    p.wrong += addWrong
    p.extra = { ...p.extra, totalWrong: Number(p.extra.totalWrong ?? 0) + addWrong }
    p.lastAnswered = 'wrong'
    const maxWrong = Number(state.ruleParams.max_wrong)
    if (maxWrong > 0 && p.wrong >= maxWrong) return applyEliminate(next, playerId)
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
    return { primary: `${player.correct}○`, secondary: `${player.wrong}✕`, towerValue: player.correct, towerMax: win }
  }
  getRuleSummary(params: Record<string, number | string | boolean>): string {
    return `Swedish ${params.win}◯勝ち抜け`
  }
}
