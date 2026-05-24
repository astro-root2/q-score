import type {
  QuizRule, MatchState, PlayerState, StateTransition,
  ValidationResult, ScoreDisplay, RuleParamDef
} from '../types'
import { cloneState, applyWin, applyEliminate } from './utils'

export class FreezeRule implements QuizRule {
  readonly id = 'freeze'
  readonly name = 'フリーズ'
  readonly shortName = 'FRZ'
  readonly description = 'N正解で勝ち抜け。誤答でフリーズ（次問解答権なし）。M誤答で失格。'

  readonly paramDefs: RuleParamDef[] = [
    { key: 'win', label: '勝ち抜け正解数', type: 'number', defaultValue: 7, min: 1, max: 30 },
    { key: 'lose', label: '失格誤答数', type: 'number', defaultValue: 3, min: 1, max: 10 },
    { key: 'freeze_count', label: 'フリーズ問題数', type: 'number', defaultValue: 1, min: 1, max: 5 },
  ]

  initPlayerState(id: string, name: string, ruby: string, position: number): PlayerState {
    return {
      id, name, ruby, position,
      status: 'active',
      correct: 0, wrong: 0, points: 0,
      restRemaining: 0,
      hasChain: false, chainCount: 0,
      lastAnswered: null,
      extra: { frozen: 0 },
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
    const frozen = (p.extra.frozen as number) ?? 0
    if (frozen > 0) return { valid: false, reason: `フリーズ中 (あと${frozen}問)` }
    return { valid: true }
  }

  onCorrect(state: MatchState, playerId: string): StateTransition {
    const next = cloneState(state)
    const p = next.players.find(pl => pl.id === playerId)!
    p.correct++
    p.lastAnswered = 'correct'

    const win = Number(state.ruleParams.win ?? 7)
    if (p.correct >= win) return applyWin(next, playerId)
    return { nextState: next, sideEffects: [] }
  }

  onWrong(state: MatchState, playerId: string): StateTransition {
    const next = cloneState(state)
    const p = next.players.find(pl => pl.id === playerId)!
    p.wrong++
    p.lastAnswered = 'wrong'

    const lose = Number(state.ruleParams.lose ?? 3)
    const freezeCount = Number(state.ruleParams.freeze_count ?? 1)

    if (p.wrong >= lose) return applyEliminate(next, playerId)

    p.extra = { ...p.extra, frozen: freezeCount }
    return { nextState: next, sideEffects: [] }
  }

  onPass(state: MatchState, playerId: string): StateTransition {
    const next = cloneState(state)
    const p = next.players.find(pl => pl.id === playerId)!
    p.lastAnswered = null
    return { nextState: next, sideEffects: [] }
  }

  onQuestionNext(state: MatchState): StateTransition {
    const next = cloneState(state)
    next.questionNumber++
    for (const p of next.players) {
      if (p.status !== 'active') continue
      const frozen = (p.extra.frozen as number) ?? 0
      if (frozen > 0) p.extra = { ...p.extra, frozen: frozen - 1 }
    }
    return { nextState: next, sideEffects: [] }
  }

  getScoreDisplay(player: PlayerState): ScoreDisplay {
    const frozen = (player.extra.frozen as number) ?? 0
    return {
      primary: `${player.correct}○`,
      secondary: `${player.wrong}✕`,
      detail: frozen > 0 ? `🧊${frozen}` : undefined,
    }
  }

  getRuleSummary(params: Record<string, number | string | boolean>): string {
    return `${params.win}○${params.lose}✕フリーズ(${params.freeze_count}問)`
  }
}
