'use client'

import { useEffect, useState, useRef } from 'react'
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
  const [flash, setFlash] = useState<{ id: string; type: 'correct' | 'wrong' } | null>(null)
  const prevState = useRef<MatchState | null>(null)

  useEffect(() => {
    supabase.from('matches').select('id, game_state').eq('obs_token', token).single()
      .then(({ data }) => {
        if (!data) return
        setMatchId(data.id)
        setState(data.game_state as MatchState)
        prevState.current = data.game_state as MatchState
      })
  }, [token])

  useEffect(() => {
    if (!matchId) return
    const ch = supabase.channel(`match:${matchId}`)
      .on('broadcast', { event: 'STATE_UPDATE' }, ({ payload }) => {
        const next = payload.state as MatchState
        if (prevState.current) {
          for (const p of next.players) {
            const prev = prevState.current.players.find(x => x.id === p.id)
            if (prev && p.lastAnswered !== prev.lastAnswered && p.lastAnswered) {
              setFlash({ id: p.id, type: p.lastAnswered as 'correct' | 'wrong' })
              setTimeout(() => setFlash(null), 1200)
            }
          }
        }
        prevState.current = next
        setState(next)
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [matchId])

  if (!state) return <div className="min-h-screen bg-transparent" />

  const rule = RuleRegistry.find(state.ruleId)
  const active = state.players.filter(p => p.status === 'active')
  const others = state.players.filter(p => p.status !== 'active')

  const cols = active.length <= 4 ? 4 : active.length <= 8 ? 4 : 6

  return (
    <div className="min-h-screen bg-transparent p-3 space-y-2">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-white font-bold text-base drop-shadow-lg">{state.matchName}</span>
        <div className="flex items-center gap-3">
          {state.questionNumber > 0 && (
            <span className="text-[#4a90e2] font-black text-2xl drop-shadow-lg tabular-nums">
              Q{state.questionNumber}
            </span>
          )}
        </div>
      </div>

      {/* 問題文 */}
      {state.questionText && (
        <div className="bg-black/60 backdrop-blur rounded-lg px-4 py-2 text-sm text-white leading-relaxed">
          {state.questionText.split('/').map((part, i, arr) => (
            <span key={i}>
              {part}
              {i < arr.length - 1 && <span className="text-[#4a90e2] font-black mx-1">/</span>}
            </span>
          ))}
        </div>
      )}

      {/* プレイヤーカード */}
      <div className={cn('grid gap-2', `grid-cols-${cols}`)}>
        {active.map(p => (
          <ObsCard
            key={p.id}
            player={p}
            rule={rule}
            params={state.ruleParams}
            flash={flash?.id === p.id ? flash.type : null}
          />
        ))}
      </div>

      {/* 勝ち抜け・脱落 */}
      {others.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {others.map(p => (
            <span key={p.id} className={cn(
              'text-xs px-2 py-0.5 rounded bg-black/60 backdrop-blur',
              p.status === 'winner'   ? 'text-emerald-400' :
              p.status === 'eliminated' ? 'text-red-400 line-through' :
              p.status === 'resting'  ? 'text-yellow-400' : 'text-zinc-500'
            )}>
              {p.name}{p.status === 'resting' && p.restRemaining > 0 ? ` 休${p.restRemaining}` : ''}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function ObsCard({ player, rule, params, flash }: {
  player: PlayerState
  rule: ReturnType<typeof RuleRegistry.find>
  params: Record<string, number | string | boolean>
  flash: 'correct' | 'wrong' | null
}) {
  const display = rule?.getScoreDisplay(player, params)
  const towerPct = display?.towerMax && display.towerMax > 0
    ? Math.min((display.towerValue ?? 0) / display.towerMax * 100, 100) : 0

  return (
    <div className={cn(
      'rounded-xl overflow-hidden border backdrop-blur-sm transition-all duration-200',
      'bg-[#111e36]/85 border-[#1e3a6a]/80',
      flash === 'correct' && 'border-emerald-400 shadow-lg shadow-emerald-500/40 scale-105',
      flash === 'wrong'   && 'border-red-500 shadow-lg shadow-red-500/30',
    )}>
      {/* 名前（縦書き） */}
      <div
        className="flex items-center justify-center py-3 px-2 min-h-[80px]"
        style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>
        <span className="text-white font-bold text-sm leading-tight">{player.name}</span>
        {player.nickname && (
          <span className="text-[#7090c0] text-xs ml-1">{player.nickname}</span>
        )}
      </div>

      {/* タワー + スコア */}
      <div className="relative h-16 overflow-hidden">
        <div className="absolute inset-0 bg-[#1a3060]" />
        <div
          className={cn(
            'absolute bottom-0 inset-x-0 transition-all duration-700',
            flash === 'correct' ? 'bg-emerald-500' : 'bg-[#2d5a9e]'
          )}
          style={{ height: `${towerPct}%` }}
        />
        <div className="relative z-10 flex items-center justify-center h-full">
          <span className={cn(
            'font-black text-3xl tabular-nums',
            flash === 'correct' ? 'text-emerald-300' :
            flash === 'wrong'   ? 'text-red-300' : 'text-[#4a90e2]'
          )}>
            {display?.primary}
          </span>
        </div>

        {/* 正解フラッシュオーバーレイ */}
        {flash === 'correct' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-2xl">⭕</span>
          </div>
        )}
        {flash === 'wrong' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-2xl">❌</span>
          </div>
        )}
      </div>

      {/* ○✕カウント */}
      {(player.correct > 0 || player.wrong > 0) && (
        <div className="bg-black/30 px-2 py-1 text-center text-xs flex justify-center gap-2">
          {player.correct > 0 && <span className="text-emerald-400">{player.correct}○</span>}
          {player.wrong > 0 && <span className="text-red-400">{player.wrong}✕</span>}
        </div>
      )}
    </div>
  )
}
