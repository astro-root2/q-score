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

  const isCorrect = flash === 'correct'
  const isWrong   = flash === 'wrong'

  const borderColor = isCorrect ? '#10b981' : isWrong ? '#ef4444' : 'var(--accent-border)'
  const glowColor   = isCorrect ? 'rgba(16,185,129,0.4)' : isWrong ? 'rgba(239,68,68,0.3)' : 'var(--accent-glow)'
  const scoreColor  = isCorrect ? '#10b981' : isWrong ? '#ef4444' : 'var(--accent)'

  return (
    <div style={{
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      height: '100%',
      background: 'rgba(5,8,20,0.92)',
      border: `1px solid ${borderColor}`,
      clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))',
      boxShadow: `0 0 20px ${glowColor}, inset 0 0 20px rgba(0,0,0,0.5)`,
      transform: flash ? 'scale(1.04)' : 'scale(1)',
      transition: 'all 0.2s ease',
      overflow: 'hidden',
    }}>

      {/* コーナーアクセント */}
      <div style={{ position: 'absolute', top: 0, right: 10, width: 10, height: 1, background: borderColor }} />
      <div style={{ position: 'absolute', top: 0, right: 0, width: 1, height: 10, background: borderColor }} />
      <div style={{ position: 'absolute', bottom: 10, left: 0, width: 1, height: 10, background: borderColor }} />
      <div style={{ position: 'absolute', bottom: 0, left: 10, width: 10, height: 1, background: borderColor }} />

      {/* タワーバー */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0,
        width: '100%', height: `${towerPct}%`,
        background: `linear-gradient(to top, ${borderColor}30, transparent)`,
        transition: 'height 0.6s cubic-bezier(0.34,1.56,0.64,1)',
        zIndex: 0,
      }} />

      {/* スキャンライン */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)',
      }} />

      {/* 縦書き名前 */}
      <div style={{
        position: 'relative', zIndex: 2,
        display: 'flex', flexDirection: 'row',
        justifyContent: 'center', alignItems: 'center',
        gap: 2, height: 180, width: '100%', padding: '12px 6px',
      }}>
        {player.affiliation && (
          <div style={{
            writingMode: 'vertical-rl', textOrientation: 'upright',
            color: 'var(--accent)', fontSize: 10, opacity: 0.7,
            letterSpacing: 1, width: 16,
          }}>{player.affiliation}</div>
        )}
        <div style={{
          writingMode: 'vertical-rl', textOrientation: 'upright',
          color: flash ? '#ffffff' : '#e2e8f0',
          fontSize: 20, fontWeight: 700, letterSpacing: 3,
          textShadow: flash ? `0 0 12px ${scoreColor}` : 'none',
          transition: 'all 0.2s',
        }}>{player.name}</div>
        {player.nickname && (
          <div style={{
            writingMode: 'vertical-rl', textOrientation: 'upright',
            color: '#64748b', fontSize: 10, letterSpacing: 1, width: 16,
          }}>{player.nickname}</div>
        )}
      </div>

      {/* スコアエリア */}
      <div style={{
        position: 'relative', zIndex: 2,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 6, flex: 1, width: '100%', padding: '4px 8px 16px',
      }}>
        {/* メインスコア */}
        <div style={{
          fontSize: 64, fontWeight: 900,
          color: scoreColor, lineHeight: 1,
          fontFamily: "'Rajdhani', 'Bebas Neue', 'Oswald', monospace",
          textShadow: `0 0 30px ${glowColor}`,
          letterSpacing: '-2px',
          transition: 'all 0.2s',
        }}>
          {display?.primary ?? '0'}
        </div>

        {display?.detail && (
          <div style={{ color: '#f59e0b', fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>
            {display.detail}
          </div>
        )}

        {/* ○✕ */}
        {(player.correct > 0 || player.wrong > 0) && (
          <div style={{ display: 'flex', gap: 10, fontSize: 12 }}>
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

      {/* フラッシュ */}
      {flash && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 3,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 56, opacity: 0.8, pointerEvents: 'none',
        }}>
          {flash === 'correct' ? '⭕' : '❌'}
        </div>
      )}
    </div>
  )
}
