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
        if (prevState.current) {
          for (const p of next.players) {
            const prev = prevState.current.players.find(x => x.id === p.id)
            if (prev && p.lastAnswered !== prev.lastAnswered && p.lastAnswered) {
              setFlash({ id: p.id, type: p.lastAnswered as 'correct' | 'wrong' })
              setTimeout(() => setFlash(null), 1400)
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
      <div className="text-zinc-600 text-2xl tracking-widest animate-pulse font-thin">WAITING...</div>
    </div>
  )

  if (state.status === 'completed') {
    return <CompletedScreen state={state} />
  }

  const rule = RuleRegistry.find(state.ruleId)
  const active     = state.players.filter(p => p.status === 'active')
  const winners    = state.players.filter(p => p.status === 'winner')
  const eliminated = state.players.filter(p => p.status === 'eliminated')
  const resting    = state.players.filter(p => p.status === 'resting')

  return (
    <div
      className="min-h-screen bg-black text-white flex flex-col select-none overflow-hidden"
      style={{ fontFamily: "'Hiragino Sans', 'Yu Gothic', sans-serif" }}
    >
      {flash && (
        <div className={cn(
          'fixed inset-0 pointer-events-none z-50',
          flash.type === 'correct' ? 'bg-emerald-400/8' : 'bg-red-500/8'
        )} />
      )}

      <header className="flex items-center justify-between px-6 py-3 border-b border-zinc-900 shrink-0">
        <div className="flex items-center gap-4">
          <span className="text-zinc-200 font-bold text-lg tracking-wide">{state.matchName}</span>
          <span className="text-zinc-600 text-xs bg-zinc-900 px-3 py-1 rounded-full">{rule?.name}</span>
          {state.status === 'paused' && (
            <span className="text-yellow-400 text-xs bg-yellow-950/50 px-3 py-1 rounded-full animate-pulse">一時停止中</span>
          )}
        </div>
        {state.questionNumber > 0 && (
          <div className="flex items-baseline gap-1">
            <span className="text-zinc-600 text-sm">Q</span>
            <span className="text-white text-5xl font-black tabular-nums">{state.questionNumber}</span>
          </div>
        )}
      </header>

      {state.questionText && (
        <div className="px-6 py-2.5 bg-zinc-950 border-b border-zinc-900 shrink-0">
          <QuestionDisplay text={state.questionText} />
        </div>
      )}

      {winners.length > 0 && (
        <div className="flex gap-2 px-6 py-2 bg-emerald-950/40 border-b border-emerald-900/40 flex-wrap shrink-0">
          {winners.map(p => (
            <div key={p.id} className="flex items-center gap-2 bg-emerald-900/50 border border-emerald-600/40 rounded-full px-4 py-1">
              <span className="text-emerald-300 font-bold text-sm">✓ {p.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* 横一列グリッド: 人数=列数 */}
      <div className="flex-1 px-4 py-4 min-h-0">
        <div
          className="h-full grid gap-2"
          style={{ gridTemplateColumns: `repeat(${active.length}, minmax(0, 1fr))` }}
        >
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

      {(eliminated.length > 0 || resting.length > 0) && (
        <div className="flex flex-wrap gap-2 px-6 py-2.5 border-t border-zinc-900 shrink-0">
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

function CompletedScreen({ state }: { state: MatchState }) {
  const winners = state.players.filter(p => p.status === 'winner')
  const rule = RuleRegistry.find(state.ruleId)

  const ranked = [...state.players]
    .filter(p => p.status !== 'winner')
    .sort((a, b) => {
      const da = rule?.getScoreDisplay(a, state.ruleParams)
      const db = rule?.getScoreDisplay(b, state.ruleParams)
      return (Number(db?.primary) || 0) - (Number(da?.primary) || 0)
    })

  return (
    <div
      className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-8 select-none"
      style={{ fontFamily: "'Hiragino Sans', 'Yu Gothic', sans-serif" }}
    >
      <div className="text-zinc-600 text-sm tracking-[0.3em] uppercase">Result</div>
      <div className="text-zinc-300 font-bold text-xl">{state.matchName}</div>

      {winners.length > 0 && (
        <div className="flex flex-col items-center gap-4">
          <div className="text-zinc-500 text-xs tracking-widest">WINNER</div>
          <div className="flex flex-wrap gap-4 justify-center">
            {winners.map(p => (
              <div key={p.id} className="flex flex-col items-center gap-2 bg-emerald-900/30 border border-emerald-500/40 rounded-2xl px-8 py-5">
                <span className="text-4xl">🏆</span>
                <span className="text-emerald-300 font-black text-2xl">{p.name}</span>
                {p.affiliation && <span className="text-zinc-500 text-sm">{p.affiliation}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {ranked.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center max-w-2xl">
          {ranked.map((p, i) => (
            <div key={p.id} className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-sm border',
              p.status === 'eliminated'
                ? 'border-zinc-800 text-zinc-600 bg-zinc-950'
                : 'border-zinc-700 text-zinc-400 bg-zinc-900'
            )}>
              <span className="text-zinc-600 text-xs">{i + 1}</span>
              <span className={cn(p.status === 'eliminated' && 'line-through')}>{p.name}</span>
            </div>
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
      'relative flex flex-col rounded-2xl overflow-hidden border transition-all duration-200 h-full',
      'bg-zinc-950 border-zinc-800',
      flash === 'correct' && 'border-emerald-400 shadow-2xl shadow-emerald-400/25 scale-[1.03] z-10',
      flash === 'wrong'   && 'border-red-500/70 shadow-xl shadow-red-500/15',
    )}>
      {/* 名前エリア */}
      <div className="px-2 pt-4 pb-2 text-center flex flex-col items-center justify-center gap-0.5 shrink-0">
        <div className="text-white font-bold text-sm leading-tight break-all">{player.name}</div>
        {player.affiliation && <div className="text-zinc-600 text-xs">{player.affiliation}</div>}
      </div>

      {/* タワー+スコア: 残り高さを全部使う */}
      <div className="relative flex-1 mx-2 mb-3 rounded-xl overflow-hidden bg-zinc-900 min-h-[80px]">
        <div
          className={cn(
            'absolute bottom-0 inset-x-0 transition-all duration-700 ease-out',
            flash === 'correct' ? 'bg-emerald-500' : 'bg-blue-800'
          )}
          style={{ height: `${towerPct}%` }}
        />
        <div className="relative z-10 h-full flex flex-col items-center justify-center gap-1">
          <span className={cn(
            'font-black tabular-nums leading-none text-4xl',
            flash === 'correct' ? 'text-emerald-300' :
            flash === 'wrong'   ? 'text-red-300' : 'text-white'
          )}>
            {display?.primary ?? '0'}
          </span>
          {display?.detail && <span className="text-yellow-400 text-xs">{display.detail}</span>}
          {(player.correct > 0 || player.wrong > 0) && (
            <div className="flex gap-2 text-xs mt-1">
              {player.correct > 0 && <span className="text-emerald-400">{player.correct}○</span>}
              {player.wrong > 0   && <span className="text-red-400">{player.wrong}✕</span>}
            </div>
          )}
        </div>

        {flash === 'correct' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-5xl drop-shadow-lg">⭕</span>
          </div>
        )}
        {flash === 'wrong' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-5xl drop-shadow-lg">❌</span>
          </div>
        )}
      </div>
    </div>
  )
}
