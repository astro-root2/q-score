// @ts-nocheck
'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { RuleRegistry } from '@/lib/engine/rules'
import type { MatchState } from '@/lib/engine/types'
import { PlayerCard } from './components/PlayerCard'
import { CompletedScreen } from './components/CompletedScreen'
import { SettingsPanel } from './components/SettingsPanel'
import type { MatchMeta, RankColorTier, ScreenSettings } from './types'
import { DEFAULT_RANK_TIERS, DEFAULT_SCREEN_SETTINGS } from './types'
import { splitQuestionText } from '@/lib/utils/questionText'

const SK = 'qscore_screen_settings_v2'

function loadSettings(): ScreenSettings {
  if (typeof window === 'undefined') return DEFAULT_SCREEN_SETTINGS
  try {
    const s = localStorage.getItem(SK)
    return s ? { ...DEFAULT_SCREEN_SETTINGS, ...JSON.parse(s) } : DEFAULT_SCREEN_SETTINGS
  } catch { return DEFAULT_SCREEN_SETTINGS }
}

export default function ScreenPage() {
  const { token } = useParams()
  const supabase  = createClient()
  const [state, setState]         = useState<MatchState | null>(null)
  const [meta, setMeta]           = useState<MatchMeta | null>(null)
  const [tiers, setTiers]         = useState<RankColorTier[]>(DEFAULT_RANK_TIERS)
  const [accent, setAccent]       = useState('#00e5ff')
  const [matchId, setMatchId]     = useState<string | null>(null)
  const [flash, setFlash]         = useState<{ id: string; type: 'correct'|'wrong' } | null>(null)
  const [settings, setSettings]   = useState<ScreenSettings>(DEFAULT_SCREEN_SETTINGS)
  const [showSettings, setShowSettings] = useState(false)
  const prevState = useRef<MatchState | null>(null)

  useEffect(() => { setSettings(loadSettings()) }, [])

  const saveSettings = useCallback((s: ScreenSettings) => {
    setSettings(s)
    localStorage.setItem(SK, JSON.stringify(s))
  }, [])

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === 's' || e.key === 'S') setShowSettings(v => !v)
      if (e.key === 'Escape') setShowSettings(false)
    }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [])

  useEffect(() => {
    if (!token) return
    ;(async () => {
      const { data: match } = await (supabase as any)
        .from('matches')
        .select('id, name, game_state, rounds(name, rule_id, tournament_id, tournaments(name, theme_color, settings, logo_url))')
        .eq('display_token', token).single()
      if (!match) return
      const round      = match.rounds ?? {}
      const tournament = round.tournaments ?? {}
      const rule       = RuleRegistry.find(round.rule_id ?? '')
      const ts         = tournament.settings ?? {}
      setMatchId(match.id)
      setState(match.game_state)
      prevState.current = match.game_state
      setAccent(tournament.theme_color ?? '#00e5ff')
      if (Array.isArray(ts.rankColorTiers) && ts.rankColorTiers.length > 0) setTiers(ts.rankColorTiers)
      setMeta({
        matchName:      match.game_state?.matchName ?? match.name ?? '',
        tournamentName: tournament.name ?? '',
        roundName:      round.name ?? '',
        ruleName:       rule?.name ?? round.rule_id ?? '',
        ruleSummary:    rule?.getRuleSummary(match.game_state?.ruleParams ?? {}) ?? rule?.name ?? '',
        totalQuestions: null,
        logoUrl:        tournament.logo_url ?? null,
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
              setFlash({ id: p.id, type: p.lastAnswered as 'correct'|'wrong' })
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
    <div style={{ minHeight:'100vh', background:'#050810', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <span style={{ color: accent, opacity:0.35, letterSpacing:'0.6em', fontSize:13 }}>LOADING...</span>
    </div>
  )
  if (state.status === 'completed') return <CompletedScreen state={state} meta={meta} />

  const rule      = RuleRegistry.find(state.ruleId)
  const active    = state.players.filter(p => p.status === 'active')
  const winners   = state.players.filter(p => p.status === 'winner')
  const elim      = state.players.filter(p => p.status === 'eliminated')
  const resting   = state.players.filter(p => p.status === 'resting')
  const qParts    = state.questionText ? splitQuestionText(state.questionText) : null
  const total     = state.players.length
  const remaining = active.length + winners.length
  const s         = settings

  return (
    <div style={{ minHeight:'100vh', background:'#050810', color:'#f1f5f9', display:'flex', flexDirection:'column', fontFamily:"'Hiragino Kaku Gothic ProN','Hiragino Sans','Meiryo',system-ui,sans-serif", userSelect:'none', overflow:'hidden' }}>
      {flash && (
        <div style={{ position:'fixed', inset:0, zIndex:50, pointerEvents:'none', background: flash.type==='correct' ? 'rgba(0,255,136,0.04)' : 'rgba(255,34,68,0.04)' }} />
      )}

      {/* ══ ヘッダー ══ */}
      <div style={{ flexShrink:0, background:'rgba(5,8,16,0.98)', borderBottom:`1px solid ${accent}25`, boxShadow:`0 2px 24px ${accent}10` }}>
        {/* Row 1 */}
        <div style={{ display:'flex', alignItems:'center', gap:12, padding:'8px 16px 4px', minHeight:44 }}>
          {/* 左: Round名 */}
          {s.showRoundName && meta?.roundName && (
            <span style={{ color:'#64748b', fontSize:12, fontWeight:600, letterSpacing:'0.08em', whiteSpace:'nowrap' }}>
              {meta.roundName}
            </span>
          )}
          {/* ルール名（大） */}
          {s.showRuleName && meta?.ruleSummary && (
            <span style={{ color:'#f1f5f9', fontSize:'clamp(15px,2vw,24px)', fontWeight:900, letterSpacing:'0.04em', lineHeight:1 }}>
              {meta.ruleSummary}
            </span>
          )}
          <div style={{ flex:1 }} />
          {/* Q番号 */}
          {s.showQNumber && state.questionNumber > 0 && (
            <div style={{ display:'flex', alignItems:'baseline', gap:2 }}>
              <span style={{ color: accent, fontSize:11, fontWeight:900, letterSpacing:'0.1em' }}>Q.</span>
              <span style={{ color:'#f1f5f9', fontSize:'clamp(20px,2.5vw,32px)', fontWeight:900, fontVariantNumeric:'tabular-nums', lineHeight:1, textShadow:`0 0 12px ${accent}60` }}>
                {state.questionNumber}
              </span>
            </div>
          )}
          {/* 人数 */}
          {s.showPlayerCount && (
            <div style={{ display:'flex', alignItems:'center', gap:5 }}>
              <span style={{ color:'#94a3b8', fontWeight:700, fontSize:'clamp(14px,1.6vw,20px)', fontVariantNumeric:'tabular-nums' }}>{total}</span>
              <span style={{ color: accent, fontWeight:900, fontSize:'clamp(12px,1.4vw,18px)', letterSpacing:'-2px' }}>›››</span>
              <span style={{ color:'#f1f5f9', fontWeight:900, fontSize:'clamp(16px,2vw,26px)', fontVariantNumeric:'tabular-nums', textShadow:`0 0 10px ${accent}50` }}>{remaining}</span>
            </div>
          )}
          {/* ロゴ */}
          {s.showLogo && meta?.logoUrl && (
            <img src={meta.logoUrl} alt="" style={{ height:36, objectFit:'contain', opacity:0.9 }} />
          )}
        </div>
        {/* Row 2 */}
        {(s.showGroupName || s.showTournamentName) && (
          <div style={{ display:'flex', alignItems:'center', padding:'0 16px 6px', gap:8 }}>
            {s.showGroupName && meta?.matchName && (
              <span style={{ color: accent, fontSize:11, fontWeight:700, letterSpacing:'0.12em' }}>{meta.matchName}</span>
            )}
            <div style={{ flex:1 }} />
            {s.showTournamentName && meta?.tournamentName && (
              <span style={{ color:'#334155', fontSize:11, fontWeight:600 }}>{meta.tournamentName}</span>
            )}
          </div>
        )}
      </div>

      {/* ══ Q&Aエリア ══ */}
      {s.showQAArea && (
        <div style={{ flexShrink:0, background:'rgba(0,0,0,0.5)', borderBottom:`1px solid #111827`, padding:'8px 18px', display:'flex', flexDirection:'column', gap:4 }}>
          {/* 問題 */}
          <div style={{ fontSize:'clamp(13px,1.5vw,18px)', color: qParts && s.showQuestion ? '#f1f5f9' : '#1e293b', lineHeight:1.6, letterSpacing:'0.03em', minHeight:22 }}>
            {qParts && s.showQuestion
              ? qParts.map((part, i) => (
                  <span key={i}>
                    {part}
                    {i < qParts.length - 1 && <span style={{ color: accent, margin:'0 5px', fontWeight:900 }}>/</span>}
                  </span>
                ))
              : s.questionPlaceholder
            }
          </div>
          {/* 解答 */}
          <div style={{ fontSize:'clamp(13px,1.6vw,20px)', fontWeight:700, color: state.answerText && s.showAnswer ? '#f59e0b' : '#1e293b', lineHeight:1.3, minHeight:20 }}>
            {state.answerText && s.showAnswer ? state.answerText : s.answerPlaceholder}
          </div>
        </div>
      )}

      {/* ══ 勝ち抜け ══ */}
      {winners.length > 0 && (
        <div style={{ flexShrink:0, display:'flex', gap:8, flexWrap:'wrap', padding:'4px 16px', background:'rgba(16,185,129,0.07)', borderBottom:'1px solid rgba(16,185,129,0.15)' }}>
          {winners.map(p => <span key={p.id} style={{ color:'#10b981', fontSize:12, fontWeight:700 }}>🏆 {p.name}</span>)}
        </div>
      )}

      {/* ══ プレイヤーカード ══ */}
      <div style={{ flex:1, minHeight:0, padding:'6px 6px 0' }}>
        <div style={{ height:'100%', display:'grid', gap:5, gridTemplateColumns:`repeat(${active.length}, minmax(0, 1fr))` }}>
          {active.map(p => (
            <PlayerCard key={p.id} player={p} rule={rule} params={state.ruleParams}
              flash={flash?.id === p.id ? flash.type : null} tiers={tiers} />
          ))}
        </div>
      </div>

      {/* ══ 脱落・休み ══ */}
      {(elim.length > 0 || resting.length > 0) && (
        <div style={{ flexShrink:0, display:'flex', flexWrap:'wrap', gap:5, padding:'4px 16px 6px' }}>
          {elim.map(p => <span key={p.id} style={{ fontSize:11, color:'#1e293b', textDecoration:'line-through' }}>{p.name}</span>)}
          {resting.map(p => <span key={p.id} style={{ fontSize:11, color:'#78350f', border:'1px solid rgba(245,158,11,0.2)', padding:'1px 6px', background:'rgba(245,158,11,0.05)' }}>{p.name} 休{p.restRemaining}</span>)}
        </div>
      )}

      {/* ══ 設定 ══ */}
      {showSettings && <SettingsPanel settings={settings} onChange={saveSettings} onClose={() => setShowSettings(false)} />}
      <button onClick={() => setShowSettings(v => !v)}
        style={{ position:'fixed', bottom:10, right:10, zIndex:40, width:28, height:28, borderRadius:'50%', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.2)', cursor:'pointer', fontSize:13, lineHeight:'28px', textAlign:'center', transition:'all 0.2s', padding:0 }}
        title="設定 (S)">⚙</button>
    </div>
  )
}
