import type { MatchState, PlayerState } from '../types'

export function cloneState(state: MatchState): MatchState {
  return {
    ...state,
    ruleParams: { ...state.ruleParams },
    players: state.players.map(p => ({ ...p, extra: { ...p.extra } })),
    updatedAt: new Date().toISOString(),
  }
}

export function setPlayerStatus(
  state: MatchState,
  playerId: string,
  status: PlayerState['status']
): MatchState {
  const next = cloneState(state)
  const p = next.players.find(pl => pl.id === playerId)
  if (p) p.status = status
  return next
}

export function updatePlayer(
  state: MatchState,
  playerId: string,
  updater: (p: PlayerState) => void
): MatchState {
  const next = cloneState(state)
  const p = next.players.find(pl => pl.id === playerId)
  if (p) updater(p)
  return next
}

export function activeCount(state: MatchState): number {
  return state.players.filter(p => p.status === 'active').length
}

export function winnerCount(state: MatchState): number {
  return state.players.filter(p => p.status === 'winner').length
}
