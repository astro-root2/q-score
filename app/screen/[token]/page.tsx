'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { RuleRegistry } from '@/lib/engine/rules'
import type { MatchState, PlayerState } from '@/lib/engine/types'
import { cn } from '@/lib/utils/cn'

export default function ScreenPage() {
  const { token } = useParams<{ token: string }>()
  const supabase = createClient()
  const [state, setState] = useState<MatchState | null>(null)
  const [matchId, setMatchId] = useState<string | null>(null)
  const [flash, setFlash] = useState<{ id: string; type: 'correct' | 'wrong' } | null>(null)
  const prevState = useRef<MatchState | null>(null)

  useEffect(() => {
    supabase.from('matches').select('id, game_state').eq('display_token', token).single()
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
        // フラッシュ検出
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

  if (!state) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-zinc-600 text-xl tracking-widest animate-pulse">WAITING...</div>
    </div>
  )

  const rule = RuleRegistry.find(state.ruleId)
  const active = state.players.filter(p => p.status === 'active')
  const winners = state.players.filter(p => p.status === 'winner')
  const eliminated = state.players.filter(p => p.status === 'eliminated')
  const resting = state.players.filter(p => p.status === 'resting')

  const cols = active.length <= 3 ? 3 : active.length <= 4 ? 4 : active.length <= 6 ? 6 : active.length <= 8 ? 8 : active.length <= 10 ? 5 : 6

  return (
    <div className="min-h-screen bg-black text-white flex flex-col select-none overflow-hidden" style={{ fontFamily: "'Hiragino Sans', 'Yu Gothic', sans-serif" }}>

      {/* フラッシュオーバーレイ */}
      {flash && (
        <div className={cn(
          'fixed inset-0 pointer-events-none z-50 transition-opacity',
          flash.type === 'correct' ? 'bg-emerald-400/10' : 'bg-red-500/10'
        )} />
      )}

      {/* ヘッダー */}
      <header className="flex items-center justify-between px-8 py-3 border-b border-zinc-900">
        <div className="flex items-center gap-6">
          <span className="text-zinc-300 font-bold text-lg tracking-wide">{state.matchName}</span>
          <span className="text-zinc-600 text-sm bg-zinc-900 px-3 py-1 rounded-full">{rule?.name}</span>
        </div>
        <div className="flex items-center gap-6">
          {state.questionNumber > 0 && (
            <div className="flex items-baseline gap-1">
              <span className="text-zinc-600 text-sm">Q</span>
              <span className="text-white text-4xl font-black tabular-nums">{state.questionNumber}</span>
            </div>
          )}
        </div>
      </header>

      {/* 問題文 */}
      {state.questionText && (
        <div className="px-8 py-3 bg-zinc-950 border-b border-zinc-900">
          <QuestionDisplay text={state.questionText} />
        </div>
      )}

      {/* 勝ち抜け */}
      {winners.length > 0 && (
        <div className="flex gap-3 px-8 py-2 bg-emerald-950/40 border-b border-emerald-900/50 flex-wrap">
          {winners.map(p => (
            <div key={p.id} className="flex items-center gap-2 bg-emerald-900/50 border border-emerald-500/50 rounded-full px-4 py-1">
              <span className="text-emerald-300 font-bold text-sm">✓ {p.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* プレイヤーグリッド */}
      <div className="flex-1 p-6 flex items-center">
        <div className="w-full grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {active.map(p => (
            <PlayerCard
              key={p.id}
              player={p}
              rule={rule}
              params={state.ruleParams}
              flash={flash?.id === p.id ? flash.type : null}
            />
          ))}
        </div>
      </div>

      {/* 退場・休み */}
      {(eliminated.length > 0 || resting.length > 0) && (
        <div className="flex flex-wrap gap-2 px-8 py-3 border-t border-zinc-900">
          {eliminated.map(p => (
            <span key={p.id} className="text-xs text-zinc-700 line-through px-2 py-0.5 bg-zinc-950 rounded">{p.name}</span>
          ))}
          {resting.map(p => (
            <span key={p.id} className="text-xs text-yellow-600 px-2 py-0.5 bg-yellow-950/30 rounded">{p.name} 休{p.restRemaining}</span>
          ))}
        </div>
      )}
    </div>
  )
}

function QuestionDisplay({ text }: { text: string }) {
  const parts = text.split('/')
  return (
    <p className="text-zinc-200 text-base leading-relaxed">
      {parts.map((part, i) => (
        <span key={i}>
          {part}
          {i < parts.length - 1 && <span className="text-blue-400 font-black mx-1 text-lg">/</span>}
        </span>
      ))}
    </p>
  )
}

function PlayerCard({ player, rule, params, flash }: {
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
      'relative flex flex-col rounded-2xl overflow-hidden transition-all duration-300 border',
      'bg-zinc-950 border-zinc-800',
      flash === 'correct' && 'border-emerald-400 shadow-2xl shadow-emerald-400/30 scale-105 z-10',
      flash === 'wrong' && 'border-red-500 shadow-2xl shadow-red-500/20',
      !flash && 'hover:border-zinc-700',
    )}>

      {/* 名前エリア */}
      <div className="px-3 pt-4 pb-2 text-center min-h-[80px] flex flex-col items-center justify-center gap-1">
        <div className="text-white font-bold text-base leading-tight">{player.name}</div>
        {player.nickname && <div className="text-zinc-500 text-xs">{player.nickname}</div>}
        {player.affiliation && <div className="text-zinc-600 text-xs">{player.affiliation}</div>}
      </div>

      {/* タワー+スコア */}
      <div className="relative h-28 mx-3 mb-3 rounded-xl overflow-hidden bg-zinc-900">
        {/* タワー */}
        <div
          className={cn(
            'absolute bottom-0 inset-x-0 transition-all duration-700 ease-out',
            flash === 'correct' ? 'bg-emerald-500' : 'bg-blue-800'
          )}
          style={{ height: `${towerPct}%` }}
        />
        {/* スコア */}
        <div className="relative z-10 h-full flex flex-col items-center justify-center">
          <span className={cn(
            'font-black tabular-nums leading-none',
            'text-5xl',
            flash === 'correct' ? 'text-emerald-300' : flash === 'wrong' ? 'text-red-300' : 'text-white'
          )}>
            {display?.primary ?? '0'}
          </span>
          {display?.detail && (
            <span className="text-yellow-400 text-xs mt-1">{display.detail}</span>
          )}
        </div>
      </div>

      {/* ○✕ */}
      {(player.correct > 0 || player.wrong > 0) && (
        <div className="flex justify-center gap-3 pb-3 text-xs">
          {player.correct > 0 && <span className="text-emerald-400">{player.correct}○</span>}
          {player.wrong > 0 && <span className="text-red-400">{player.wrong}✕</span>}
        </div>
      )}

      {/* 正解フラッシュ */}
      {flash === 'correct' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-6xl animate-bounce">⭕</span>
        </div>
      )}
      {flash === 'wrong' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-6xl">❌</span>
        </div>
      )}
    </div>
  )
}
