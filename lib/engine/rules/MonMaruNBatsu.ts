import type {
  QuizRule, PlayerState, MatchState, StateTransition,
  ValidationResult, ScoreDisplay, RuleParamDef,
} from '../types'
import { cloneState } from './utils'

export class MonMaruNBatsuRule implements QuizRule {
  readonly id = 'mon_maru_n_batsu'
  readonly name = 'm◯n×'
  readonly shortName = 'm◯n×'
  readonly description = 'クイズの基本ルール。m問正解で勝ち抜け、n問誤答で失格。'

  readonly paramDefs: RuleParamDef[] = [
    { key: 'm', label: '勝ち抜け正解数 (m)', type: 'number', defaultValue: 3, min: 1, max: 20,
      description: 'この数の正解で勝ち抜け' },
    { key: 'n', label: '失格誤答数 (n)', type: 'number', defaultValue: 1, min: 1, max: 10,
      description: 'この数の誤答で失格' },
  ]

  initPlayerState(id: string, name: string, ruby: string, position: number,
    _params: Record<string, number | string | boolean>): PlayerState {
    return {
      id, name, ruby, position, status: 'active',
      correct: 0, wrong: 0, points: 0, restRemaining: 0,
      hasChain: false, chainCount: 0, lastAnswered: null, extra: {},
    }
  }

  initMatchState(matchId: string, matchName: string,
    participants: Array<{ id: string; name: string; ruby: string; position: number }>,
    params: Record<string, number | string | boolean>): MatchState {
    return {
      matchId, matchName, status: 'pending', ruleId: this.id, ruleParams: params,
      questionNumber: 0,
      players: participants.map(p => this.initPlayerState(p.id, p.name, p.ruby, p.position, params)),
      eventSeq: 0, updatedAt: new Date().toISOString(),
    }
  }

  onCorrect(state: MatchState, playerId: string): StateTransition {
    const m = state.ruleParams['m'] as number
    const next = cloneState(state)
    const player = next.players.find(p => p.id === playerId)!
    player.correct += 1
    player.lastAnswered = 'correct'
    player.chainCount = 0
    const sideEffects: StateTransition['sideEffects'] = []
    if (player.correct >= m) {
      player.status = 'winner'
      sideEffects.push({ type: 'WIN', playerId })
    }
    return { nextState: next, sideEffects }
  }

  onWrong(state: MatchState, playerId: string): StateTransition {
    const n = state.ruleParams['n'] as number
    const next = cloneState(state)
    const player = next.players.find(p => p.id === playerId)!
    player.wrong += 1
    player.lastAnswered = 'wrong'
    player.chainCount = 0
    const sideEffects: StateTransition['sideEffects'] = []
    if (player.wrong >= n) {
      player.status = 'eliminated'
      sideEffects.push({ type: 'ELIMINATE', playerId })
    }
    return { nextState: next, sideEffects }
  }

  onPass(state: MatchState, playerId: string): StateTransition {
    const next = cloneState(state)
    const player = next.players.find(p => p.id === playerId)!
    player.lastAnswered = null
    return { nextState: next, sideEffects: [] }
  }

  onQuestionNext(state: MatchState): StateTransition {
    const next = cloneState(state)
    next.questionNumber += 1
    return { nextState: next, sideEffects: [] }
  }

  canAnswer(state: MatchState, playerId: string): ValidationResult {
    const player = state.players.find(p => p.id === playerId)
    if (!player) return { valid: false, reason: 'プレイヤーが見つかりません' }
    if (state.status !== 'active') return { valid: false, reason: '試合が進行中ではありません' }
    if (player.status === 'winner') return { valid: false, reason: '既に勝ち抜けています' }
    if (player.status === 'eliminated') return { valid: false, reason: '既に失格です' }
    if (player.status === 'resting') return { valid: false, reason: `休み中 (残り${player.restRemaining}問)` }
    return { valid: true }
  }

  getScoreDisplay(player: PlayerState): ScoreDisplay {
    return { primary: `${player.correct}◯`, secondary: `${player.wrong}✕` }
  }

  getRuleSummary(params: Record<string, number | string | boolean>): string {
    return `${params['m']}◯ ${params['n']}✕`
  }
}
