'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils/cn'
import type { MatchState, PlayerState } from '@/lib/engine/types'
import { Eye, Wifi, WifiOff } from 'lucide-react'
import { RuleRegistry } from '@/lib/engine/rules'
import { buildThemeVars, DEFAULT_ACCENT } from '@/lib/utils/theme'
import { splitQuestionText } from '@/lib/utils/questionText'

export default function StaffPage() {
  const { token } = useParams<{ token: string }>()
  const supabase  = createClient()
  const [state, setState]     = useState<MatchState | null>(null)
  const [matchId, setMatchId] = useState<string | null>(null)
  const [accent, setAccent]   = useState(DEFAULT_ACCENT)
  const [connected, setConnected] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    ;(async () => {
      const { data: match, error: err } = await supabase
        .from('matches')
        .select('id, game_state, rounds(tournament_id, tournaments(theme_color))')
        .eq('staff_token', token).single()
      if (err || !match) { setError('無効なトークンです'); return }
      const round      = (match as any).rounds ?? {}
      const tournament = round.tournaments ?? {}
      setMatchId(match.id)
      setState(match.game_state as MatchState)
      setAccent(tournament.theme_color ?? DEFAULT_ACCENT)
    })()
  }, [token])

  useEffect(() => {
    if (!matchId) return
    const ch = supabase.channel(`match:${matchId}`)
      .on('broadcast', { event: 'STATE_UPDATE' }, ({ payload }) => {
        setState(payload.state as MatchState)
      })
      .subscribe(status => setConnected(status === 'SUBSCRIBED'))
    return () => { supabase.removeChannel(ch) }
  }, [matchId])

  const themeVars = buildThemeVars(accent)

  if (error) return (
    <div style={{ ...staffRoot, ...themeVars, alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#ef4444' }}>{error}</div>
    </div>
  )
  if (!state) return (
    <div style={{ ...staffRoot, ...themeVars, alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'var(--accent)', opacity: 0.5, letterSpacing: '0.3em', fontSize: 13 }}>LOADING...</div>
    </div>
  )

  const rule       = RuleRegistry.find(state.ruleId)
  const active     = state.players.filter(p => p.status === 'active')
  const winners    = state.players.filter(p => p.status === 'winner')
  const eliminated = state.players.filter(p => p.status === 'eliminated')
  const resting    = state.players.filter(p => p.status === 'resting')
  const qParts     = state.questionText ? splitQuestionText(state.questionText) : null

  const statusLabel = { pending: '待機中', active: '進行中', paused: '一時停止', completed: '終了' }[state.status] ?? state.status
  const statusColor = { pending: '#64748b', active: '#10b981', paused: '#fbbf24', completed: '#60a5fa' }[state.status] ?? '#64748b'

  return (
    <div style={{ ...staffRoot, ...themeVars }}>

      {/* ヘッダー */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 16px',
        background: 'rgba(5,8,20,0.95)',
        border: '1px solid var(--accent-border)',
        boxShadow: '0 0 12px var(--accent-glow)',
        position: 'relative',
        clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
      }}>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: 'var(--accent)', boxShadow: '0 0 8px var(--accent)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 12 }}>
          <Eye size={14} color='var(--accent)' />
          <span style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 15 }}>{state.matchName}</span>
          <span style={{ color: statusColor, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em' }}>{statusLabel}</span>
          {state.questionNumber > 0 && (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
              <span style={{ color: 'var(--accent)', fontSize: 11 }}>Q</span>
              <span style={{ color: '#f1f5f9', fontWeight: 900, fontSize: 18, fontVariantNumeric: 'tabular-nums' }}>{state.questionNumber}</span>
            </div>
          )}
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700,
          color: connected ? '#10b981' : '#ef4444',
          padding: '3px 10px', border: `1px solid ${connected ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
          background: connected ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
        }}>
          {connected ? <Wifi size={11} /> : <WifiOff size={11} />}
          {connected ? 'LIVE' : '切断'}
        </div>
      </div>

      {/* 問題文 */}
      {qParts && (
        <div style={{
          padding: '8px 16px',
          background: 'rgba(5,8,20,0.8)',
          border: '1px solid rgba(255,255,255,0.06)',
          fontSize: 13, color: '#94a3b8', lineHeight: 1.6,
        }}>
          {qParts.map((part, i) => (
            <span key={i}>
              {part}
              {i < qParts.length - 1 && (
                <span style={{ color: 'var(--accent)', fontWeight: 900, margin: '0 5px' }}>/</span>
              )}
            </span>
          ))}
        </div>
      )}

      {/* アクティブ */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {active.map(p => <StaffRow key={p.id} player={p} rule={rule} params={state.ruleParams} />)}
      </div>

      {/* 勝ち抜け */}
      {winners.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ color: '#334155', fontSize: 10, letterSpacing: '0.2em', paddingLeft: 4 }}>WINNER</div>
          {winners.map(p => <StaffRow key={p.id} player={p} rule={rule} params={state.ruleParams} dim />)}
        </div>
      )}

      {/* 休み */}
      {resting.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ color: '#334155', fontSize: 10, letterSpacing: '0.2em', paddingLeft: 4 }}>RESTING</div>
          {resting.map(p => <StaffRow key={p.id} player={p} rule={rule} params={state.ruleParams} dim />)}
        </div>
      )}

      {/* 脱落 */}
      {eliminated.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ color: '#334155', fontSize: 10, letterSpacing: '0.2em', paddingLeft: 4 }}>ELIMINATED</div>
          {eliminated.map(p => <StaffRow key={p.id} player={p} rule={rule} params={state.ruleParams} dim />)}
        </div>
      )}
    </div>
  )
}

function StaffRow({ player, rule, params, dim }: {
  player: PlayerState
  rule: ReturnType<typeof RuleRegistry.find>
  params: Record<string, number | string | boolean>
  dim?: boolean
}) {
  const display = rule?.getScoreDisplay(player, params)
  const statusBorder = {
    active:     'rgba(255,255,255,0.08)',
    winner:     'rgba(16,185,129,0.3)',
    eliminated: 'rgba(255,255,255,0.03)',
    resting:    'rgba(245,158,11,0.2)',
    withdrawn:  'rgba(255,255,255,0.03)',
  }[player.status] ?? 'rgba(255,255,255,0.08)'

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '8px 14px',
      background: 'rgba(5,8,20,0.7)',
      border: `1px solid ${statusBorder}`,
      clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))',
      opacity: dim ? 0.45 : 1,
      transition: 'opacity 0.2s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ color: '#334155', fontSize: 11, width: 18, textAlign: 'right' }}>{player.position}</span>
        <div>
          <div style={{ color: dim ? '#64748b' : '#e2e8f0', fontWeight: 700, fontSize: 14 }}>{player.name}</div>
          {player.affiliation && <div style={{ color: '#334155', fontSize: 11 }}>{player.affiliation}</div>}
        </div>
        {player.status === 'resting' && player.restRemaining > 0 && (
          <span style={{ color: '#fbbf24', fontSize: 10, padding: '1px 6px', border: '1px solid rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.08)' }}>
            休{player.restRemaining}
          </span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13 }}>
        <span style={{ color: '#10b981', fontWeight: 700 }}>{player.correct}○</span>
        <span style={{ color: '#ef4444', fontWeight: 700 }}>{player.wrong}✕</span>
        {display?.primary && (
          <span style={{ color: 'var(--accent)', fontWeight: 900, fontSize: 18, fontVariantNumeric: 'tabular-nums', textShadow: '0 0 10px var(--accent-glow)', minWidth: 32, textAlign: 'right' }}>
            {display.primary}
          </span>
        )}
        {display?.detail && <span style={{ color: '#f59e0b', fontSize: 11 }}>{display.detail}</span>}
      </div>
    </div>
  )
}

const staffRoot: React.CSSProperties = {
  minHeight: '100vh',
  background: '#050814',
  backgroundImage: `linear-gradient(rgba(255,255,255,0.01) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.01) 1px, transparent 1px)`,
  backgroundSize: '40px 40px',
  color: '#f1f5f9',
  display: 'flex', flexDirection: 'column',
  padding: '12px', gap: 8, maxWidth: 640, margin: '0 auto',
  fontFamily: "'Hiragino Kaku Gothic ProN','Hiragino Sans','Meiryo',sans-serif",
  userSelect: 'none',
}
