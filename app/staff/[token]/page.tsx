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
      .from('matches').select('id, game_state').eq('staff_token', token).single()
      .then(({ data, error: err }) => {
        if (err || !data) { setError('無効なトークンです'); return }
        setMatchId(data.id)
        setState(data.game_state as MatchState)
      })
  }, [token])

  useEffect(() => {
    if (!matchId) return
    const channel = supabase
      .channel(`match:${matchId}`)
      .on('broadcast', { event: 'STATE_UPDATE' }, ({ payload }) => {
        setState(payload.state as MatchState)
      })
      .subscribe(status => setConnected(status === 'SUBSCRIBED'))
    return () => { supabase.removeChannel(channel) }
  }, [matchId])

  if (error) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="text-red-400">{error}</div>
    </div>
  )
  if (!state) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="text-zinc-400">読み込み中...</div>
    </div>
  )

  const rule = RuleRegistry.find(state.ruleId)
  const active     = state.players.filter(p => p.status === 'active')
  const winners    = state.players.filter(p => p.status === 'winner')
  const eliminated = state.players.filter(p => p.status === 'eliminated')
  const resting    = state.players.filter(p => p.status === 'resting')

  const statusLabel = { pending: '待機中', active: '進行中', paused: '一時停止', completed: '終了' }[state.status] ?? state.status
  const statusColor = {
    pending: 'text-zinc-400', active: 'text-emerald-400',
    paused: 'text-yellow-400', completed: 'text-blue-400',
  }[state.status] ?? 'text-zinc-400'

  return (
    <div className="min-h-screen bg-zinc-950 p-4 space-y-3 max-w-2xl mx-auto">
      {/* ヘッダー */}
      <div className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Eye size={15} className="text-blue-400 shrink-0" />
          <span className="font-bold text-white">{state.matchName}</span>
          <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">{rule?.name ?? state.ruleId}</span>
          <span className={cn('text-xs font-semibold', statusColor)}>{statusLabel}</span>
          {state.questionNumber > 0 && (
            <span className="text-zinc-300 text-sm font-bold">Q{state.questionNumber}</span>
          )}
        </div>
        <div className={cn('flex items-center gap-1 text-xs px-2 py-1 rounded-full shrink-0',
          connected ? 'text-emerald-400 bg-emerald-900/30' : 'text-red-400 bg-red-900/30')}>
          {connected ? <Wifi size={11} /> : <WifiOff size={11} />}
          {connected ? 'LIVE' : '切断'}
        </div>
      </div>

      {/* 問題文 */}
      {state.questionText && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-200">
          {state.questionText.split('/').map((part, i, arr) => (
            <span key={i}>
              {part}
              {i < arr.length - 1 && <span className="text-blue-400 font-bold mx-1">/</span>}
            </span>
          ))}
        </div>
      )}

      {/* アクティブプレイヤー */}
      <div className="space-y-1.5">
        {active.map(p => (
          <PlayerRow key={p.id} player={p} rule={rule} params={state.ruleParams} />
        ))}
      </div>

      {/* 勝ち抜け */}
      {winners.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs text-zinc-600 px-1">勝ち抜け</div>
          {winners.map(p => (
            <PlayerRow key={p.id} player={p} rule={rule} params={state.ruleParams} dim />
          ))}
        </div>
      )}

      {/* 休み */}
      {resting.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs text-zinc-600 px-1">休み</div>
          {resting.map(p => (
            <PlayerRow key={p.id} player={p} rule={rule} params={state.ruleParams} dim />
          ))}
        </div>
      )}

      {/* 脱落 */}
      {eliminated.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs text-zinc-600 px-1">脱落</div>
          {eliminated.map(p => (
            <PlayerRow key={p.id} player={p} rule={rule} params={state.ruleParams} dim />
          ))}
        </div>
      )}
    </div>
  )
}

function PlayerRow({ player, rule, params, dim }: {
  player: PlayerState
  rule: ReturnType<typeof RuleRegistry.find>
  params: Record<string, number | string | boolean>
  dim?: boolean
}) {
  const display = rule?.getScoreDisplay(player, params)

  const statusBg = {
    active:     'bg-zinc-900 border-zinc-800',
    winner:     'bg-emerald-950/40 border-emerald-800/50',
    eliminated: 'bg-zinc-950 border-zinc-900',
    resting:    'bg-yellow-950/20 border-yellow-900/40',
    withdrawn:  'bg-zinc-950 border-zinc-900',
  }[player.status] ?? 'bg-zinc-900 border-zinc-800'

  return (
    <div className={cn(
      'flex items-center justify-between px-4 py-2.5 rounded-xl border transition-colors',
      statusBg,
      dim && 'opacity-50'
    )}>
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-zinc-600 text-xs w-4 text-right shrink-0">{player.position}</span>
        <div className="min-w-0">
          <div className={cn('font-bold truncate', dim ? 'text-zinc-400' : 'text-white')}>{player.name}</div>
          {player.affiliation && <div className="text-zinc-600 text-xs truncate">{player.affiliation}</div>}
        </div>
        {player.status === 'resting' && player.restRemaining > 0 && (
          <span className="text-xs text-yellow-400 bg-yellow-900/30 px-1.5 py-0.5 rounded shrink-0">休{player.restRemaining}</span>
        )}
      </div>
      <div className="flex items-center gap-3 shrink-0 text-sm">
        <span className="text-emerald-400 font-bold tabular-nums">{player.correct}○</span>
        <span className="text-red-400 font-bold tabular-nums">{player.wrong}✕</span>
        {display?.primary && (
          <span className="text-blue-300 font-black text-base tabular-nums min-w-[2rem] text-right">{display.primary}</span>
        )}
        {display?.detail && (
          <span className="text-yellow-400 text-xs">{display.detail}</span>
        )}
      </div>
    </div>
  )
}
