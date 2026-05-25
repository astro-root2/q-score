'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { RuleRegistry } from '@/lib/engine/rules'
import type { MatchState } from '@/lib/engine/types'
import { splitQuestionText } from '@/lib/utils/questionText'
import { PlayerCard } from './components/PlayerCard'
import { CompletedScreen } from './components/CompletedScreen'
import type { MatchMeta } from './types'

const S: Record<string, React.CSSProperties> = {
  root: { minHeight: '100vh', background: '#0f172a', backgroundImage: 'radial-gradient(circle at 50% 10%, #1e293b 0%, #0f172a 100%)', color: '#f1f5f9', display: 'flex', flexDirection: 'column', padding: 16, gap: 12, fontFamily: "'Hiragino Kaku Gothic ProN','Hiragino Sans','Meiryo',sans-serif", userSelect: 'none', overflow: 'hidden' },
  header: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 20px', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, backdropFilter: 'blur(10px)', flexShrink: 0 },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 12 },
  logoBox: { width: 40, height: 40, background: 'linear-gradient(135deg,#3b82f6,#06b6d4)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 18, color: '#fff', flexShrink: 0 },
  headerRight: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  infoPill: { display: 'flex', alignItems: 'baseline', gap: 4, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '4px 10px' },
  infoLabel: { fontSize: 11, color: '#64748b', fontWeight: 700 },
  infoValue: { fontSize: 15, color: '#e2e8f0', fontWeight: 700 },
  qNum: { fontSize: 22, color: '#f1f5f9', fontWeight: 900, fontVariantNumeric: 'tabular-nums' },
  pauseBadge: { fontSize: 12, color: '#fbbf24', background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 6, padding: '4px 10px' },
  questionBar: { padding: '10px 18px', background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, flexShrink: 0 },
  winnersBar: { display: 'flex', flexWrap: 'wrap', gap: 8, padding: '8px 14px', background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10, flexShrink: 0 },
  winnerChip: { display: 'flex', alignItems: 'center', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.35)', borderRadius: 20, padding: '4px 14px', fontSize: 13, fontWeight: 700, color: '#6ee7b7' },
  footer: { display: 'flex', flexWrap: 'wrap', gap: 6, padding: '8px 4px', flexShrink: 0 },
}

export default function ScreenPage() {
  const { token } = useParams<{ token: string }>()
  const supabase  = createClient()
  const [state, setState]   = useState<MatchState | null>(null)
  const [meta, setMeta]     = useState<MatchMeta | null>(null)
  const [matchId, setMatchId] = useState<string | null>(null)
  const [flash, setFlash]   = useState<{ id: string; type: 'correct' | 'wrong' } | null>(null)
  const prevState = useRef<MatchState | null>(null)

  useEffect(() => {
    if (!token) return
    ;(async () => {
      const { data: match } = await supabase
        .from('matches')
        .select('id, name, game_state, rounds(name, rule_id, tournament_id, tournaments(name))')
        .eq('display_token', token).single()
      if (!match) return
      const round = (match as any).rounds ?? {}
      const rule  = RuleRegistry.find(round.rule_id ?? '')
      let totalQuestions: number | null = null
      if (round.tournament_id) {
        const { count } = await supabase.from('questions').select('id', { count: 'exact', head: true }).eq('tournament_id', round.tournament_id)
        totalQuestions = count
      }
      setMatchId(match.id)
      setState(match.game_state as MatchState)
      prevState.current = match.game_state as MatchState
      setMeta({ matchName: (match.game_state as MatchState)?.matchName ?? match.name ?? '', tournamentName: round.tournaments?.name ?? '', roundName: round.name ?? '', ruleName: rule?.name ?? round.rule_id ?? '', totalQuestions })
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

  if (!state) return <div style={S.root}><div style={{ color: '#334155', fontSize: 24, letterSpacing: '0.3em', fontWeight: 300 }}>WAITING...</div></div>
  if (state.status === 'completed') return <CompletedScreen state={state} meta={meta} />

  const rule     = RuleRegistry.find(state.ruleId)
  const active   = state.players.filter(p => p.status === 'active')
  const winners  = state.players.filter(p => p.status === 'winner')
  const eliminated = state.players.filter(p => p.status === 'eliminated')
  const resting  = state.players.filter(p => p.status === 'resting')

  return (
    <div style={S.root}>
      {flash && <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 50, background: flash.type === 'correct' ? 'rgba(16,185,129,0.07)' : 'rgba(239,68,68,0.07)' }} />}

      <header style={S.header}>
        <div style={S.headerLeft}>
          <div style={S.logoBox}>Q</div>
          <div>
            {meta?.tournamentName && <div style={{ fontSize: 11, color: '#94a3b8', letterSpacing: '0.1em' }}>{meta.tournamentName}</div>}
            <div style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9' }}>{meta?.matchName ?? state.matchName}</div>
            {meta?.roundName && <div style={{ fontSize: 12, color: '#64748b' }}>{meta.roundName}</div>}
          </div>
        </div>
        <div style={S.headerRight}>
          {meta?.ruleName && <div style={S.infoPill}><span style={S.infoLabel}>RULE</span><span style={S.infoValue}>{meta.ruleName}</span></div>}
          {state.questionNumber > 0 && (
            <div style={S.infoPill}>
              <span style={S.infoLabel}>Q</span>
              <span style={S.qNum}>{state.questionNumber}</span>
              {meta?.totalQuestions && <span style={S.infoLabel}>/ {meta.totalQuestions}</span>}
            </div>
          )}
          <div style={S.infoPill}><span style={S.infoLabel}>残</span><span style={S.infoValue}>{active.length}</span><span style={S.infoLabel}>/ {state.players.length}</span></div>
          {state.status === 'paused' && <div style={S.pauseBadge}>⏸ 一時停止</div>}
        </div>
      </header>

      {state.questionText && (
        <div style={S.questionBar}>
          {splitQuestionText(state.questionText).map((part, i, arr) => (
            <span key={i}>{part}{i < arr.length - 1 && <span style={{ color: '#60a5fa', fontWeight: 900, margin: '0 6px', fontSize: 18 }}>/</span>}</span>
          ))}
        </div>
      )}

      {winners.length > 0 && (
        <div style={S.winnersBar}>
          {winners.map(p => <div key={p.id} style={S.winnerChip}>🏆 {p.name}</div>)}
        </div>
      )}

      <div style={{ flex: 1, minHeight: 0 }}>
        <div style={{ height: '100%', display: 'grid', gap: 10, gridTemplateColumns: `repeat(${active.length}, minmax(0, 1fr))` }}>
          {active.map(p => <PlayerCard key={p.id} player={p} rule={rule} params={state.ruleParams} flash={flash?.id === p.id ? flash.type : null} />)}
        </div>
      </div>

      {(eliminated.length > 0 || resting.length > 0) && (
        <div style={S.footer}>
          {eliminated.map(p => <span key={p.id} style={{ fontSize: 12, color: '#334155', textDecoration: 'line-through', background: 'rgba(15,23,42,0.8)', padding: '2px 8px', borderRadius: 4 }}>{p.name}</span>)}
          {resting.map(p => <span key={p.id} style={{ fontSize: 12, color: '#92400e', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', padding: '2px 8px', borderRadius: 4 }}>{p.name} 休{p.restRemaining}</span>)}
        </div>
      )}
    </div>
  )
}
