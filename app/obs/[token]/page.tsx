// @ts-nocheck
'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { RuleRegistry } from '@/lib/engine/rules'
import type { MatchState, PlayerState } from '@/lib/engine/types'
import { buildThemeVars, DEFAULT_ACCENT } from '@/lib/utils/theme'
import { splitQuestionText } from '@/lib/utils/questionText'

export default function ObsPage() {
  const { token } = useParams<{ token: string }>()
  const supabase  = createClient()
  const [state, setState]     = useState<MatchState | null>(null)
  const [matchId, setMatchId] = useState<string | null>(null)
  const [accent, setAccent]   = useState(DEFAULT_ACCENT)
  const [flash, setFlash]     = useState<{ id: string; type: 'correct' | 'wrong' } | null>(null)
  const prevState = useRef<MatchState | null>(null)

  useEffect(() => {
    if (!token) return
    ;(async () => {
      const { data: match } = await (supabase as any)
        .from('matches')
        .select('id, game_state, rounds(tournament_id, tournaments(theme_color))')
        .eq('obs_token', token).single()
      if (!match) return
      const round      = (match as any).rounds ?? {}
      const tournament = round.tournaments ?? {}
      setMatchId(match.id)
      setState(match.game_state as MatchState)
      prevState.current = match.game_state as MatchState
      setAccent(tournament.theme_color ?? DEFAULT_ACCENT)
    })()
  }, [token])

  useEffect(() => {
    if (!matchId) return
    const ch = (supabase as any).channel(`match:${matchId}`)
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
      }).subscribe()
    return () => { (supabase as any).removeChannel(ch) }
  }, [matchId])

  if (!state) return <div style={{ background: 'transparent', minHeight: '100vh' }} />

  const themeVars  = buildThemeVars(accent)
  const rule       = RuleRegistry.find(state.ruleId)
  const active     = state.players.filter(p => p.status === 'active')
  const winners    = state.players.filter(p => p.status === 'winner')
  const eliminated = state.players.filter(p => p.status === 'eliminated')
  const resting    = state.players.filter(p => p.status === 'resting')
  const qParts     = state.questionText ? splitQuestionText(state.questionText) : null

  return (
    <div style={{ ...obsRoot, ...themeVars }}>

      {/* ヘッダー */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '5px 14px',
        background: 'rgba(5,8,20,0.88)',
        border: '1px solid var(--accent-border)',
        boxShadow: '0 0 12px var(--accent-glow)',
        position: 'relative',
        clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
      }}>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, background: 'var(--accent)' }} />
        <span style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 13, paddingLeft: 8 }}>
          {state.matchName}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {state.status === 'paused' && (
            <span style={{ color: '#fbbf24', fontSize: 10, fontWeight: 700 }}>⏸ PAUSE</span>
          )}
          {state.questionNumber > 0 && (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
              <span style={{ color: 'var(--accent)', fontSize: 10, fontWeight: 700 }}>Q</span>
              <span style={{ color: '#f1f5f9', fontWeight: 900, fontSize: 20, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                {state.questionNumber}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 問題文 */}
      {qParts && (
        <div style={{
          padding: '5px 12px',
          background: 'rgba(5,8,20,0.8)',
          border: '1px solid rgba(255,255,255,0.06)',
          fontSize: 11, color: '#94a3b8', lineHeight: 1.5,
        }}>
          {qParts.map((part, i) => (
            <span key={i}>
              {part}
              {i < qParts.length - 1 && (
                <span style={{ color: 'var(--accent)', fontWeight: 900, margin: '0 3px', textShadow: '0 0 6px var(--accent)' }}>/</span>
              )}
            </span>
          ))}
        </div>
      )}

      {/* 勝ち抜け */}
      {winners.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', padding: '4px 8px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }}>
          {winners.map(p => (
            <span key={p.id} style={{ color: '#10b981', fontSize: 10, fontWeight: 700 }}>🏆 {p.name}</span>
          ))}
        </div>
      )}

      {/* プレイヤーグリッド */}
      <div style={{
        display: 'grid', gap: 5,
        gridTemplateColumns: `repeat(${active.length}, minmax(0, 1fr))`,
      }}>
        {active.map(p => (
          <ObsCard key={p.id} player={p} rule={rule} params={state.ruleParams}
            flash={flash?.id === p.id ? flash.type : null} />
        ))}
      </div>

      {/* 脱落・休み */}
      {(eliminated.length > 0 || resting.length > 0) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {eliminated.map(p => (
            <span key={p.id} style={{ fontSize: 9, color: '#1e293b', textDecoration: 'line-through', padding: '1px 6px', border: '1px solid #1e293b' }}>{p.name}</span>
          ))}
          {resting.map(p => (
            <span key={p.id} style={{ fontSize: 9, color: '#92400e', padding: '1px 6px', border: '1px solid rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.08)' }}>
              {p.name} 休{p.restRemaining}
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
  const display  = rule?.getScoreDisplay(player, params)
  const towerPct = display?.towerMax && display.towerMax > 0
    ? Math.min((display.towerValue ?? 0) / display.towerMax * 100, 100) : 0

  const isCorrect = flash === 'correct'
  const isWrong   = flash === 'wrong'
  const borderColor = isCorrect ? '#10b981' : isWrong ? '#ef4444' : 'var(--accent-border)'
  const glowColor   = isCorrect ? 'rgba(16,185,129,0.35)' : isWrong ? 'rgba(239,68,68,0.25)' : 'var(--accent-glow)'
  const scoreColor  = isCorrect ? '#10b981' : isWrong ? '#ef4444' : 'var(--accent)'

  return (
    <div style={{
      position: 'relative',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      background: 'rgba(5,8,20,0.9)',
      border: `1px solid ${borderColor}`,
      clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))',
      boxShadow: `0 0 12px ${glowColor}`,
      transform: flash ? 'scale(1.05)' : 'scale(1)',
      transition: 'all 0.2s ease',
      overflow: 'hidden',
    }}>
      {/* タワーバー */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, width: '100%', height: `${towerPct}%`,
        background: `linear-gradient(to top, ${borderColor}30, transparent)`,
        transition: 'height 0.5s cubic-bezier(0.34,1.56,0.64,1)',
        zIndex: 0,
      }} />

      {/* スキャンライン */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px)',
      }} />

      {/* 縦書き名前 */}
      <div style={{
        position: 'relative', zIndex: 2,
        display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
        gap: 1, height: 80, width: '100%', padding: '6px 4px',
      }}>
        {player.affiliation && (
          <div style={{ writingMode: 'vertical-rl', textOrientation: 'upright', color: 'var(--accent)', fontSize: 8, opacity: 0.7, letterSpacing: 1 }}>
            {player.affiliation}
          </div>
        )}
        <div style={{
          writingMode: 'vertical-rl', textOrientation: 'upright',
          color: flash ? '#fff' : '#e2e8f0', fontSize: 13, fontWeight: 700, letterSpacing: 2,
          textShadow: flash ? `0 0 8px ${scoreColor}` : 'none', transition: 'all 0.2s',
        }}>{player.name}</div>
      </div>

      {/* スコア */}
      <div style={{
        position: 'relative', zIndex: 2,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
        padding: '2px 6px 8px', width: '100%',
      }}>
        <div style={{
          fontSize: 34, fontWeight: 900, color: scoreColor, lineHeight: 1,
          textShadow: `0 0 16px ${glowColor}`, fontVariantNumeric: 'tabular-nums', transition: 'color 0.2s',
        }}>
          {display?.primary ?? '0'}
        </div>
        {display?.detail && <div style={{ color: '#f59e0b', fontSize: 9 }}>{display.detail}</div>}
        {(player.correct > 0 || player.wrong > 0) && (
          <div style={{ display: 'flex', gap: 5, fontSize: 9 }}>
            {player.correct > 0 && <span style={{ color: '#10b981', fontWeight: 700 }}>{player.correct}○</span>}
            {player.wrong > 0 && <span style={{ color: '#ef4444', fontWeight: 700 }}>{'×'.repeat(Math.min(player.wrong, 4))}{player.wrong > 4 ? `(${player.wrong})` : ''}</span>}
          </div>
        )}
      </div>

      {/* フラッシュ */}
      {flash && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, opacity: 0.8, pointerEvents: 'none' }}>
          {flash === 'correct' ? '⭕' : '❌'}
        </div>
      )}
    </div>
  )
}

const obsRoot: React.CSSProperties = {
  background: 'transparent',
  padding: '10px',
  display: 'flex', flexDirection: 'column', gap: 6,
  fontFamily: "'Hiragino Kaku Gothic ProN','Hiragino Sans','Meiryo',sans-serif",
  userSelect: 'none',
}
