import type {
  QuizRule, PlayerState, MatchState, StateTransition,
  ValidationResult, ScoreDisplay, RuleParamDef,
} from '../types'
import { cloneState } from './utils'

export class ByRule implements QuizRule {
  readonly id = 'by'
  readonly name = 'by'
  readonly shortName = 'by'
  readonly description = '各プレイヤーの係数×正解数がポイント。指定点数で勝ち抜け。'

  readonly paramDefs: RuleParamDef[] = [
    { key: 'target', label: '勝ち抜け必要ポイント', type: 'number', defaultValue: 50, min: 1, max: 500 },
    { key: 'n', label: '失格誤答数 (n)', type: 'number', defaultValue: 1, min: 1, max: 10 },
    { key: 'default_coefficient', label: 'デフォルト係数', type: 'number', defaultValue: 1, min: 1, max: 10,
      description: '個別係数が未設定の場合に使用する係数' },
  ]

  initPlayerState(id: string, name: string, ruby: string, position: number,
    params: Record<string, number | string | boolean>): PlayerState {
    const coeff = (params[`coeff_${position}`] as number) ?? (params['default_coefficient'] as number) ?? 1
    return {
      id, name, ruby, position, status: 'active',
      correct: 0, wrong: 0, points: 0, restRemaining: 0,
      hasChain: false, chainCount: 0, lastAnswered: null,
      extra: { coefficient: coeff },
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
    const target = state.ruleParams['target'] as number
    const next = cloneState(state)
    const player = next.players.find(p => p.id === playerId)!
    const coeff = (player.extra['coefficient'] as number) ?? 1
    player.correct += 1
    player.points += coeff
    player.lastAnswered = 'correct'
    const sideEffects: StateTransition['sideEffects'] = []
    if (player.points >= target) {
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
    const sideEffects: StateTransition['sideEffects'] = []
    if (player.wrong >= n) {
      player.status = 'eliminated'
      sideEffects.push({ type: 'ELIMINATE', playerId })
    }
    return { nextState: next, sideEffects }
  }

  onPass(state: MatchState, _playerId: string): StateTransition {
    return { nextState: cloneState(state), sideEffects: [] }
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
    if (player.status === 'winner') return { valid: false, reason: '勝ち抜け済み' }
    if (player.status === 'eliminated') return { valid: false, reason: '失格' }
    return { valid: true }
  }

  getScoreDisplay(player: PlayerState): ScoreDisplay {
    const coeff = (player.extra['coefficient'] as number) ?? 1
    return {
      primary: `${player.points}pt`,
      secondary: `${player.correct}◯ ×${coeff}`,
      detail: `${player.wrong}×`,
    }
  }

  getRuleSummary(params: Record<string, number | string | boolean>): string {
    return `by (目標: ${params['target']}pt)`
  }
}
