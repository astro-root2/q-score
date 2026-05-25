'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { RuleRegistry } from '@/lib/engine/rules'
import type { MatchState, PlayerState } from '@/lib/engine/types'
import { splitQuestionText } from '@/lib/utils/questionText'

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

  if (!state) return <div style={{ background: 'transparent', minHeight: '100vh' }} />

  const rule = RuleRegistry.find(state.ruleId)
  const active     = state.players.filter(p => p.status === 'active')
  const winners    = state.players.filter(p => p.status === 'winner')
  const eliminated = state.players.filter(p => p.status === 'eliminated')
  const resting    = state.players.filter(p => p.status === 'resting')

  return (
    <div style={{
      background: 'transparent',
      padding: '12px',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      fontFamily: "'Hiragino Kaku Gothic ProN', 'Hiragino Sans', 'Meiryo', sans-serif",
      userSelect: 'none',
    }}>

      {/* ヘッダー: 試合名 + Q番号 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 14px',
        background: 'rgba(15,23,42,0.82)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 8,
        backdropFilter: 'blur(12px)',
      }}>
        <span style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 13, letterSpacing: '0.05em' }}>
          {state.matchName}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {state.status === 'paused' && (
            <span style={{ color: '#fbbf24', fontSize: 11, fontWeight: 600 }}>⏸ 停止中</span>
          )}
          {state.questionNumber > 0 && (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
              <span style={{ color: '#64748b', fontSize: 11 }}>Q</span>
              <span style={{ color: '#60a5fa', fontWeight: 900, fontSize: 22, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                {state.questionNumber}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 問題文 */}
      {state.questionText && (
        <div style={{
          padding: '6px 14px',
          background: 'rgba(15,23,42,0.75)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 8,
          backdropFilter: 'blur(12px)',
          fontSize: 12,
          color: '#cbd5e1',
          lineHeight: 1.5,
        }}>
          {splitQuestionText(state.questionText).map((part, i, arr) => (
            <span key={i}>
              {part}
              {i < arr.length - 1 && (
                <span style={{ color: '#60a5fa', fontWeight: 900, margin: '0 4px' }}>/</span>
              )}
            </span>
          ))}
        </div>
      )}

      {/* 勝ち抜け帯 */}
      {winners.length > 0 && (
        <div style={{
          display: 'flex', gap: 6, flexWrap: 'wrap',
          padding: '5px 10px',
          background: 'rgba(16,185,129,0.1)',
          border: '1px solid rgba(16,185,129,0.25)',
          borderRadius: 8,
        }}>
          {winners.map(p => (
            <span key={p.id} style={{ color: '#6ee7b7', fontSize: 11, fontWeight: 700 }}>
              🏆 {p.name}
            </span>
          ))}
        </div>
      )}

      {/* プレイヤーカード（横一列） */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${active.length}, minmax(0, 1fr))`,
        gap: 6,
      }}>
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

      {/* 脱落・休み */}
      {(eliminated.length > 0 || resting.length > 0) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {eliminated.map(p => (
            <span key={p.id} style={{
              fontSize: 10, color: '#334155',
              textDecoration: 'line-through',
              background: 'rgba(15,23,42,0.7)',
              padding: '2px 6px', borderRadius: 4,
            }}>{p.name}</span>
          ))}
          {resting.map(p => (
            <span key={p.id} style={{
              fontSize: 10, color: '#92400e',
              background: 'rgba(245,158,11,0.12)',
              border: '1px solid rgba(245,158,11,0.2)',
              padding: '2px 6px', borderRadius: 4,
            }}>{p.name} 休{p.restRemaining}</span>
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

  const borderColor = flash === 'correct'
    ? 'rgba(16,185,129,0.9)'
    : flash === 'wrong'
      ? 'rgba(239,68,68,0.7)'
      : 'rgba(255,255,255,0.08)'

  const glow = flash === 'correct'
    ? '0 0 20px rgba(16,185,129,0.4)'
    : flash === 'wrong'
      ? '0 0 16px rgba(239,68,68,0.3)'
      : 'none'

  const scoreColor = flash === 'correct' ? '#10b981'
    : flash === 'wrong' ? '#ef4444'
    : '#3b82f6'

  const towerColor = flash === 'correct'
    ? 'rgba(16,185,129,0.5)'
    : 'rgba(59,130,246,0.4)'

  return (
    <div style={{
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      background: 'rgba(15,23,42,0.82)',
      border: `1px solid ${borderColor}`,
      borderRadius: 10,
      overflow: 'hidden',
      backdropFilter: 'blur(12px)',
      boxShadow: glow,
      transform: flash ? 'scale(1.05)' : 'scale(1)',
      transition: 'all 0.2s ease',
    }}>

      {/* タワーバー */}
      <div style={{
        position: 'absolute',
        bottom: 0, left: 0,
        width: '100%',
        height: `${towerPct}%`,
        background: `linear-gradient(to top, ${towerColor}, transparent)`,
        transition: 'height 0.5s cubic-bezier(0.34,1.56,0.64,1)',
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      {/* 縦書き名前 */}
      <div style={{
        position: 'relative', zIndex: 1,
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 1,
        height: 90,
        width: '100%',
        padding: '8px 4px',
      }}>
        {player.affiliation && (
          <div style={{
            writingMode: 'vertical-rl',
            textOrientation: 'upright',
            color: '#06b6d4',
            fontSize: 9,
            opacity: 0.8,
            letterSpacing: 1,
          }}>{player.affiliation}</div>
        )}
        <div style={{
          writingMode: 'vertical-rl',
          textOrientation: 'upright',
          color: flash ? '#f1f5f9' : '#cbd5e1',
          fontSize: 14,
          fontWeight: 700,
          letterSpacing: 2,
          transition: 'color 0.2s',
        }}>{player.name}</div>
      </div>

      {/* スコア */}
      <div style={{
        position: 'relative', zIndex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        padding: '4px 6px 8px',
        width: '100%',
      }}>
        <div style={{
          fontSize: 32,
          fontWeight: 900,
          color: scoreColor,
          lineHeight: 1,
          textShadow: flash === 'correct' ? '0 0 16px rgba(16,185,129,0.6)' : '0 0 12px rgba(59,130,246,0.4)',
          fontVariantNumeric: 'tabular-nums',
          transition: 'color 0.2s',
        }}>
          {display?.primary ?? '0'}
        </div>

        {display?.detail && (
          <div style={{ color: '#f59e0b', fontSize: 9, fontWeight: 600 }}>{display.detail}</div>
        )}

        {(player.correct > 0 || player.wrong > 0) && (
          <div style={{ display: 'flex', gap: 6, fontSize: 10 }}>
            {player.correct > 0 && <span style={{ color: '#10b981', fontWeight: 700 }}>{player.correct}○</span>}
            {player.wrong > 0 && (
              <span style={{ color: '#ef4444', fontWeight: 700 }}>
                {'×'.repeat(Math.min(player.wrong, 4))}{player.wrong > 4 ? `(${player.wrong})` : ''}
              </span>
            )}
          </div>
        )}
      </div>

      {/* フラッシュアイコン */}
      {flash && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 2,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 28, opacity: 0.75, pointerEvents: 'none',
        }}>
          {flash === 'correct' ? '⭕' : '❌'}
        </div>
      )}
    </div>
  )
}
