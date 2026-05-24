'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils/cn'
import type { MatchState, PlayerState } from '@/lib/engine/types'
import { Eye, Wifi, WifiOff } from 'lucide-react'
import { RuleRegistry } from '@/lib/engine/rules'

export default function StaffPage() {
  const { token } = useParams<{ token: string }>()
  const supabase = createClient()
  const [state, setState] = useState<MatchState | null>(null)
  const [matchId, setMatchId] = useState<string | null>(null)
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return

    supabase
      .from('matches')
      .select('id, game_state')
      .eq('staff_token', token)
      .single()
      .then(({ data, error: err }) => {
        if (err || !data) { setError('無効なトークンです'); return }
        setMatchId(data.id)
        setState(data.game_state as MatchState)
      })
  }, [token])

  useEffect(() => {
    if (!matchId) return

    const channel = supabase
      .channel(`staff:${matchId}`)
      .on('broadcast', { event: 'STATE_UPDATE' }, ({ payload }) => {
        setState(payload.state as MatchState)
      })
      .subscribe(status => {
        setConnected(status === 'SUBSCRIBED')
      })

    return () => { supabase.removeChannel(channel) }
  }, [matchId])

  if (error) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="text-red-400 text-lg">{error}</div>
    </div>
  )

  if (!state) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="text-zinc-400">読み込み中...</div>
    </div>
  )

  const active = state.players.filter(p => p.status === 'active')
  const others = state.players.filter(p => p.status !== 'active')

  return (
    <div className="min-h-screen bg-zinc-950 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Eye size={18} className="text-blue-400" />
          <span className="font-bold text-white">{state.matchName}</span>
          <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded">{RuleRegistry.find(state.ruleId)?.name ?? state.ruleId}</span>
          <span className="text-xs text-zinc-400">Q{state.questionNumber}</span>
        </div>
        <div className={cn('flex items-center gap-1.5 text-xs px-2 py-1 rounded',
          connected ? 'text-emerald-400 bg-emerald-900/30' : 'text-red-400 bg-red-900/30')}>
          {connected ? <Wifi size={12} /> : <WifiOff size={12} />}
          {connected ? 'LIVE' : '切断'}
        </div>
      </div>

      <div className="grid gap-2">
        {active.map(p => <PlayerRow key={p.id} player={p} />)}
      </div>

      {others.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs text-zinc-500 px-1">退場・勝抜け</div>
          <div className="grid gap-1.5 opacity-50">
            {others.map(p => <PlayerRow key={p.id} player={p} compact />)}
          </div>
        </div>
      )}
    </div>
  )
}

function PlayerRow({ player, compact }: { player: PlayerState; compact?: boolean }) {
  const statusColor = {
    active: 'bg-zinc-800',
    winner: 'bg-emerald-900/40 border-emerald-700',
    eliminated: 'bg-red-900/20 border-red-900',
    resting: 'bg-yellow-900/20 border-yellow-800',
    withdrawn: 'bg-zinc-900',
  }[player.status] ?? 'bg-zinc-800'

  return (
    <div className={cn(
      'flex items-center justify-between px-4 rounded-xl border border-zinc-800 transition-colors',
      compact ? 'py-1.5' : 'py-3',
      statusColor
    )}>
      <div className="flex items-center gap-3">
        <span className="text-zinc-500 text-sm w-5 text-right">{player.position}</span>
        <span className={cn('font-bold', compact ? 'text-sm text-zinc-300' : 'text-white')}>
          {player.name}
        </span>
        {player.status === 'resting' && (
          <span className="text-xs text-yellow-400 bg-yellow-900/30 px-1.5 py-0.5 rounded">
            休 {player.restRemaining}
          </span>
        )}
      </div>
      <div className="flex items-center gap-4 text-sm">
        <span className="text-emerald-400 font-bold">{player.correct}○</span>
        <span className="text-red-400 font-bold">{player.wrong}✕</span>
        {player.points !== 0 && (
          <span className="text-blue-400 font-bold">{player.points}pt</span>
        )}
      </div>
    </div>
  )
}
