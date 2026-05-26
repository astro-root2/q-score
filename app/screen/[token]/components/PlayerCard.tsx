import type { PlayerState } from '@/lib/engine/types'
import { RuleRegistry } from '@/lib/engine/rules'
import type { RankColorTier } from '../types'
import { DEFAULT_RANK_TIERS } from '../types'

function ordinal(n: number): string {
  if (n % 100 >= 11 && n % 100 <= 13) return `${n}th`
  const s: Record<number, string> = { 1: 'st', 2: 'nd', 3: 'rd' }
  return `${n}${s[n % 10] ?? 'th'}`
}

function getTier(paperRank: number | null, position: number, tiers: RankColorTier[]) {
  const sorted = [...tiers].sort((a, b) => a.maxRank - b.maxRank)
  if (paperRank != null) {
    return sorted.find(t => paperRank <= t.maxRank) ?? sorted[sorted.length - 1]
  }
  return sorted[Math.min(position - 1, sorted.length - 1)]
}

export function PlayerCard({ player, rule, params, flash, tiers }: {
  player: PlayerState
  rule: ReturnType<typeof RuleRegistry.find>
  params: Record<string, number | string | boolean>
  flash: 'correct' | 'wrong' | null
  tiers?: RankColorTier[]
}) {
  const display  = rule?.getScoreDisplay(player, params)
  const activeTiers = tiers && tiers.length > 0 ? tiers : DEFAULT_RANK_TIERS
  const tier     = getTier(player.paperRank, player.position, activeTiers)

  const isCorrect = flash === 'correct'
  const isWrong   = flash === 'wrong'

  const flashBar   = isCorrect ? '#00FF88' : isWrong ? '#FF2244' : null
  const barColor   = flashBar ?? tier.bar
  const boxBorder  = flashBar ?? tier.bar
  const scoreColor = flashBar ?? tier.bar
  const scoreGlow  = `0 0 14px ${boxBorder}80`

  const maxWrong = Math.max(
    player.wrong,
    Number(params?.lose ?? params?.elim_wrong ?? params?.maxWrong ?? 0)
  )
  const dots = maxWrong > 0
    ? Array.from({ length: Math.min(maxWrong, 6) }, (_, i) => i < player.wrong)
    : []

  const rankLabel = player.paperRank
    ? ordinal(player.paperRank)
    : `#${player.position}`

  return (
    <div style={{
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: tier.bg,
      border: flashBar ? `2px solid ${flashBar}` : '2px solid transparent',
      boxShadow: flash ? `0 0 28px ${flashBar}60` : 'none',
      transform: flash ? 'scale(1.03)' : 'scale(1)',
      transition: 'all 0.15s ease',
    }}>

      {/* 順位ラベル */}
      <div style={{
        textAlign: 'center',
        padding: '5px 0 2px',
        color: barColor,
        fontSize: 13,
        fontWeight: 900,
        letterSpacing: '0.05em',
        lineHeight: 1,
        textShadow: `0 0 8px ${barColor}80`,
      }}>
        {rankLabel}
      </div>

      {/* カラーバー */}
      <div style={{
        height: 4,
        background: barColor,
        boxShadow: `0 0 8px ${barColor}`,
        flexShrink: 0,
        transition: 'background 0.15s',
      }} />

      {/* 縦書き名前・所属 */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '8px 4px',
        gap: 2,
        minHeight: 0,
      }}>
        {(player.affiliation || player.grade) && (
          <div style={{
            writingMode: 'vertical-rl',
            textOrientation: 'upright',
            color: 'rgba(255,255,255,0.4)',
            fontSize: 10,
            letterSpacing: 1,
            lineHeight: 1.3,
          }}>
            {[player.affiliation, player.grade].filter(Boolean).join('')}
          </div>
        )}
        <div style={{
          writingMode: 'vertical-rl',
          textOrientation: 'upright',
          color: flash ? '#ffffff' : '#f0f0f0',
          fontSize: 'clamp(16px, 2.2vw, 26px)',
          fontWeight: 900,
          letterSpacing: 4,
          lineHeight: 1,
          textShadow: flash
            ? `0 0 16px ${flashBar}`
            : `0 0 6px ${barColor}40`,
          transition: 'all 0.15s',
        }}>
          {player.name}
        </div>
      </div>

      {/* スコアボックス */}
      <div style={{
        flexShrink: 0,
        margin: '0 6px 4px',
        border: `3px solid ${boxBorder}`,
        boxShadow: scoreGlow,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4px 2px',
        background: 'rgba(0,0,0,0.65)',
        transition: 'border-color 0.15s, box-shadow 0.15s',
      }}>
        <div style={{
          fontSize: 'clamp(22px, 3.2vw, 50px)',
          fontWeight: 900,
          color: scoreColor,
          lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-1px',
          textShadow: `0 0 16px ${scoreColor}80`,
          transition: 'all 0.15s',
        }}>
          {display?.primary ?? '0'}
        </div>
        {display?.detail && (
          <div style={{ color: '#f59e0b', fontSize: 10, fontWeight: 700 }}>
            {display.detail}
          </div>
        )}
      </div>

      {/* ×ドット */}
      {dots.length > 0 && (
        <div style={{
          flexShrink: 0,
          display: 'flex',
          justifyContent: 'center',
          gap: 4,
          padding: '2px 4px 5px',
        }}>
          {dots.map((filled, i) => (
            <div key={i} style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: filled ? '#CC2200' : 'rgba(255,255,255,0.15)',
              boxShadow: filled ? '0 0 5px #CC220080' : 'none',
              transition: 'all 0.2s',
            }} />
          ))}
        </div>
      )}

      {/* フラッシュオーバーレイ */}
      {flash && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 'clamp(36px, 4.5vw, 64px)',
          opacity: 0.6,
          pointerEvents: 'none',
          background: isCorrect ? 'rgba(0,255,136,0.06)' : 'rgba(255,34,68,0.06)',
        }}>
          {isCorrect ? '⭕' : '❌'}
        </div>
      )}
    </div>
  )
}
