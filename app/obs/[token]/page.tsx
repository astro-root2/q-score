'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { RuleRegistry } from '@/lib/engine/rules'
import type { MatchState, PlayerState } from '@/lib/engine/types'
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

  if (!state) return <div className="min-h-screen bg-transparent" />

  const rule = RuleRegistry.find(state.ruleId)
  const active = state.players.filter(p => p.status === 'active')
  const others = state.players.filter(p => p.status !== 'active')

  return (
    <div className="min-h-screen bg-transparent p-3 space-y-2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-white font-bold text-base drop-shadow-lg">{state.matchName}</span>
        {state.questionNumber > 0 && (
          <span className="text-[#4a90e2] font-black text-2xl drop-shadow-lg">Q{state.questionNumber}</span>
        )}
      </div>
      {state.questionText && (
        <div className="bg-black/60 backdrop-blur rounded-lg px-4 py-2 text-sm text-white">
          {state.questionText}
        </div>
      )}
      <div className={cn('grid gap-2',
        active.length <= 4 ? 'grid-cols-4' : active.length <= 8 ? 'grid-cols-4' : 'grid-cols-6')}>
        {active.map(p => <ObsCard key={p.id} player={p} rule={rule} params={state.ruleParams} />)}
      </div>
      {others.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {others.map(p => (
            <span key={p.id} className={cn('text-xs px-2 py-0.5 rounded bg-black/60 backdrop-blur',
              p.status === 'winner' ? 'text-emerald-400' :
              p.status === 'eliminated' ? 'text-red-400 line-through' : 'text-yellow-400')}>
              {p.name}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function ObsCard({ player, rule, params }: {
  player: PlayerState
  rule: ReturnType<typeof RuleRegistry.find>
  params: Record<string, number | string | boolean>
}) {
  const display = rule?.getScoreDisplay(player, params)
  const towerPct = display?.towerMax && display.towerMax > 0
    ? Math.min((display.towerValue ?? 0) / display.towerMax * 100, 100) : 0
  const isCorrect = player.lastAnswered === 'correct'
  const isWrong = player.lastAnswered === 'wrong'

  return (
    <div className={cn(
      'rounded-xl overflow-hidden border backdrop-blur-sm transition-all duration-300',
      'bg-[#111e36]/85 border-[#1e3a6a]/80',
      isCorrect && 'border-emerald-400 scale-105',
      isWrong && 'border-red-500',
    )}>
      <div className="flex items-center justify-center py-3 px-2 min-h-[80px]"
        style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>
        <span className="text-white font-bold text-sm leading-tight">{player.name}</span>
        {player.nickname && <span className="text-[#7090c0] text-xs ml-1">{player.nickname}</span>}
      </div>
      <div className="relative h-16 overflow-hidden">
        <div className="absolute inset-0 bg-[#1a3060]" />
        <div className="absolute bottom-0 inset-x-0 bg-[#2d5a9e] transition-all duration-700"
          style={{ height: `${towerPct}%` }} />
        <div className="relative z-10 flex items-center justify-center h-full">
          <span className={cn('font-black text-3xl', isCorrect ? 'text-emerald-300' : isWrong ? 'text-red-300' : 'text-[#4a90e2]')}>
            {display?.primary?.replace(/[○✕pt]/g, '')}
          </span>
        </div>
      </div>
      <div className="bg-black/30 px-2 py-1 text-center text-xs text-[#4a6fa5]">
        {display?.secondary}
      </div>
    </div>
  )
}
