'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { RuleRegistry } from '@/lib/engine/rules'
import type { MatchState, PlayerState } from '@/lib/engine/types'

/* ─────────────────────────────────────────────
   型定義
───────────────────────────────────────────── */
interface MatchMeta {
  matchName: string
  tournamentName: string
  roundName: string
  ruleName: string
  totalQuestions: number | null
}

/* ─────────────────────────────────────────────
   メインページ
───────────────────────────────────────────── */
export default function ScreenPage() {
  const { token } = useParams<{ token: string }>()
  const supabase = createClient()

  const [state, setState] = useState<MatchState | null>(null)
  const [meta, setMeta] = useState<MatchMeta | null>(null)
  const [matchId, setMatchId] = useState<string | null>(null)
  const [flash, setFlash] = useState<{ id: string; type: 'correct' | 'wrong' } | null>(null)
  const prevState = useRef<MatchState | null>(null)

  useEffect(() => {
    if (!token) return
    ;(async () => {
      const { data: match } = await supabase
        .from('matches')
        .select('id, name, game_state, round_id, rounds(name, rule_id, tournament_id, tournaments(name))')
        .eq('display_token', token)
        .single()

      if (!match) return

      const round = (match as { rounds?: { name?: string; rule_id?: string; tournament_id?: string; tournaments?: { name?: string } } }).rounds ?? {}
      const rule = RuleRegistry.find(round.rule_id ?? '')

      // 問題数を取得
      let totalQuestions: number | null = null
      if (round.tournament_id) {
        const { count } = await supabase
          .from('questions')
          .select('id', { count: 'exact', head: true })
          .eq('tournament_id', round.tournament_id)
        totalQuestions = count
      }

      setMatchId(match.id)
      setState(match.game_state as MatchState)
      prevState.current = match.game_state as MatchState
      setMeta({
        matchName: (match.game_state as MatchState)?.matchName ?? match.name ?? '',
        tournamentName: round.tournaments?.name ?? '',
        roundName: round.name ?? '',
        ruleName: rule?.name ?? round.rule_id ?? '',
        totalQuestions,
      })
    })()
  }, [token])

  useEffect(() => {
    if (!matchId) return
    const ch = supabase
      .channel(`match:${matchId}`)
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
    <div style={styles.root}>
      <div style={styles.waiting}>WAITING...</div>
    </div>
  )

  if (state.status === 'completed') {
    return <CompletedScreen state={state} meta={meta} />
  }

  const rule = RuleRegistry.find(state.ruleId)
  const active     = state.players.filter(p => p.status === 'active')
  const winners    = state.players.filter(p => p.status === 'winner')
  const eliminated = state.players.filter(p => p.status === 'eliminated')
  const resting    = state.players.filter(p => p.status === 'resting')

  const activePct  = active.length
  const totalCount = state.players.length
  const qNum       = state.questionNumber
  const totalQ     = meta?.totalQuestions

  return (
    <div style={styles.root}>
      {/* フラッシュ */}
      {flash && (
        <div style={{
          ...styles.flashOverlay,
          background: flash.type === 'correct'
            ? 'rgba(16,185,129,0.07)'
            : 'rgba(239,68,68,0.07)',
        }} />
      )}

      {/* ─── ヘッダー ─── */}
      <header style={styles.header}>
        {/* 左: ロゴ + 大会名 + ラウンド名 */}
        <div style={styles.headerLeft}>
          <div style={styles.logoBox}>
            <span style={styles.logoText}>Q</span>
          </div>
          <div>
            {meta?.tournamentName && (
              <div style={styles.tournamentName}>{meta.tournamentName}</div>
            )}
            <div style={styles.matchName}>{meta?.matchName ?? state.matchName}</div>
            {meta?.roundName && (
              <div style={styles.roundName}>{meta.roundName}</div>
            )}
          </div>
        </div>

        {/* 右: ステータス情報 */}
        <div style={styles.headerRight}>
          {/* ルール */}
          {meta?.ruleName && (
            <div style={styles.infoPill}>
              <span style={styles.infoLabel}>RULE</span>
              <span style={styles.infoValue}>{meta.ruleName}</span>
            </div>
          )}

          {/* 問題番号 / 総問題数 */}
          {qNum > 0 && (
            <div style={styles.infoPill}>
              <span style={styles.infoLabel}>Q</span>
              <span style={styles.qNum}>{qNum}</span>
              {totalQ && (
                <span style={styles.infoLabel}>/ {totalQ}</span>
              )}
            </div>
          )}

          {/* 人数 */}
          <div style={styles.infoPill}>
            <span style={styles.infoLabel}>残</span>
            <span style={styles.infoValue}>{activePct}</span>
            <span style={styles.infoLabel}>/ {totalCount}</span>
          </div>

          {/* 一時停止バッジ */}
          {state.status === 'paused' && (
            <div style={styles.pauseBadge}>⏸ 一時停止</div>
          )}
        </div>
      </header>

      {/* ─── 問題文 ─── */}
      {state.questionText && (
        <div style={styles.questionBar}>
          <QuestionDisplay text={state.questionText} />
        </div>
      )}

      {/* ─── 勝ち抜け帯 ─── */}
      {winners.length > 0 && (
        <div style={styles.winnersBar}>
          {winners.map(p => (
            <div key={p.id} style={styles.winnerChip}>
              <span style={{ marginRight: 6 }}>🏆</span>
              {p.name}
            </div>
          ))}
        </div>
      )}

      {/* ─── プレイヤーグリッド（横一列） ─── */}
      <div style={styles.gridWrapper}>
        <div
          style={{
            ...styles.grid,
            gridTemplateColumns: `repeat(${active.length}, minmax(0, 1fr))`,
          }}
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

      {/* ─── フッター: 脱落・休み ─── */}
      {(eliminated.length > 0 || resting.length > 0) && (
        <div style={styles.footer}>
          {eliminated.map(p => (
            <span key={p.id} style={styles.eliminatedChip}>{p.name}</span>
          ))}
          {resting.map(p => (
            <span key={p.id} style={styles.restingChip}>
              {p.name} 休{p.restRemaining}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────
   試合終了画面
───────────────────────────────────────────── */
function CompletedScreen({ state, meta }: { state: MatchState; meta: MatchMeta | null }) {
  const rule    = RuleRegistry.find(state.ruleId)
  const winners = state.players.filter(p => p.status === 'winner')
  const ranked  = [...state.players]
    .filter(p => p.status !== 'winner')
    .sort((a, b) => {
      const da = rule?.getScoreDisplay(a, state.ruleParams)
      const db = rule?.getScoreDisplay(b, state.ruleParams)
      return (Number(db?.primary) || 0) - (Number(da?.primary) || 0)
    })

  return (
    <div style={{ ...styles.root, alignItems: 'center', justifyContent: 'center', gap: 36 }}>
      {meta?.tournamentName && (
        <div style={{ color: '#94a3b8', fontSize: 14, letterSpacing: '0.2em' }}>{meta.tournamentName}</div>
      )}
      <div style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 22 }}>{meta?.matchName ?? state.matchName}</div>
      <div style={{ color: '#64748b', fontSize: 12, letterSpacing: '0.3em', textTransform: 'uppercase' }}>Result</div>

      {winners.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{ color: '#64748b', fontSize: 11, letterSpacing: '0.3em' }}>WINNER</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'center' }}>
            {winners.map(p => (
              <div key={p.id} style={styles.winnerCard}>
                <span style={{ fontSize: 40 }}>🏆</span>
                <span style={{ color: '#f59e0b', fontWeight: 900, fontSize: 28 }}>{p.name}</span>
                {p.affiliation && <span style={{ color: '#64748b', fontSize: 13 }}>{p.affiliation}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {ranked.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: 700 }}>
          {ranked.map((p, i) => (
            <div key={p.id} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 16px', borderRadius: 12,
              background: 'rgba(30,41,59,0.6)',
              border: `1px solid rgba(255,255,255,${p.status === 'eliminated' ? 0.04 : 0.08})`,
              opacity: p.status === 'eliminated' ? 0.45 : 1,
            }}>
              <span style={{ color: '#475569', fontSize: 12 }}>{i + 1}</span>
              <span style={{
                color: '#cbd5e1',
                textDecoration: p.status === 'eliminated' ? 'line-through' : 'none',
                fontSize: 14,
              }}>{p.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────
   問題文
───────────────────────────────────────────── */
function QuestionDisplay({ text }: { text: string }) {
  const parts = text.split('/')
  return (
    <p style={{ margin: 0, color: '#e2e8f0', fontSize: 15, lineHeight: 1.6 }}>
      {parts.map((part, i) => (
        <span key={i}>
          {part}
          {i < parts.length - 1 && (
            <span style={{ color: '#60a5fa', fontWeight: 900, margin: '0 6px', fontSize: 18 }}>/</span>
          )}
        </span>
      ))}
    </p>
  )
}

/* ─────────────────────────────────────────────
   プレイヤーカード
───────────────────────────────────────────── */
function PlayerCard({ player, rule, params, flash }: {
  player: PlayerState
  rule: ReturnType<typeof RuleRegistry.find>
  params: Record<string, number | string | boolean>
  flash: 'correct' | 'wrong' | null
}) {
  const display  = rule?.getScoreDisplay(player, params)
  const towerPct = display?.towerMax && display.towerMax > 0
    ? Math.min((display.towerValue ?? 0) / display.towerMax * 100, 100)
    : 0

  const borderColor = flash === 'correct'
    ? 'rgba(16,185,129,0.8)'
    : flash === 'wrong'
      ? 'rgba(239,68,68,0.6)'
      : 'rgba(255,255,255,0.08)'

  const shadowGlow = flash === 'correct'
    ? '0 0 32px rgba(16,185,129,0.25)'
    : flash === 'wrong'
      ? '0 0 20px rgba(239,68,68,0.2)'
      : '0 4px 6px rgba(0,0,0,0.3)'

  const scoreColor = flash === 'correct'
    ? '#10b981'
    : flash === 'wrong'
      ? '#ef4444'
      : '#3b82f6'

  const scoreGlow = flash === 'correct'
    ? '0 0 24px rgba(16,185,129,0.5)'
    : flash === 'wrong'
      ? 'none'
      : '0 0 20px rgba(59,130,246,0.4)'

  const towerGrad = flash === 'correct'
    ? 'linear-gradient(to top, rgba(16,185,129,0.25), rgba(16,185,129,0.5))'
    : 'linear-gradient(to top, rgba(59,130,246,0.18), rgba(59,130,246,0.45))'

  const scale = flash ? 'scale(1.04)' : 'scale(1)'

  return (
    <div style={{
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      background: 'rgba(30,41,59,0.7)',
      border: `1px solid ${borderColor}`,
      borderRadius: 12,
      padding: '14px 8px',
      height: '100%',
      overflow: 'hidden',
      backdropFilter: 'blur(10px)',
      boxShadow: shadowGlow,
      transform: scale,
      transition: 'all 0.25s ease',
    }}>
      {/* タワーバー */}
      <div style={{
        position: 'absolute',
        bottom: 0, left: 0,
        width: '100%',
        height: `${towerPct}%`,
        background: towerGrad,
        transition: 'height 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      {/* 縦書き名前エリア */}
      <div style={{
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 2,
        height: 180,
        width: '100%',
        marginBottom: 8,
        position: 'relative',
        zIndex: 2,
      }}>
        {player.affiliation && (
          <div style={{
            writingMode: 'vertical-rl',
            textOrientation: 'upright',
            color: '#06b6d4',
            fontSize: 11,
            fontWeight: 400,
            opacity: 0.8,
            letterSpacing: 1,
            width: 18,
            textAlign: 'center',
          }}>
            {player.affiliation}
          </div>
        )}
        <div style={{
          writingMode: 'vertical-rl',
          textOrientation: 'upright',
          color: flash ? '#f1f5f9' : '#cbd5e1',
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: 2,
          width: 36,
          textAlign: 'center',
          transition: 'color 0.2s',
        }}>
          {player.name}
        </div>
        {player.nickname && (
          <div style={{
            writingMode: 'vertical-rl',
            textOrientation: 'upright',
            color: '#94a3b8',
            fontSize: 11,
            fontWeight: 400,
            opacity: 0.7,
            letterSpacing: 1,
            width: 18,
            textAlign: 'center',
          }}>
            {player.nickname}
          </div>
        )}
      </div>

      {/* スコアエリア */}
      <div style={{
        position: 'relative',
        zIndex: 2,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        flex: 1,
        justifyContent: 'center',
        width: '100%',
      }}>
        {/* メインスコア */}
        <div style={{
          fontSize: 56,
          fontWeight: 800,
          color: scoreColor,
          lineHeight: 1,
          textShadow: scoreGlow,
          transition: 'color 0.2s, text-shadow 0.2s',
          textAlign: 'center',
        }}>
          {display?.primary ?? '0'}
        </div>

        {/* サブ情報 */}
        {display?.detail && (
          <div style={{ color: '#f59e0b', fontSize: 12, fontWeight: 600 }}>
            {display.detail}
          </div>
        )}

        {/* 正解数/誤答数 */}
        {(player.correct > 0 || player.wrong > 0) && (
          <div style={{ display: 'flex', gap: 10, fontSize: 13, marginTop: 4 }}>
            {player.correct > 0 && (
              <span style={{ color: '#10b981', fontWeight: 700 }}>{player.correct}○</span>
            )}
            {player.wrong > 0 && (
              <span style={{ color: '#ef4444', fontWeight: 700 }}>
                {'×'.repeat(Math.min(player.wrong, 5))}{player.wrong > 5 ? `(${player.wrong})` : ''}
              </span>
            )}
          </div>
        )}
      </div>

      {/* フラッシュアイコン */}
      {flash === 'correct' && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 64, pointerEvents: 'none', zIndex: 3, opacity: 0.7,
        }}>⭕</div>
      )}
      {flash === 'wrong' && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 64, pointerEvents: 'none', zIndex: 3, opacity: 0.7,
        }}>❌</div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────
   スタイル定数
───────────────────────────────────────────── */
const styles: Record<string, React.CSSProperties> = {
  root: {
    minHeight: '100vh',
    background: '#0f172a',
    backgroundImage: 'radial-gradient(circle at 50% 10%, #1e293b 0%, #0f172a 100%)',
    color: '#f1f5f9',
    display: 'flex',
    flexDirection: 'column',
    padding: '16px',
    gap: 12,
    fontFamily: "'Hiragino Kaku Gothic ProN', 'Hiragino Sans', 'Meiryo', system-ui, sans-serif",
    userSelect: 'none',
    overflow: 'hidden',
  },
  waiting: {
    color: '#334155',
    fontSize: 24,
    letterSpacing: '0.3em',
    animation: 'pulse 2s infinite',
    fontWeight: 300,
  },
  flashOverlay: {
    position: 'fixed',
    inset: 0,
    pointerEvents: 'none',
    zIndex: 50,
    transition: 'opacity 0.2s',
  },
  header: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: '14px 20px',
    background: 'rgba(15,23,42,0.8)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 12,
    backdropFilter: 'blur(10px)',
    boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
    flexShrink: 0,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    minWidth: 0,
  },
  logoBox: {
    width: 40, height: 40,
    background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
    borderRadius: 8,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 900, fontSize: 18, color: '#fff',
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
    flexShrink: 0,
  },
  logoText: {
    fontFamily: 'monospace',
    letterSpacing: '-1px',
  },
  tournamentName: {
    fontSize: 11,
    color: '#94a3b8',
    letterSpacing: '0.1em',
    marginBottom: 1,
  },
  matchName: {
    fontSize: 18,
    fontWeight: 700,
    color: '#f1f5f9',
    letterSpacing: '0.05em',
    lineHeight: 1.2,
  },
  roundName: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 1,
  },
  headerRight: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  infoPill: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 4,
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 6,
    padding: '4px 10px',
  },
  infoLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: 700,
    letterSpacing: '0.05em',
  },
  infoValue: {
    fontSize: 15,
    color: '#e2e8f0',
    fontWeight: 700,
  },
  qNum: {
    fontSize: 22,
    color: '#f1f5f9',
    fontWeight: 900,
    lineHeight: 1,
    fontVariantNumeric: 'tabular-nums',
  },
  pauseBadge: {
    fontSize: 12,
    color: '#fbbf24',
    background: 'rgba(245,158,11,0.15)',
    border: '1px solid rgba(245,158,11,0.3)',
    borderRadius: 6,
    padding: '4px 10px',
  },
  questionBar: {
    padding: '10px 18px',
    background: 'rgba(15,23,42,0.7)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 10,
    flexShrink: 0,
  },
  winnersBar: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    padding: '8px 14px',
    background: 'rgba(16,185,129,0.05)',
    border: '1px solid rgba(16,185,129,0.2)',
    borderRadius: 10,
    flexShrink: 0,
  },
  winnerChip: {
    display: 'flex',
    alignItems: 'center',
    background: 'rgba(16,185,129,0.15)',
    border: '1px solid rgba(16,185,129,0.35)',
    borderRadius: 20,
    padding: '4px 14px',
    fontSize: 13,
    fontWeight: 700,
    color: '#6ee7b7',
  },
  gridWrapper: {
    flex: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
  },
  grid: {
    flex: 1,
    display: 'grid',
    gap: 10,
    alignItems: 'stretch',
    height: '100%',
  },
  footer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
    padding: '8px 4px',
    flexShrink: 0,
  },
  eliminatedChip: {
    fontSize: 12,
    color: '#334155',
    textDecoration: 'line-through',
    background: 'rgba(15,23,42,0.8)',
    padding: '2px 8px',
    borderRadius: 4,
  },
  restingChip: {
    fontSize: 12,
    color: '#92400e',
    background: 'rgba(245,158,11,0.1)',
    border: '1px solid rgba(245,158,11,0.2)',
    padding: '2px 8px',
    borderRadius: 4,
  },
  winnerCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    background: 'rgba(245,158,11,0.08)',
    border: '1px solid rgba(245,158,11,0.3)',
    borderRadius: 20,
    padding: '20px 32px',
  },
}
