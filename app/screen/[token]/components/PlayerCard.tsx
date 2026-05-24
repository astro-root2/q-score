import type { PlayerState } from '@/lib/engine/types'
import { RuleRegistry } from '@/lib/engine/rules'

export function PlayerCard({ player, rule, params, flash }: {
  player: PlayerState
  rule: ReturnType<typeof RuleRegistry.find>
  params: Record<string, number | string | boolean>
  flash: 'correct' | 'wrong' | null
}) {
  const display  = rule?.getScoreDisplay(player, params)
  const towerPct = display?.towerMax && display.towerMax > 0
    ? Math.min((display.towerValue ?? 0) / display.towerMax * 100, 100) : 0

  const borderColor = flash === 'correct' ? 'rgba(16,185,129,0.8)' : flash === 'wrong' ? 'rgba(239,68,68,0.6)' : 'rgba(255,255,255,0.08)'
  const glow        = flash === 'correct' ? '0 0 32px rgba(16,185,129,0.25)' : flash === 'wrong' ? '0 0 20px rgba(239,68,68,0.2)' : '0 4px 6px rgba(0,0,0,0.3)'
  const scoreColor  = flash === 'correct' ? '#10b981' : flash === 'wrong' ? '#ef4444' : '#3b82f6'
  const scoreGlow   = flash === 'correct' ? '0 0 24px rgba(16,185,129,0.5)' : '0 0 20px rgba(59,130,246,0.4)'
  const towerGrad   = flash === 'correct'
    ? 'linear-gradient(to top, rgba(16,185,129,0.25), rgba(16,185,129,0.5))'
    : 'linear-gradient(to top, rgba(59,130,246,0.18), rgba(59,130,246,0.45))'

  return (
    <div style={{
      position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center',
      background: 'rgba(30,41,59,0.7)', border: `1px solid ${borderColor}`, borderRadius: 12,
      padding: '14px 8px', height: '100%', overflow: 'hidden',
      backdropFilter: 'blur(10px)', boxShadow: glow,
      transform: flash ? 'scale(1.04)' : 'scale(1)', transition: 'all 0.25s ease',
    }}>
      {/* タワーバー */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, width: '100%', height: `${towerPct}%`,
        background: towerGrad, transition: 'height 0.5s cubic-bezier(0.34,1.56,0.64,1)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* 縦書き名前 */}
      <div style={{
        display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
        gap: 2, height: 180, width: '100%', marginBottom: 8, position: 'relative', zIndex: 2,
      }}>
        {player.affiliation && (
          <div style={{ writingMode: 'vertical-rl', textOrientation: 'upright', color: '#06b6d4', fontSize: 11, opacity: 0.8, letterSpacing: 1, width: 18 }}>
            {player.affiliation}
          </div>
        )}
        <div style={{ writingMode: 'vertical-rl', textOrientation: 'upright', color: flash ? '#f1f5f9' : '#cbd5e1', fontSize: 22, fontWeight: 700, letterSpacing: 2, width: 36, transition: 'color 0.2s' }}>
          {player.name}
        </div>
        {player.nickname && (
          <div style={{ writingMode: 'vertical-rl', textOrientation: 'upright', color: '#94a3b8', fontSize: 11, opacity: 0.7, letterSpacing: 1, width: 18 }}>
            {player.nickname}
          </div>
        )}
      </div>

      {/* スコア */}
      <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1, justifyContent: 'center', width: '100%' }}>
        <div style={{ fontSize: 56, fontWeight: 800, color: scoreColor, lineHeight: 1, textShadow: scoreGlow, transition: 'color 0.2s', textAlign: 'center' }}>
          {display?.primary ?? '0'}
        </div>
        {display?.detail && <div style={{ color: '#f59e0b', fontSize: 12, fontWeight: 600 }}>{display.detail}</div>}
        {(player.correct > 0 || player.wrong > 0) && (
          <div style={{ display: 'flex', gap: 10, fontSize: 13, marginTop: 4 }}>
            {player.correct > 0 && <span style={{ color: '#10b981', fontWeight: 700 }}>{player.correct}○</span>}
            {player.wrong > 0 && <span style={{ color: '#ef4444', fontWeight: 700 }}>{'×'.repeat(Math.min(player.wrong, 5))}{player.wrong > 5 ? `(${player.wrong})` : ''}</span>}
          </div>
        )}
      </div>

      {flash && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64, pointerEvents: 'none', zIndex: 3, opacity: 0.7 }}>
          {flash === 'correct' ? '⭕' : '❌'}
        </div>
      )}
    </div>
  )
}
