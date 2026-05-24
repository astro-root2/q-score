import { create } from 'zustand'
import type { MatchState, GameEvent } from '@/lib/engine/types'
import { GameEngine } from '@/lib/engine/GameEngine'

interface PendingOperation {
  id: string
  eventType: string
  playerId?: string
  timestamp: number
}

interface MatchStore {
  matchState: MatchState | null
  events: GameEvent[]
  pendingOps: PendingOperation[]
  selectedPlayerId: string | null
  isConnected: boolean
  lastSyncAt: Date | null
  error: string | null

  initialize: (state: MatchState, events: GameEvent[]) => void
  applyRemoteEvent: (event: GameEvent) => void
  applyRemoteState: (state: MatchState) => void
  setConnected: (connected: boolean) => void
  setSelectedPlayer: (playerId: string | null) => void
  addPendingOp: (op: PendingOperation) => void
  removePendingOp: (id: string) => void
  setError: (error: string | null) => void
  reset: () => void
}

export const useMatchStore = create<MatchStore>((set, get) => ({
  matchState: null,
  events: [],
  pendingOps: [],
  selectedPlayerId: null,
  isConnected: false,
  lastSyncAt: null,
  error: null,

  initialize: (state, events) => {
    set({ matchState: state, events, lastSyncAt: new Date(), error: null })
  },

  applyRemoteEvent: (event) => {
    const { matchState, events } = get()
    if (!matchState) return
    if (events.some(e => e.id === event.id)) return
    const newEvents = [...events, event].sort((a, b) => a.seq - b.seq)
    let newState: MatchState
    if (event.undone) {
      newState = GameEngine.replay(newEvents)
    } else {
      newState = GameEngine.applyEvent(matchState, event)
    }
    set({ matchState: newState, events: newEvents, lastSyncAt: new Date() })
  },

  applyRemoteState: (state) => {
    set({ matchState: state, lastSyncAt: new Date() })
  },

  setConnected: (connected) => set({ isConnected: connected }),
  setSelectedPlayer: (playerId) => set({ selectedPlayerId: playerId }),
  addPendingOp: (op) => set(s => ({ pendingOps: [...s.pendingOps, op] })),
  removePendingOp: (id) => set(s => ({ pendingOps: s.pendingOps.filter(op => op.id !== id) })),
  setError: (error) => set({ error }),
  reset: () => set({
    matchState: null, events: [], pendingOps: [],
    selectedPlayerId: null, isConnected: false, lastSyncAt: null, error: null,
  }),
}))

export const selectActivePlayers = (s: MatchStore) =>
  s.matchState?.players.filter(p => p.status === 'active') ?? []

export const selectPlayer = (id: string) => (s: MatchStore) =>
  s.matchState?.players.find(p => p.id === id) ?? null

export const selectCanUndo = (s: MatchStore) =>
  s.events.some(e => !e.undone &&
    ['CORRECT', 'WRONG', 'PASS', 'QUESTION_NEXT', 'OVERRIDE'].includes(e.eventType)
  )
