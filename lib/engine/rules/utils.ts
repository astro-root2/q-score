// @ts-nocheck
import type { MatchState, PlayerState, PlayerOpts, ParticipantInit, StateTransition } from '../types'

export function cloneState(state: MatchState): MatchState {
  return { ...state, players: state.players.map(p => ({ ...p, extra: { ...p.extra } })) }
}

export function makePlayerState(
  id: string, name: string, ruby: string, position: number,
  opts: PlayerOpts = {}, extra: Record<string, unknown> = {},
  override: Partial<PlayerState> = {}
): PlayerState {
  return {
    id, name, ruby, position,
    nickname: opts.nickname ?? null,
    affiliation: opts.affiliation ?? null,
    grade: opts.grade ?? null,
    paperRank: opts.paperRank ?? null,
    status: 'active', correct: 0, wrong: 0, points: 0,
    restRemaining: 0, hasChain: false, chainCount: 0, lastAnswered: null,
    extra, ...override,
  }
}

export function makeMatchState(
  matchId: string, matchName: string, participants: ParticipantInit[],
  params: Record<string, number | string | boolean>, ruleId: string,
  initPlayer: (p: ParticipantInit) => PlayerState
): MatchState {
  return {
    matchId, matchName, status: 'pending', ruleId, ruleParams: params,
    questionNumber: 0, questionText: null,
    players: participants.map(initPlayer),
    eventSeq: 0, updatedAt: new Date().toISOString(),
  }
}

export function applyWin(state: MatchState, playerId: string): StateTransition {
  const p = state.players.find(pl => pl.id === playerId)!
  p.status = 'winner'
  if (state.players.every(pl => pl.status !== 'active')) state.status = 'completed'
  return { nextState: state, sideEffects: [] }
}

export function applyEliminate(state: MatchState, playerId: string): StateTransition {
  const p = state.players.find(pl => pl.id === playerId)!
  p.status = 'eliminated'
  if (state.players.every(pl => pl.status !== 'active')) state.status = 'completed'
  return { nextState: state, sideEffects: [] }
}

export function applyRest(state: MatchState, playerId: string, restCount: number): StateTransition {
  const p = state.players.find(pl => pl.id === playerId)!
  p.status = 'resting'
  p.restRemaining = restCount
  return { nextState: state, sideEffects: [] }
}

export function decrementRests(state: MatchState): void {
  for (const p of state.players) {
    if (p.status !== 'resting') continue
    p.restRemaining = Math.max(0, p.restRemaining - 1)
    if (p.restRemaining === 0) p.status = 'active'
  }
}

export function statusReason(status: string, restRemaining: number): string {
  if (status === 'winner') return '勝ち抜け済み'
  if (status === 'eliminated') return '失格'
  if (status === 'resting') return `休み中 (あと${restRemaining}問)`
  if (status === 'withdrawn') return '棄権'
  return `状態: ${status}`
}

export function breakChainForOthers(state: MatchState, exceptId: string): void {
  for (const p of state.players) {
    if (p.id !== exceptId && p.status === 'active' && p.hasChain) {
      p.hasChain = false
      p.chainCount = 0
    }
  }
}
