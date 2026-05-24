import type { MatchState, GameEvent, EventType, StateTransition } from './types'
import { RuleRegistry } from './rules/index'
import { cloneState } from './rules/utils'

export class GameEngine {
  static validate(
    state: MatchState,
    eventType: EventType,
    actorId?: string
  ): { valid: boolean; reason?: string } {
    const rule = RuleRegistry.find(state.ruleId)
    if (!rule) return { valid: false, reason: `Unknown rule: ${state.ruleId}` }

    switch (eventType) {
      case 'MATCH_START':
        if (state.status !== 'pending') return { valid: false, reason: 'すでに開始されています' }
        if (state.players.length === 0) return { valid: false, reason: 'プレイヤーがいません' }
        return { valid: true }
      case 'MATCH_PAUSE':
        if (state.status !== 'active') return { valid: false, reason: '試合が進行中ではありません' }
        return { valid: true }
      case 'MATCH_RESUME':
        if (state.status !== 'paused') return { valid: false, reason: '一時停止中ではありません' }
        return { valid: true }
      case 'MATCH_END':
        if (state.status === 'completed') return { valid: false, reason: 'すでに終了しています' }
        return { valid: true }
      case 'CORRECT':
      case 'WRONG':
      case 'PASS':
        if (!actorId) return { valid: false, reason: 'プレイヤーIDが必要です' }
        return rule.canAnswer(state, actorId)
      case 'QUESTION_NEXT':
      case 'QUESTION_SKIP':
        if (state.status !== 'active') return { valid: false, reason: '試合が進行中ではありません' }
        return { valid: true }
      case 'OVERRIDE':
        return { valid: true }
      case 'UNDO':
        return { valid: true }
      default:
        return { valid: true }
    }
  }

  static applyEvent(state: MatchState, event: GameEvent): MatchState {
    const rule = RuleRegistry.find(state.ruleId)
    if (!rule) throw new Error(`Unknown rule: ${state.ruleId}`)

    const next = cloneState(state)
    next.eventSeq = event.seq

    switch (event.eventType) {
      case 'MATCH_START':
        next.status = 'active'
        next.questionNumber = 1
        break
      case 'MATCH_PAUSE':
        next.status = 'paused'
        break
      case 'MATCH_RESUME':
        next.status = 'active'
        break
      case 'MATCH_END':
        next.status = 'completed'
        break
      case 'CORRECT': {
        if (!event.actorId) break
        const { nextState } = rule.onCorrect(next, event.actorId)
        return { ...nextState, eventSeq: event.seq }
      }
      case 'WRONG': {
        if (!event.actorId) break
        const { nextState } = rule.onWrong(next, event.actorId)
        return { ...nextState, eventSeq: event.seq }
      }
      case 'PASS': {
        if (!event.actorId) break
        const { nextState } = rule.onPass(next, event.actorId)
        return { ...nextState, eventSeq: event.seq }
      }
      case 'QUESTION_NEXT':
      case 'QUESTION_SKIP': {
        const { nextState } = rule.onQuestionNext(next)
        return { ...nextState, eventSeq: event.seq }
      }
      case 'OVERRIDE': {
        const { playerId, field, value } = event.payload as {
          playerId: string
          field: keyof import('./types').PlayerState
          value: number
        }
        const player = next.players.find(p => p.id === playerId)
        if (player && field in player) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ;(player as any)[field] = value
        }
        break
      }
      default:
        break
    }

    return next
  }

  static replay(events: GameEvent[], baseState?: MatchState | null): MatchState {
    const active = events.filter(e => !e.undone).sort((a, b) => a.seq - b.seq)

    if (active.length === 0) {
      if (baseState) return cloneState(baseState)
      throw new Error('No events and no base state to replay from')
    }

    let startSeq = 0
    let state: MatchState

    if (baseState) {
      state = cloneState(baseState)
      startSeq = baseState.eventSeq + 1
    } else {
      state = active[0]
        ? GameEngine.applyEvent(createEmptyState(active[0].matchId), active[0])
        : createEmptyState(active[0]?.matchId ?? 'unknown')
      startSeq = 1
    }

    for (const event of active) {
      if (event.seq < startSeq) continue
      state = GameEngine.applyEvent(state, event)
    }

    return state
  }

  static undo(
    events: GameEvent[],
    baseState?: MatchState | null
  ): { newEvents: GameEvent[]; newState: MatchState } | null {
    const undoableTypes: EventType[] = ['CORRECT', 'WRONG', 'PASS', 'QUESTION_NEXT', 'QUESTION_SKIP', 'OVERRIDE']
    const lastUndoable = [...events]
      .filter(e => !e.undone && undoableTypes.includes(e.eventType))
      .sort((a, b) => b.seq - a.seq)[0]

    if (!lastUndoable) return null

    const newEvents = events.map(e =>
      e.id === lastUndoable.id ? { ...e, undone: true } : e
    )
    const newState = GameEngine.replay(newEvents, baseState)

    return { newEvents, newState }
  }
}

function createEmptyState(matchId: string): MatchState {
  return {
    matchId, matchName: '', status: 'pending', ruleId: '', ruleParams: {},
    questionNumber: 0, players: [], eventSeq: 0,
    updatedAt: new Date().toISOString(),
  }
}
