'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { RuleRegistry } from '@/lib/engine/rules'
import type { MatchState } from '@/lib/engine/types'
import { PlayerCard } from './components/PlayerCard'
import { CompletedScreen } from './components/CompletedScreen'
import type { MatchMeta } from './types'
import { buildThemeVars, DEFAULT_ACCENT } from '@/lib/utils/theme'
import { splitQuestionText } from '@/lib/utils/questionText'

export default function ScreenPage() {
  const { token } = useParams<{ token: string }>()
  const supabase  = createClient()
  const [state, setState]     = useState<MatchState | null>(null)
  const [meta, setMeta]       = useState<MatchMeta | null>(null)
  const [accent, setAccent]   = useState(DEFAULT_ACCENT)
  const [matchId, setMatchId] = useState<string | null>(null)
  const [flash, setFlash]     = useState<{ id: string; type: 'correct' | 'wrong' } | null>(null)
  const prevState = useRef<MatchState | null>(null)

  useEffect(() => {
    if (!token) return
    ;(async () => {
      const { data: match } = await supabase
        .from('matches')
        .select('id, name, game_state, rounds(name, rule_id, tournament_id, tournaments(name, theme_color))')
        .eq('display_token', token).single()
      if (!match) return

      const round = (match as any).rounds ?? {}
      const tournament = round.tournaments ?? {}
      const rule  = RuleRegistry.find(round.rule_id ?? '')

      let totalQuestions: number | null = null
      if (round.tournament_id) {
        const { count } = await supabase
          .from('questions').select('id', { count: 'exact', head: true })
          .eq('tournament_id', round.tournament_id)
        totalQuestions = count
      }

      setMatchId(match.id)
      setState(match.game_state as MatchState)
      prevState.current = match.game_state as MatchState
      setAccent(tournament.theme_color ?? DEFAULT_ACCENT)
      setMeta({
        matchName: (match.game_state as MatchState)?.matchName ?? match.name ?? '',
        tournamentName: tournament.name ?? '',
        roundName: round.name ?? '',
        ruleName: rule?.name ?? round.rule_id ?? '',
        totalQuestions,
      })
    })()
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
      }).subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [matchId])

  const themeVars = buildThemeVars(accent)

  if (!state) return (
    <div style={{ ...rootStyle, ...themeVars }}>
      <div style={{ color: 'var(--accent)', fontSize: 18, letterSpacing: '0.5em', opacity: 0.5 }}>LOADING...</div>
    </div>
  )

  if (state.status === 'completed') return <CompletedScreen state={state} meta={meta} />

  const rule      = RuleRegistry.find(state.ruleId)
  const active    = state.players.filter(p => p.status === 'active')
  const winners   = state.players.filter(p => p.status === 'winner')
  const eliminated = state.players.filter(p => p.status === 'eliminated')
  const resting   = state.players.filter(p => p.status === 'resting')
  const qParts    = state.questionText ? splitQuestionText(state.questionText) : null

  return (
    <div style={{ ...rootStyle, ...themeVars }}>

      {/* グローバルフラッシュ */}
      {flash && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50, pointerEvents: 'none',
          background: flash.type === 'correct' ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)',
        }} />
      )}

      {/* ─── ヘッダー ─── */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 12,
        padding: '10px 20px',
        background: 'rgba(5,8,20,0.95)',
        borderBottom: '1px solid var(--accent-border)',
        boxShadow: '0 2px 20px var(--accent-glow)',
        flexShrink: 0,
        position: 'relative',
      }}>
        {/* 左装飾ライン */}
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: 'var(--accent)', boxShadow: '0 0 10px var(--accent)' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, paddingLeft: 12 }}>
          {meta?.tournamentName && (
            <div style={{ color: 'var(--accent)', fontSize: 11, letterSpacing: '0.2em', opacity: 0.8, textTransform: 'uppercase' }}>
              {meta.tournamentName}
            </div>
          )}
          <div style={{ color: '#f1f5f9', fontWeight: 900, fontSize: 20, letterSpacing: '0.05em', textShadow: '0 0 20px rgba(255,255,255,0.3)' }}>
            {meta?.matchName ?? state.matchName}
          </div>
          {meta?.roundName && (
            <div style={{ color: '#475569', fontSize: 12, letterSpacing: '0.1em' }}>{meta.roundName}</div>
          )}
          {meta?.ruleName && (
            <div style={{
              color: 'var(--accent)', fontSize: 10, fontWeight: 700,
              border: '1px solid var(--accent-border)',
              padding: '2px 8px', letterSpacing: '0.1em',
              clipPath: 'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)',
              background: 'var(--accent-dim)',
            }}>{meta.ruleName}</div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {state.status === 'paused' && (
            <div style={{ color: '#fbbf24', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', animation: 'pulse 1s infinite' }}>
              ⏸ PAUSE
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {state.questionNumber > 0 && (
              <div style={{
                display: 'flex', alignItems: 'baseline', gap: 3,
                background: 'var(--accent-dim)', border: '1px solid var(--accent-border)',
                padding: '4px 12px',
                clipPath: 'polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)',
              }}>
                <span style={{ color: 'var(--accent)', fontSize: 11, fontWeight: 700 }}>Q</span>
                <span style={{ color: '#f1f5f9', fontSize: 26, fontWeight: 900, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                  {state.questionNumber}
                </span>
                {meta?.totalQuestions && (
                  <span style={{ color: '#475569', fontSize: 11 }}>/ {meta.totalQuestions}</span>
                )}
              </div>
            )}
            <div style={{
              display: 'flex', alignItems: 'baseline', gap: 3,
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
              padding: '4px 12px',
              clipPath: 'polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)',
            }}>
              <span style={{ color: '#475569', fontSize: 11 }}>残</span>
              <span style={{ color: '#94a3b8', fontSize: 18, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{active.length}</span>
              <span style={{ color: '#334155', fontSize: 11 }}>/ {state.players.length}</span>
            </div>
          </div>
        </div>
      </header>

      {/* 問題文 - 常時表示 */}
      <div style={{
        padding: '8px 24px',
        background: 'rgba(5,8,20,0.8)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        flexShrink: 0, minHeight: 40,
        display: 'flex', alignItems: 'center',
      }}>
        {qParts ? (
          <p style={{ margin: 0, color: '#cbd5e1', fontSize: 14, lineHeight: 1.6 }}>
            {qParts.map((part, i) => (
              <span key={i}>
                {part}
                {i < qParts.length - 1 && (
                  <span style={{ color: 'var(--accent)', fontWeight: 900, margin: '0 6px', textShadow: '0 0 8px var(--accent)' }}>/</span>
                )}
              </span>
            ))}
          </p>
        ) : (
          <p style={{ margin: 0, color: '#1e293b', fontSize: 13, fontStyle: 'italic' }}>問題文なし</p>
        )}
      </div>

      {/* 勝ち抜け */}
      {winners.length > 0 && (
        <div style={{
          display: 'flex', gap: 8, flexWrap: 'wrap', padding: '6px 20px',
          background: 'rgba(16,185,129,0.05)',
          borderBottom: '1px solid rgba(16,185,129,0.2)',
          flexShrink: 0,
        }}>
          {winners.map(p => (
            <div key={p.id} style={{
              color: '#10b981', fontSize: 12, fontWeight: 700,
              border: '1px solid rgba(16,185,129,0.4)',
              padding: '3px 12px',
              clipPath: 'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)',
              background: 'rgba(16,185,129,0.1)',
            }}>🏆 {p.name}</div>
          ))}
        </div>
      )}

      {/* プレイヤーグリッド */}
      <div style={{ flex: 1, minHeight: 0, padding: '12px 16px' }}>
        <div style={{
          height: '100%', display: 'grid', gap: 8,
          gridTemplateColumns: `repeat(${active.length}, minmax(0, 1fr))`,
        }}>
          {active.map(p => (
            <PlayerCard key={p.id} player={p} rule={rule} params={state.ruleParams}
              flash={flash?.id === p.id ? flash.type : null} />
          ))}
        </div>
      </div>

      {/* フッター */}
      {(eliminated.length > 0 || resting.length > 0) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, padding: '8px 20px', flexShrink: 0 }}>
          {eliminated.map(p => (
            <span key={p.id} style={{ fontSize: 11, color: '#1e293b', textDecoration: 'line-through', padding: '1px 8px', border: '1px solid #1e293b' }}>
              {p.name}
            </span>
          ))}
          {resting.map(p => (
            <span key={p.id} style={{ fontSize: 11, color: '#92400e', padding: '1px 8px', border: '1px solid rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.08)' }}>
              {p.name} 休{p.restRemaining}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

const rootStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: '#050814',
  backgroundImage: `
    linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)
  `,
  backgroundSize: '40px 40px',
  color: '#f1f5f9',
  display: 'flex',
  flexDirection: 'column',
  fontFamily: "'Hiragino Kaku Gothic ProN','Hiragino Sans','Meiryo',system-ui,sans-serif",
  userSelect: 'none',
  overflow: 'hidden',
}
