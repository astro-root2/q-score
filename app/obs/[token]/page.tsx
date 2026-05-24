'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { RuleRegistry } from '@/lib/engine/rules'
import type { MatchState } from '@/lib/engine/types'
import { cn } from '@/lib/utils/cn'

export default function ObsPage() {
  const { token } = useParams<{ token: string }>()
  const supabase = createClient()
  const [state, setState] = useState<MatchState | null>(null)
  const [matchId, setMatchId] = useState<string | null>(null)

  useEffect(() => {
    supabase.from('matches').select('id, game_state').eq('obs_token', token).single()
      .then(({ data }) => {
        if (!data) return
        setMatchId(data.id)
        setState(data.game_state as MatchState)
      })
  }, [token])

  useEffect(() => {
    if (!matchId) return
    const ch = supabase.channel(`match:${matchId}`)
      .on('broadcast', { event: 'STATE_UPDATE' }, ({ payload }) => setState(payload.state as MatchState))
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [matchId])

  if (!state) return <div className="min-h-screen bg-transparent flex items-center justify-center"><span className="text-white/50 text-sm">読み込み中...</span></div>

  const rule = RuleRegistry.find(state.ruleId)
  const active = state.players.filter(p => p.status === 'active')
  const others = state.players.filter(p => p.status !== 'active')

  return (
    <div className="min-h-screen bg-black/80 p-4 space-y-2">
      <div className="flex items-center justify-between mb-3">
        <span className="text-white font-bold text-lg drop-shadow">{state.matchName}</span>
        {state.questionNumber > 0 && (
          <span className="text-zinc-300 text-sm">Q{state.questionNumber}</span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {active.map(p => {
          const display = rule?.getScoreDisplay(p)
          return (
            <div key={p.id} className={cn(
              'bg-zinc-900/90 border border-zinc-700 rounded-xl px-4 py-3 backdrop-blur',
              p.lastAnswered === 'correct' && 'border-emerald-400 bg-emerald-900/30',
              p.lastAnswered === 'wrong' && 'border-red-500 bg-red-900/20',
            )}>
              <div className="text-white font-semibold text-sm truncate">{p.name}</div>
              <div className="text-3xl font-black text-white">{display?.primary}</div>
              <div className="text-xs text-zinc-400">{display?.secondary}</div>
              {display?.detail && <div className="text-xs text-yellow-300">{display.detail}</div>}
            </div>
          )
        })}
      </div>
      {others.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {others.map(p => (
            <div key={p.id} className={cn('text-xs px-2 py-1 rounded bg-zinc-800/70 text-zinc-400',
              p.status === 'winner' && 'text-emerald-400',
              p.status === 'eliminated' && 'text-red-400 line-through',
            )}>
              {p.name} {p.status === 'winner' ? '✓' : ''}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
