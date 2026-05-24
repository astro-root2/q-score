import type {
  QuizRule, PlayerState, MatchState, StateTransition,
  ValidationResult, ScoreDisplay, RuleParamDef,
} from '../types'
import { cloneState } from './utils'

export class RensotoTsukiRule implements QuizRule {
  readonly id = 'rensoto_tsuki'
  readonly name = '連答付き'
  readonly shortName = '連答'
  readonly description = '連答権あり。正解後は次問も解答可。連答権保持中の誤答は権利消失。'

  readonly paramDefs: RuleParamDef[] = [
    { key: 'm', label: '勝ち抜け正解数 (m)', type: 'number', defaultValue: 5, min: 1, max: 20 },
    { key: 'n', label: '失格誤答数 (n)', type: 'number', defaultValue: 2, min: 1, max: 10 },
    { key: 'chain_bonus', label: '連答ボーナス', type: 'number', defaultValue: 0, min: 0, max: 5,
      description: '連答成功時に正解カウントに加算するボーナス点' },
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
    const wasChain = player.hasChain
    player.correct += 1
    if (wasChain) player.chainCount += 1
    player.hasChain = true
    player.lastAnswered = 'correct'
    const sideEffects: StateTransition['sideEffects'] = []
    if (player.correct >= m) {
      player.status = 'winner'
      player.hasChain = false
      sideEffects.push({ type: 'WIN', playerId })
    }
    return { nextState: next, sideEffects }
  }

  onWrong(state: MatchState, playerId: string): StateTransition {
    const n = state.ruleParams['n'] as number
    const next = cloneState(state)
    const player = next.players.find(p => p.id === playerId)!
    player.wrong += 1
    player.hasChain = false
    player.chainCount = 0
    player.lastAnswered = 'wrong'
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
    player.hasChain = false
    player.chainCount = 0
    return { nextState: next, sideEffects: [] }
  }

  onQuestionNext(state: MatchState): StateTransition {
    const next = cloneState(state)
    next.questionNumber += 1
    for (const p of next.players) {
      if (!p.hasChain) p.chainCount = 0
    }
    return { nextState: next, sideEffects: [] }
  }

  canAnswer(state: MatchState, playerId: string): ValidationResult {
    const player = state.players.find(p => p.id === playerId)
    if (!player) return { valid: false, reason: 'プレイヤーが見つかりません' }
    if (state.status !== 'active') return { valid: false, reason: '試合が進行中ではありません' }
    if (player.status === 'winner') return { valid: false, reason: '勝ち抜け済み' }
    if (player.status === 'eliminated') return { valid: false, reason: '失格' }
    return { valid: true }
  }

  getScoreDisplay(player: PlayerState): ScoreDisplay {
    const chainIndicator = player.hasChain ? '🔗' : ''
    return {
      primary: `${player.correct}◯ ${chainIndicator}`,
      secondary: `${player.wrong}×`,
      detail: player.chainCount > 0 ? `連答${player.chainCount}` : undefined,
    }
  }

  getRuleSummary(params: Record<string, number | string | boolean>): string {
    return `連答付き ${params['m']}◯ ${params['n']}×`
  }
}
