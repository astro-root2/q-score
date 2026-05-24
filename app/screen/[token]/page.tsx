'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { RuleRegistry } from '@/lib/engine/rules'
import type { MatchState } from '@/lib/engine/types'
import { cn } from '@/lib/utils/cn'

export default function ScreenPage() {
  const { token } = useParams<{ token: string }>()
  const supabase = createClient()
  const [state, setState] = useState<MatchState | null>(null)
  const [matchId, setMatchId] = useState<string | null>(null)

  useEffect(() => {
    supabase.from('matches').select('id, game_state').eq('display_token', token).single()
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

  if (!state) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="text-zinc-500">接続待機中...</div>
    </div>
  )

  const rule = RuleRegistry.find(state.ruleId)
  const active = state.players.filter(p => p.status === 'active')
  const winners = state.players.filter(p => p.status === 'winner')

  return (
    <div className="min-h-screen bg-zinc-950 p-6 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black text-white">{state.matchName}</h1>
        <div className="flex items-center gap-4">
          {state.questionNumber > 0 && (
            <span className="text-5xl font-black text-zinc-300">Q{state.questionNumber}</span>
          )}
          <div className={cn('px-4 py-2 rounded-full text-sm font-bold',
            state.status === 'active' ? 'bg-green-500 text-white animate-pulse' :
            state.status === 'paused' ? 'bg-yellow-500 text-black' :
            state.status === 'completed' ? 'bg-blue-500 text-white' : 'bg-zinc-700 text-zinc-300')}>
            {state.status === 'active' ? '進行中' : state.status === 'paused' ? '一時停止' : state.status === 'completed' ? '終了' : '待機中'}
          </div>
        </div>
      </div>

      {winners.length > 0 && (
        <div className="flex gap-3">
          {winners.map(p => (
            <div key={p.id} className="bg-emerald-900/40 border-2 border-emerald-400 rounded-2xl px-6 py-3 flex items-center gap-3">
              <span className="text-2xl">🏆</span>
              <span className="text-2xl font-black text-emerald-300">{p.name}</span>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 flex-1">
        {active.map(p => {
          const display = rule?.getScoreDisplay(p)
          return (
            <div key={p.id} className={cn(
              'rounded-2xl border-2 p-5 transition-all duration-300',
              'bg-zinc-900 border-zinc-700',
              p.lastAnswered === 'correct' && 'border-emerald-400 bg-emerald-900/20 scale-105',
              p.lastAnswered === 'wrong' && 'border-red-500 bg-red-900/10',
            )}>
              <div className="text-zinc-400 text-sm">{p.position}.</div>
              <div className="font-bold text-white text-xl mt-1 truncate">{p.name}</div>
              <div className="text-5xl font-black text-white mt-2">{display?.primary}</div>
              <div className="text-zinc-400 text-sm mt-1">{display?.secondary}</div>
              {display?.detail && <div className="text-yellow-300 text-sm mt-1">{display.detail}</div>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
