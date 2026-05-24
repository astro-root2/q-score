'use client'

import { useMatchStore } from '@/store/matchStore'
import { useMatchEngine } from './useMatchEngine'
import MatchHeader from './MatchHeader'
import PlayerGrid from './PlayerGrid'
import ActionBar from './ActionBar'
import type { MatchState, GameEvent, EventType } from '@/lib/engine/types'
import { Monitor, Radio } from 'lucide-react'

interface Props {
  matchId: string
  tournamentId: string
  initialState: MatchState
  initialEvents: GameEvent[]
  rule: { id: string; name: string; paramDefs: unknown[] }
}

export default function MatchConsole({ matchId, initialState, initialEvents, rule }: Props) {
  const { dispatch, undo } = useMatchEngine(matchId, initialState, initialEvents)
  const { setSelectedPlayer } = useMatchStore()

  const handleDispatch = (type: EventType, actorId?: string) => {
    dispatch(type, actorId)
    if (type === 'CORRECT' || type === 'WRONG') setSelectedPlayer(null)
  }

  const obsUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/obs/${initialState.matchId}` : ''
  const screenUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/screen/${initialState.matchId}` : ''

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <MatchHeader
        matchName={initialState.matchName}
        ruleName={rule.name}
        onDispatch={(type: EventType) => handleDispatch(type)}
      />

      <div className="flex gap-2 text-xs">
        <a href={obsUrl} target="_blank"
          className="flex items-center gap-1 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-lg transition-colors">
          <Radio size={12} /> OBS配信画面
        </a>
        <a href={screenUrl} target="_blank"
          className="flex items-center gap-1 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-lg transition-colors">
          <Monitor size={12} /> 会場スクリーン
        </a>
      </div>

      <PlayerGrid
        ruleId={rule.id}
        onSelect={(id) => setSelectedPlayer(id)}
      />

      <ActionBar
        onDispatch={handleDispatch}
        onUndo={undo}
      />
    </div>
  )
}
