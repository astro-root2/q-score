import type {
  QuizRule, MatchState, PlayerState, StateTransition,
  ValidationResult, ScoreDisplay, RuleParamDef
} from '../types'
import { cloneState, applyWin, applyEliminate } from './utils'

export class SwedishRule implements QuizRule {
  readonly id = 'swedish'
  readonly name = 'スウェーデン'
  readonly shortName = 'SWE'
  readonly description = '正解でポイントが増加、誤答でリセット。累計ポイントがWin点で勝ち抜け。M誤答で失格。'

  readonly paramDefs: RuleParamDef[] = [
    { key: 'win_points', label: '勝ち抜けポイント', type: 'number', defaultValue: 15, min: 1, max: 100 },
    { key: 'lose', label: '失格誤答数', type: 'number', defaultValue: 3, min: 1, max: 10 },
    { key: 'base_point', label: '基礎ポイント', type: 'number', defaultValue: 1, min: 1, max: 10 },
    { key: 'chain_bonus', label: '連続正解ボーナス', type: 'number', defaultValue: 1, min: 0, max: 5 },
  ]

  initPlayerState(id: string, name: string, ruby: string, position: number): PlayerState {
    return {
      id, name, ruby, position,
      status: 'active',
      correct: 0, wrong: 0, points: 0,
      restRemaining: 0,
      hasChain: false, chainCount: 0,
      lastAnswered: null,
      extra: {},
    }
  }

  initMatchState(
    matchId: string, matchName: string,
    participants: Array<{ id: string; name: string; ruby: string; position: number }>,
    params: Record<string, number | string | boolean>
  ): MatchState {
    return {
      matchId, matchName,
      status: 'pending',
      ruleId: this.id,
      ruleParams: params,
      questionNumber: 0,
      players: participants.map(p => this.initPlayerState(p.id, p.name, p.ruby, p.position)),
      eventSeq: 0,
      updatedAt: new Date().toISOString(),
    }
  }

  canAnswer(state: MatchState, playerId: string): ValidationResult {
    const p = state.players.find(pl => pl.id === playerId)
    if (!p) return { valid: false, reason: 'Player not found' }
    if (p.status !== 'active') return { valid: false, reason: `Status: ${p.status}` }
    return { valid: true }
  }

  onCorrect(state: MatchState, playerId: string): StateTransition {
    const next = cloneState(state)
    const p = next.players.find(pl => pl.id === playerId)!
    const base = Number(state.ruleParams.base_point ?? 1)
    const bonus = Number(state.ruleParams.chain_bonus ?? 1)

    p.correct++
    p.chainCount = (p.chainCount ?? 0) + 1
    p.hasChain = p.chainCount > 1
    p.lastAnswered = 'correct'

    const gain = base + bonus * (p.chainCount - 1)
    p.points += gain

    const winPoints = Number(state.ruleParams.win_points ?? 15)
    if (p.points >= winPoints) return applyWin(next, playerId)
    return { nextState: next, sideEffects: [] }
  }

  onWrong(state: MatchState, playerId: string): StateTransition {
    const next = cloneState(state)
    const p = next.players.find(pl => pl.id === playerId)!
    p.wrong++
    p.chainCount = 0
    p.hasChain = false
    p.lastAnswered = 'wrong'

    const lose = Number(state.ruleParams.lose ?? 3)
    if (p.wrong >= lose) return applyEliminate(next, playerId)
    return { nextState: next, sideEffects: [] }
  }

  onPass(state: MatchState, playerId: string): StateTransition {
    const next = cloneState(state)
    const p = next.players.find(pl => pl.id === playerId)!
    p.chainCount = 0
    p.hasChain = false
    p.lastAnswered = null
    return { nextState: next, sideEffects: [] }
  }

  onQuestionNext(state: MatchState): StateTransition {
    const next = cloneState(state)
    next.questionNumber++
    return { nextState: next, sideEffects: [] }
  }

  getScoreDisplay(player: PlayerState): ScoreDisplay {
    return {
      primary: `${player.points}pt`,
      secondary: `${player.correct}○ ${player.wrong}✕`,
      detail: player.chainCount > 1 ? `🔥×${player.chainCount}` : undefined,
    }
  }

  getRuleSummary(params: Record<string, number | string | boolean>): string {
    return `累計${params.win_points}pt勝ち抜け ${params.lose}✕失格 (連続ボーナス+${params.chain_bonus})`
  }
}
