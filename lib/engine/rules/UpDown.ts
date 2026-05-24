import type {
  QuizRule, PlayerState, MatchState, StateTransition,
  ValidationResult, ScoreDisplay, RuleParamDef,
} from '../types'
import { cloneState } from './utils'

export class UpDownRule implements QuizRule {
  readonly id = 'up_down'
  readonly name = 'Up-Down'
  readonly shortName = 'UD'
  readonly description = '正解で+1、誤答で指定点数減点。目標点で勝ち抜け。'

  readonly paramDefs: RuleParamDef[] = [
    { key: 'target', label: '勝ち抜け点数', type: 'number', defaultValue: 10, min: 1, max: 50 },
    { key: 'down', label: '失格ライン (負の数で指定)', type: 'number', defaultValue: -3, min: -20, max: -1 },
    { key: 'wrong_penalty', label: '誤答ペナルティ点数', type: 'number', defaultValue: 1, min: 1, max: 5 },
    { key: 'start_points', label: '初期点数', type: 'number', defaultValue: 0, min: -10, max: 10 },
  ]

  initPlayerState(id: string, name: string, ruby: string, position: number,
    params: Record<string, number | string | boolean>): PlayerState {
    const startPts = (params['start_points'] as number) ?? 0
    return {
      id, name, ruby, position, status: 'active',
      correct: 0, wrong: 0, points: startPts, restRemaining: 0,
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
    const target = state.ruleParams['target'] as number
    const next = cloneState(state)
    const player = next.players.find(p => p.id === playerId)!
    player.correct += 1
    player.points += 1
    player.lastAnswered = 'correct'
    const sideEffects: StateTransition['sideEffects'] = []
    if (player.points >= target) {
      player.status = 'winner'
      sideEffects.push({ type: 'WIN', playerId })
    }
    return { nextState: next, sideEffects }
  }

  onWrong(state: MatchState, playerId: string): StateTransition {
    const down = state.ruleParams['down'] as number
    const penalty = state.ruleParams['wrong_penalty'] as number
    const next = cloneState(state)
    const player = next.players.find(p => p.id === playerId)!
    player.wrong += 1
    player.points -= penalty
    player.lastAnswered = 'wrong'
    const sideEffects: StateTransition['sideEffects'] = []
    if (player.points <= down) {
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
    const sign = player.points >= 0 ? '+' : ''
    return { primary: `${sign}${player.points}pt`, secondary: `${player.correct}◯ ${player.wrong}×` }
  }

  getRuleSummary(params: Record<string, number | string | boolean>): string {
    return `Up-Down (目標: ${params['target']}pt / 失格: ${params['down']}pt)`
  }
}
