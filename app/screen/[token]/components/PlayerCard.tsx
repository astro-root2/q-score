import type { PlayerState } from '@/lib/engine/types'
import { RuleRegistry } from '@/lib/engine/rules'

// ポジション別カード背景色（参考画像の暗めカラー帯）
const CARD_COLORS = [
  { bg: 'hsl(0,   60%, 14%)', border: 'hsl(0,   70%, 35%)' },  // 深紅
  { bg: 'hsl(220, 60%, 16%)', border: 'hsl(220, 70%, 40%)' },  // 深青
  { bg: 'hsl(45,  55%, 14%)', border: 'hsl(45,  65%, 35%)' },  // 深黄
  { bg: 'hsl(150, 50%, 12%)', border: 'hsl(150, 60%, 30%)' },  // 深緑
  { bg: 'hsl(270, 55%, 15%)', border: 'hsl(270, 65%, 38%)' },  // 深紫
  { bg: 'hsl(190, 55%, 13%)', border: 'hsl(190, 65%, 32%)' },  // 深シアン
  { bg: 'hsl(30,  55%, 13%)', border: 'hsl(30,  65%, 33%)' },  // 深橙
  { bg: 'hsl(330, 55%, 14%)', border: 'hsl(330, 65%, 36%)' },  // 深ピンク
]

export function PlayerCard({ player, rule, params, flash }: {
  player: PlayerState
  rule: ReturnType<typeof RuleRegistry.find>
  params: Record<string, number | string | boolean>
  flash: 'correct' | 'wrong' | null
}) {
  const display    = rule?.getScoreDisplay(player, params)
  const towerPct   = display?.towerMax && display.towerMax > 0
    ? Math.min((display.towerValue ?? 0) / display.towerMax * 100, 100) : 0

  const colorIdx   = (player.position - 1) % CARD_COLORS.length
  const { bg, border: cardBorder } = CARD_COLORS[colorIdx]

  const isCorrect  = flash === 'correct'
  const isWrong    = flash === 'wrong'

  const flashBorder = isCorrect ? '#10b981' : isWrong ? '#ef4444' : null
  const flashGlow   = isCorrect ? 'rgba(16,185,129,0.5)' : isWrong ? 'rgba(239,68,68,0.4)' : null
  const scoreColor  = isCorrect ? '#10b981' : isWrong ? '#ef4444' : 'var(--accent)'
  const scoreGlow   = isCorrect ? 'rgba(16,185,129,0.5)' : isWrong ? 'rgba(239,68,68,0.4)' : 'var(--accent-glow)'

  return (
    <div style={{
      position: 'relative',
      display: 'flex', flexDirection: 'column',
      height: '100%',
      background: bg,
      border: `2px solid ${flashBorder ?? cardBorder}`,
      boxShadow: flashGlow
        ? `0 0 28px ${flashGlow}, inset 0 0 30px rgba(0,0,0,0.4)`
        : `inset 0 0 30px rgba(0,0,0,0.5), 0 4px 12px rgba(0,0,0,0.4)`,
      transform: flash ? 'scale(1.03)' : 'scale(1)',
      transition: 'all 0.2s ease',
      overflow: 'hidden',
    }}>

      {/* タワーバー */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: `${towerPct}%`,
        background: `linear-gradient(to top, ${scoreColor}30, transparent)`,
        borderTop: towerPct > 5 ? `1px solid ${scoreColor}50` : 'none',
        transition: 'height 0.6s cubic-bezier(0.34,1.56,0.64,1)',
        zIndex: 0,
      }} />

      {/* 上部アクセントライン */}
      <div style={{
        height: 3, flexShrink: 0,
        background: flashBorder ?? 'var(--accent)',
        boxShadow: `0 0 10px ${flashGlow ?? 'var(--accent)'}`,
      }} />

      {/* 順位表示 */}
      <div style={{
        padding: '6px 8px 0',
        display: 'flex', justifyContent: 'center',
        flexShrink: 0, zIndex: 1,
      }}>
        <span style={{
          fontSize: 10, fontWeight: 700,
          color: flashBorder ?? cardBorder,
          letterSpacing: '0.1em',
          textShadow: `0 0 8px ${flashBorder ?? cardBorder}`,
        }}>
          #{player.position}
        </span>
      </div>

      {/* 名前エリア（縦書き） */}
      <div style={{
        position: 'relative', zIndex: 1,
        flex: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '8px 4px',
        gap: 2,
      }}>
        {player.affiliation && (
          <div style={{
            writingMode: 'vertical-rl', textOrientation: 'upright',
            color: 'rgba(255,255,255,0.35)', fontSize: 9,
            letterSpacing: 2,
          }}>{player.affiliation}</div>
        )}
        <div style={{
          writingMode: 'vertical-rl', textOrientation: 'upright',
          color: flash ? '#ffffff' : '#f1f5f9',
          fontSize: 22, fontWeight: 900,
          letterSpacing: 4,
          textShadow: flash
            ? `0 0 20px ${scoreColor}, 0 2px 8px rgba(0,0,0,0.8)`
            : '0 2px 12px rgba(0,0,0,0.8)',
          transition: 'all 0.2s',
        }}>{player.name}</div>
        {player.nickname && (
          <div style={{
            writingMode: 'vertical-rl', textOrientation: 'upright',
            color: 'rgba(255,255,255,0.3)', fontSize: 9,
            letterSpacing: 2,
          }}>{player.nickname}</div>
        )}
      </div>

      {/* スコアボックス */}
      <div style={{
        position: 'relative', zIndex: 1,
        margin: '0 8px 10px',
        padding: '8px 6px',
        background: 'rgba(0,0,0,0.7)',
        border: `2px solid ${scoreColor}`,
        boxShadow: `0 0 16px ${scoreGlow}, inset 0 0 16px rgba(0,0,0,0.6)`,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 3, flexShrink: 0,
      }}>
        <div style={{
          fontSize: 54, fontWeight: 900, lineHeight: 1,
          color: scoreColor,
          textShadow: `0 0 24px ${scoreGlow}`,
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-2px',
          transition: 'all 0.2s',
        }}>
          {display?.primary ?? '0'}
        </div>

        {display?.detail && (
          <div style={{ color: '#f59e0b', fontSize: 10, fontWeight: 700 }}>
            {display.detail}
          </div>
        )}

        {(player.correct > 0 || player.wrong > 0) && (
          <div style={{ display: 'flex', gap: 8, fontSize: 11 }}>
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
          fontSize: 64, opacity: 0.65, pointerEvents: 'none',
          background: isCorrect ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
        }}>
          {isCorrect ? '⭕' : '❌'}
        </div>
      )}
    </div>
  )
}
