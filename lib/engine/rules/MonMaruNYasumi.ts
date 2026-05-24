import type {
  QuizRule, PlayerState, MatchState, StateTransition,
  ValidationResult, ScoreDisplay, RuleParamDef,
} from '../types'
import { cloneState } from './utils'

export class MonMaruNYasumiRule implements QuizRule {
  readonly id = 'mon_maru_n_yasumi'
  readonly name = 'm◯n休'
  readonly shortName = 'm◯n休'
  readonly description = 'm問正解で勝ち抜け、誤答するとn問休み。失格なし。'

  readonly paramDefs: RuleParamDef[] = [
    { key: 'm', label: '勝ち抜け正解数 (m)', type: 'number', defaultValue: 3, min: 1, max: 20 },
    { key: 'n', label: '誤答後の休み問題数 (n)', type: 'number', defaultValue: 1, min: 1, max: 10,
      description: '誤答後にこの問題数だけ解答できない' },
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
    player.restRemaining = n
    player.status = 'resting'
    return { nextState: next, sideEffects: [{ type: 'REST_START', playerId, data: { restRemaining: n } }] }
  }

  onPass(state: MatchState, _playerId: string): StateTransition {
    return { nextState: cloneState(state), sideEffects: [] }
  }

  onQuestionNext(state: MatchState): StateTransition {
    const next = cloneState(state)
    next.questionNumber += 1
    const sideEffects: StateTransition['sideEffects'] = []
    for (const player of next.players) {
      if (player.status === 'resting') {
        player.restRemaining -= 1
        if (player.restRemaining <= 0) {
          player.restRemaining = 0
          player.status = 'active'
          sideEffects.push({ type: 'REST_END', playerId: player.id })
        }
      }
    }
    return { nextState: next, sideEffects }
  }

  canAnswer(state: MatchState, playerId: string): ValidationResult {
    const player = state.players.find(p => p.id === playerId)
    if (!player) return { valid: false, reason: 'プレイヤーが見つかりません' }
    if (state.status !== 'active') return { valid: false, reason: '試合が進行中ではありません' }
    if (player.status === 'winner') return { valid: false, reason: '勝ち抜け済み' }
    if (player.status === 'resting') return { valid: false, reason: `休み中 (残り${player.restRemaining}問)` }
    return { valid: true }
  }

  getScoreDisplay(player: PlayerState): ScoreDisplay {
    const rest = player.status === 'resting' ? ` 休${player.restRemaining}` : ''
    return { primary: `${player.correct}◯`, secondary: `${player.wrong}×${rest}` }
  }

  getRuleSummary(params: Record<string, number | string | boolean>): string {
    return `${params['m']}◯ ${params['n']}休`
  }
}
