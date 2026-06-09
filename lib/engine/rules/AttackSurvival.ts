// @ts-nocheck
import type { QuizRule, MatchState, PlayerState, StateTransition, ValidationResult, ScoreDisplay, RuleParamDef, ParticipantInit, PlayerOpts } from '../types'
import { cloneState, makePlayerState, makeMatchState, applyEliminate, statusReason } from './utils'

export class AttackSurvivalRule implements QuizRule {
  readonly id = 'attack_survival'
  readonly name = 'アタック風サバイバル'
  readonly shortName = 'ATK'
  readonly description = '自分の正解で相手-ypt。自分の誤答で自分-lpt。残りn人でゲーム終了。'
  readonly paramDefs: RuleParamDef[] = [
    { key: 'start', label: '初期ポイント (m)', type: 'number', defaultValue: 20, min: 1, max: 100 },
    { key: 'survive', label: 'ゲーム終了残り人数 (n)', type: 'number', defaultValue: 1, min: 1, max: 10 },
    { key: 'self_gain', label: '自分の正解+pt (x)', type: 'number', defaultValue: 0, min: 0, max: 20 },
    { key: 'atk', label: '相手への攻撃-pt (y)', type: 'number', defaultValue: 1, min: 0, max: 10 },
    { key: 'wrong_loss', label: '誤答時自分-pt (l)', type: 'number', defaultValue: 2, min: 0, max: 10 },
  ]
  initPlayerState(id: string, name: string, ruby: string, position: number, opts: PlayerOpts = {}): PlayerState {
    return makePlayerState(id, name, ruby, position, opts, {}, { points: 0 })
  }
  initMatchState(matchId: string, matchName: string, participants: ParticipantInit[], params: Record<string, number | string | boolean>): MatchState {
    const start = Number(params.start ?? 20)
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
    let next = cloneState(state)
    const p = next.players.find(pl => pl.id === playerId)!
    p.correct++; p.lastAnswered = 'correct'
    p.points += Number(state.ruleParams.self_gain)
    const atk = Number(state.ruleParams.atk)
    // 全アクティブな他プレイヤーへの攻撃
    for (const other of next.players) {
      if (other.id === playerId || other.status !== 'active') continue
      other.points = Math.max(0, other.points - atk)
      if (other.points <= 0) {
        const t = applyEliminate(next, other.id)
        next = t.nextState
      }
    }
    const survive = Number(state.ruleParams.survive)
    const active = next.players.filter(pl => pl.status === 'active')
    if (active.length <= survive) {
      for (const a of active) a.status = 'winner'
      next.status = 'completed'
    }
    return { nextState: next, sideEffects: [] }
  }
  onWrong(state: MatchState, playerId: string): StateTransition {
    const next = cloneState(state)
    const p = next.players.find(pl => pl.id === playerId)!
    p.wrong++; p.points = Math.max(0, p.points - Number(state.ruleParams.wrong_loss)); p.lastAnswered = 'wrong'
    if (p.points <= 0) return applyEliminate(next, playerId)
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
    const max = params ? Number(params.start) : 20
    return { primary: `${player.points}pt`, secondary: `${player.correct}○${player.wrong}✕`, towerValue: player.points, towerMax: max }
  }
  getRuleSummary(params: Record<string, number | string | boolean>): string {
    return `初期${params.start}pt 攻撃-${params.atk}pt 残り${params.survive}人終了`
  }
}
