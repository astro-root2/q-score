// @ts-nocheck
'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { RuleRegistry } from '@/lib/engine/rules'
import type { MatchState } from '@/lib/engine/types'
import { PlayerCard } from './components/PlayerCard'
import { CompletedScreen } from './components/CompletedScreen'
import type { MatchMeta, RankColorTier } from './types'
import { DEFAULT_RANK_TIERS } from './types'
import { splitQuestionText } from '@/lib/utils/questionText'

export default function ScreenPage() {
  const { token } = useParams<{ token: string }>()
  const supabase  = createClient()
  const [state, setState]     = useState<MatchState | null>(null)
  const [meta, setMeta]       = useState<MatchMeta | null>(null)
  const [tiers, setTiers]     = useState<RankColorTier[]>(DEFAULT_RANK_TIERS)
  const [accent, setAccent]   = useState('#00e5ff')
  const [matchId, setMatchId] = useState<string | null>(null)
  const [flash, setFlash]     = useState<{ id: string; type: 'correct' | 'wrong' } | null>(null)
  const prevState = useRef<MatchState | null>(null)

  useEffect(() => {
    if (!token) return
    ;(async () => {
      const { data: match } = await (supabase as any)
        .from('matches')
        .select('id, name, game_state, rounds(name, rule_id, tournament_id, tournaments(name, theme_color, settings))')
        .eq('display_token', token).single()
      if (!match) return

      const round      = (match as any).rounds ?? {}
      const tournament = round.tournaments ?? {}
      const rule       = RuleRegistry.find(round.rule_id ?? '')
      const settings   = tournament.settings ?? {}

      let totalQuestions: number | null = null
      if (round.tournament_id) {
        const { count } = await (supabase as any)
          .from('questions').select('id', { count: 'exact', head: true })
          .eq('tournament_id', round.tournament_id)
        totalQuestions = count
      }

      setMatchId(match.id)
      setState(match.game_state as MatchState)
      prevState.current = match.game_state as MatchState
      setAccent(tournament.theme_color ?? '#00e5ff')
      if (Array.isArray(settings.rankColorTiers) && settings.rankColorTiers.length > 0) {
        setTiers(settings.rankColorTiers)
      }
      setMeta({
        matchName:      (match.game_state as MatchState)?.matchName ?? match.name ?? '',
        tournamentName: tournament.name ?? '',
        roundName:      round.name ?? '',
        ruleName:       rule?.name ?? round.rule_id ?? '',
        totalQuestions,
      })
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
              setTimeout(() => setFlash(null), 1400)
            }
          }
        }
        prevState.current = next
        setState(next)
      }).subscribe()
    return () => { (supabase as any).removeChannel(ch) }
  }, [matchId])

  if (!state) return (
    <div style={{ ...ROOT, alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: accent, opacity: 0.4, letterSpacing: '0.5em', fontSize: 14 }}>LOADING...</span>
    </div>
  )

  if (state.status === 'completed') return <CompletedScreen state={state} meta={meta} />

  const rule       = RuleRegistry.find(state.ruleId)
  const active     = state.players.filter(p => p.status === 'active')
  const winners    = state.players.filter(p => p.status === 'winner')
  const eliminated = state.players.filter(p => p.status === 'eliminated')
  const resting    = state.players.filter(p => p.status === 'resting')
  const qParts     = state.questionText ? splitQuestionText(state.questionText) : null
  const ruleSummary = rule?.getRuleSummary(state.ruleParams) ?? meta?.ruleName ?? ''

  return (
    <div style={ROOT}>
      {flash && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50, pointerEvents: 'none',
          background: flash.type === 'correct' ? 'rgba(0,255,136,0.06)' : 'rgba(255,34,68,0.06)',
        }} />
      )}

      {/* ヘッダー */}
      <div style={HDR}>
        {/* 左: 問題・答え */}
        <div style={{ flex: 1, minWidth: 0, padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 15, color: '#f1f5f9', lineHeight: 1.6, letterSpacing: '0.02em' }}>
            {qParts
              ? qParts.map((part, i) => (
                  <span key={i}>
                    {part}
                    {i < qParts.length - 1 && (
                      <span style={{ color: accent, margin: '0 4px', fontWeight: 900 }}>/</span>
                    )}
                  </span>
                ))
              : <span style={{ color: '#333' }}>ここに問題が表示されます。</span>
            }
          </div>
          <div style={{ fontSize: 17, color: '#f59e0b', fontWeight: 700, lineHeight: 1.3, minHeight: 24 }}>
            ここに答えが表示されます。
          </div>
        </div>

        {/* 右: ラウンド・ルール・人数 */}
        <div style={{
          padding: '12px 20px',
          display: 'flex', flexDirection: 'column',
          alignItems: 'flex-end', justifyContent: 'space-between',
          gap: 6, flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {state.questionNumber > 0 && (
              <span style={{ color: '#fff', fontWeight: 900, fontSize: 15 }}>
                Q{state.questionNumber}
              </span>
            )}
            {meta?.roundName && (
              <span style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>
                {meta.roundName}
              </span>
            )}
            {ruleSummary && (
              <span style={{ color: accent, fontWeight: 900, fontSize: 15 }}>
                {ruleSummary}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#fff', fontWeight: 900, fontSize: 28, fontVariantNumeric: 'tabular-nums' }}>
              {state.players.length}
            </span>
            <span style={{ color: accent, fontWeight: 900, fontSize: 20 }}>›››</span>
            <span style={{ color: '#fff', fontWeight: 900, fontSize: 28, fontVariantNumeric: 'tabular-nums' }}>
              {active.length + winners.length}
            </span>
          </div>
          {state.status === 'paused' && (
            <span style={{ color: '#fbbf24', fontSize: 11, fontWeight: 700 }}>⏸ PAUSE</span>
          )}
        </div>
      </div>

      {/* 勝ち抜け帯 */}
      {winners.length > 0 && (
        <div style={{
          display: 'flex', gap: 8, flexWrap: 'wrap',
          padding: '4px 16px',
          background: 'rgba(16,185,129,0.08)',
          borderBottom: '1px solid rgba(16,185,129,0.2)',
          flexShrink: 0,
        }}>
          {winners.map(p => (
            <span key={p.id} style={{ color: '#10b981', fontSize: 12, fontWeight: 700 }}>
              🏆 {p.name}
            </span>
          ))}
        </div>
      )}

      {/* プレイヤーグリッド */}
      <div style={{ flex: 1, minHeight: 0, padding: '6px 6px 0' }}>
        <div style={{
          height: '100%',
          display: 'grid',
          gap: 5,
          gridTemplateColumns: `repeat(${active.length}, minmax(0, 1fr))`,
        }}>
          {active.map(p => (
            <PlayerCard
              key={p.id}
              player={p}
              rule={rule}
              params={state.ruleParams}
              flash={flash?.id === p.id ? flash.type : null}
              tiers={tiers}
            />
          ))}
        </div>
      </div>

      {/* 脱落・休み */}
      {(eliminated.length > 0 || resting.length > 0) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, padding: '4px 16px', flexShrink: 0 }}>
          {eliminated.map(p => (
            <span key={p.id} style={{ fontSize: 11, color: '#2a2a2a', textDecoration: 'line-through' }}>
              {p.name}
            </span>
          ))}
          {resting.map(p => (
            <span key={p.id} style={{ fontSize: 11, color: '#92400e', border: '1px solid rgba(245,158,11,0.25)', padding: '1px 6px' }}>
              {p.name} 休{p.restRemaining}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

const ROOT: React.CSSProperties = {
  minHeight: '100vh',
  background: '#080808',
  color: '#f1f5f9',
  display: 'flex',
  flexDirection: 'column',
  fontFamily: "'Hiragino Kaku Gothic ProN','Hiragino Sans','Meiryo',system-ui,sans-serif",
  userSelect: 'none',
  overflow: 'hidden',
}

const HDR: React.CSSProperties = {
  display: 'flex',
  alignItems: 'stretch',
  borderBottom: '2px solid #1a1a1a',
  flexShrink: 0,
  background: '#0a0a0a',
  minHeight: 90,
}
