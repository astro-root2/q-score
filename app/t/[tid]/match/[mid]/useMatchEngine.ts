'use client'

import { useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useMatchStore } from '@/store/matchStore'
import { GameEngine } from '@/lib/engine/GameEngine'
import type { MatchState, GameEvent, EventType } from '@/lib/engine/types'

export function useMatchEngine(matchId: string, initialState: MatchState, initialEvents: GameEvent[]) {
  const supabase = createClient()
  const store = useMatchStore()
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    store.initialize(initialState, initialEvents)
  }, [])

  useEffect(() => {
    const channel = supabase
      .channel(`match:${matchId}`)
      .on('broadcast', { event: 'EVENT' }, ({ payload }) => {
        store.applyRemoteEvent(payload.event as GameEvent)
      })
      .on('broadcast', { event: 'STATE_UPDATE' }, ({ payload }) => {
        store.applyRemoteState(payload.state as MatchState)
      })
      .subscribe(status => store.setConnected(status === 'SUBSCRIBED'))

    return () => { supabase.removeChannel(channel) }
  }, [matchId])

  const dispatch = useCallback(async (
    eventType: EventType,
    actorId?: string,
    payload: Record<string, unknown> = {}
  ) => {
    const state = useMatchStore.getState().matchState
    if (!state) return

    const validation = GameEngine.validate(state, eventType, actorId)
    if (!validation.valid) {
      store.setError(validation.reason ?? 'Invalid action')
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    const seq = (useMatchStore.getState().events.filter(e => !e.undone).length) + 1

    const event = {
      match_id: matchId,
      seq,
      event_type: eventType,
      actor_id: actorId ?? null,
      operator_id: user?.id ?? null,
      payload,
      undone: false,
    }

    const { data, error } = await supabase.from('game_events').insert(event).select().single()
    if (error) { store.setError(error.message); return }

    const newState = GameEngine.applyEvent(state, {
      ...data,
      eventType: data.event_type as EventType,
      actorId: data.actor_id,
      matchId: data.match_id,
      createdAt: data.created_at,
    })

    await supabase.from('matches').update({ game_state: newState, status: newState.status }).eq('id', matchId)

    await supabase.channel(`match:${matchId}`).send({
      type: 'broadcast', event: 'STATE_UPDATE', payload: { state: newState }
    })

    store.applyRemoteEvent({
      ...data,
      eventType: data.event_type as EventType,
      actorId: data.actor_id,
      matchId: data.match_id,
      createdAt: data.created_at,
    })
    store.setError(null)
  }, [matchId])

  const undo = useCallback(async () => {
    const { events, matchState } = useMatchStore.getState()
    const result = GameEngine.undo(events, matchState)
    if (!result) return

    const lastUndone = events.find(e => !result.newEvents.find(ne => ne.id === e.id && !ne.undone) && !e.undone)
    if (lastUndone) {
      await supabase.from('game_events').update({ undone: true }).eq('id', lastUndone.id)
    }
    await supabase.from('matches').update({ game_state: result.newState }).eq('id', matchId)
    store.initialize(result.newState, result.newEvents)
  }, [matchId])

  return { dispatch, undo }
}
