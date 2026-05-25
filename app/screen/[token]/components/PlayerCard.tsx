import type { PlayerState } from '@/lib/engine/types'
import { RuleRegistry } from '@/lib/engine/rules'

// プレイヤーのポジションから背景カラーを生成（アクセントカラーを基調に明度を変える）
function getCardBg(position: number): string {
  const hues = [220, 200, 240, 210, 230, 190, 215, 205]
  const hue  = hues[(position - 1) % hues.length]
  const sat  = 60 - (position % 3) * 8
  const lig  = 12 + (position % 2) * 3
  return `hsl(${hue}, ${sat}%, ${lig}%)`
}

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

  const cardBg      = getCardBg(player.position)
  const borderColor = isCorrect ? '#10b981' : isWrong ? '#ef4444' : 'var(--accent-border)'
  const scoreColor  = isCorrect ? '#10b981' : isWrong ? '#ef4444' : 'var(--accent)'
  const glowColor   = isCorrect ? 'rgba(16,185,129,0.5)' : isWrong ? 'rgba(239,68,68,0.4)' : 'var(--accent-glow)'

  return (
    <div style={{
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: cardBg,
      border: `2px solid ${borderColor}`,
      boxShadow: flash ? `0 0 24px ${glowColor}` : `0 0 8px rgba(0,0,0,0.5)`,
      transform: flash ? 'scale(1.04)' : 'scale(1)',
      transition: 'all 0.2s ease',
      overflow: 'hidden',
    }}>

      {/* タワーバー（背景から伸びる） */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: `${towerPct}%`,
        background: `linear-gradient(to top, ${scoreColor}25, transparent)`,
        transition: 'height 0.6s cubic-bezier(0.34,1.56,0.64,1)',
        zIndex: 0,
        borderTop: towerPct > 0 ? `1px solid ${scoreColor}40` : 'none',
      }} />

      {/* 上部カラーバー（アクセントライン） */}
      <div style={{
        height: 4, background: 'var(--accent)',
        boxShadow: '0 0 8px var(--accent)',
        flexShrink: 0,
      }} />

      {/* 名前エリア（縦書き） */}
      <div style={{
        position: 'relative', zIndex: 1,
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px 6px',
        gap: 4,
      }}>
        {/* 所属 */}
        {player.affiliation && (
          <div style={{
            writingMode: 'vertical-rl', textOrientation: 'upright',
            color: 'rgba(255,255,255,0.5)', fontSize: 10,
            letterSpacing: 1, lineHeight: 1,
          }}>{player.affiliation}</div>
        )}

        {/* 名前（縦書き・大） */}
        <div style={{
          writingMode: 'vertical-rl', textOrientation: 'upright',
          color: flash ? '#ffffff' : '#f1f5f9',
          fontSize: 24, fontWeight: 900,
          letterSpacing: 4, lineHeight: 1,
          textShadow: flash ? `0 0 16px ${scoreColor}` : '0 2px 8px rgba(0,0,0,0.8)',
          transition: 'all 0.2s',
        }}>{player.name}</div>

        {/* ニックネーム */}
        {player.nickname && (
          <div style={{
            writingMode: 'vertical-rl', textOrientation: 'upright',
            color: 'rgba(255,255,255,0.4)', fontSize: 10,
            letterSpacing: 1,
          }}>{player.nickname}</div>
        )}
      </div>

      {/* 下部スコアボックス */}
      <div style={{
        position: 'relative', zIndex: 1,
        flexShrink: 0,
        margin: '0 8px 10px',
        padding: '8px 6px',
        background: 'rgba(0,0,0,0.6)',
        border: `2px solid ${scoreColor}`,
        boxShadow: `0 0 12px ${glowColor}, inset 0 0 12px rgba(0,0,0,0.5)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 3,
      }}>
        {/* メインスコア */}
        <div style={{
          fontSize: 52, fontWeight: 900,
          color: scoreColor,
          lineHeight: 1,
          textShadow: `0 0 20px ${glowColor}`,
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-2px',
          transition: 'all 0.2s',
        }}>
          {display?.primary ?? '0'}
        </div>

        {/* サブ情報 */}
        {display?.detail && (
          <div style={{ color: '#f59e0b', fontSize: 10, fontWeight: 700 }}>{display.detail}</div>
        )}

        {/* ○✕カウント */}
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

      {/* フラッシュオーバーレイ */}
      {flash && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 3,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 64, opacity: 0.7, pointerEvents: 'none',
          background: flash === 'correct' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
        }}>
          {flash === 'correct' ? '⭕' : '❌'}
        </div>
      )}
    </div>
  )
}
