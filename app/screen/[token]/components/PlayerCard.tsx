// @ts-nocheck
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
  if (paperRank != null) return sorted.find(t => paperRank <= t.maxRank) ?? sorted[sorted.length - 1]
  return sorted[Math.min(position - 1, sorted.length - 1)]
}

export function PlayerCard({ player, rule, params, flash, tiers }: {
  player: PlayerState
  rule: ReturnType<typeof RuleRegistry.find>
  params: Record<string, number | string | boolean>
  flash: 'correct' | 'wrong' | null
  tiers?: RankColorTier[]
}) {
  const display    = rule?.getScoreDisplay(player, params)
  const activeTiers = tiers?.length ? tiers : DEFAULT_RANK_TIERS
  const tier       = getTier(player.paperRank, player.position, activeTiers)

  const isCorrect = flash === 'correct'
  const isWrong   = flash === 'wrong'
  const flashColor = isCorrect ? '#00FF88' : isWrong ? '#FF2244' : null
  const barColor   = flashColor ?? tier.bar
  const rankLabel  = player.paperRank ? ordinal(player.paperRank) : `#${player.position}`

  const maxWrong = Math.max(
    player.wrong,
    Number(params?.lose ?? params?.elim_wrong ?? params?.maxWrong ?? 0)
  )
  const dots = maxWrong > 0
    ? Array.from({ length: Math.min(maxWrong, 8) }, (_, i) => i < player.wrong)
    : []

  return (
    <div style={{
      display:'flex', flexDirection:'column', height:'100%',
      background: flashColor ? (isCorrect ? 'rgba(0,255,136,0.06)' : 'rgba(255,34,68,0.06)') : tier.bg,
      border: `1.5px solid ${barColor}40`,
      boxShadow: flash ? `0 0 32px ${flashColor}50` : `0 0 12px ${barColor}15`,
      transform: flash ? 'scale(1.025)' : 'scale(1)',
      transition: 'all 0.15s ease',
      overflow: 'hidden',
    }}>

      {/* ── 上部カラーバンド ── */}
      <div style={{
        flexShrink:0,
        background: `linear-gradient(180deg, ${barColor}22 0%, ${barColor}08 100%)`,
        borderBottom: `2px solid ${barColor}`,
        padding: '6px 4px 5px',
        display:'flex', alignItems:'center', justifyContent:'center', gap:6,
      }}>
        {/* ■ 左 */}
        <div style={{ width:8, height:8, background: barColor, boxShadow:`0 0 6px ${barColor}`, flexShrink:0 }} />
        {/* 順位 */}
        <span style={{
          color: barColor, fontWeight:900, fontSize:'clamp(11px,1.3vw,17px)',
          letterSpacing:'0.05em', lineHeight:1,
          textShadow:`0 0 10px ${barColor}80`,
        }}>
          {rankLabel}
        </span>
        {/* ■ 右 */}
        <div style={{ width:8, height:8, background: barColor, boxShadow:`0 0 6px ${barColor}`, flexShrink:0 }} />
      </div>

      {/* ── 縦書き名前・所属・学年 ── */}
      <div style={{
        flex:1, minHeight:0,
        display:'flex', flexDirection:'row', alignItems:'center', justifyContent:'center',
        padding:'8px 4px', gap:3,
      }}>
        {player.grade && (
          <div style={{
            writingMode:'vertical-rl', textOrientation:'upright',
            color: `${barColor}70`, fontSize:'clamp(8px,0.9vw,11px)',
            letterSpacing:1, lineHeight:1.2, flexShrink:0,
          }}>
            {player.grade}
          </div>
        )}
        {player.affiliation && (
          <div style={{
            writingMode:'vertical-rl', textOrientation:'upright',
            color:'rgba(255,255,255,0.35)', fontSize:'clamp(9px,1vw,12px)',
            letterSpacing:1, lineHeight:1.2, flexShrink:0,
          }}>
            {player.affiliation}
          </div>
        )}
        <div style={{
          writingMode:'vertical-rl', textOrientation:'upright',
          color: flash ? '#ffffff' : '#f0f0f0',
          fontSize:'clamp(18px,2.4vw,32px)',
          fontWeight:900, letterSpacing:4, lineHeight:1,
          textShadow: flash ? `0 0 20px ${flashColor}` : `0 0 8px ${barColor}30`,
          transition:'all 0.15s',
          flexShrink:0,
        }}>
          {player.name}
        </div>
      </div>

      {/* ── スコアボックス ── */}
      <div style={{
        flexShrink:0, margin:'0 6px 4px',
        border:`2px solid ${barColor}`,
        boxShadow:`0 0 14px ${barColor}40, inset 0 0 10px ${barColor}08`,
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        padding:'5px 4px', background:'rgba(0,0,0,0.7)',
        transition:'border-color 0.15s, box-shadow 0.15s',
      }}>
        <div style={{
          fontSize:'clamp(24px,3.5vw,54px)',
          fontWeight:900, color: barColor, lineHeight:1,
          fontVariantNumeric:'tabular-nums', letterSpacing:'-1px',
          textShadow:`0 0 18px ${barColor}70`,
          transition:'all 0.15s',
        }}>
          {display?.primary ?? '0'}
        </div>
        {display?.detail && (
          <div style={{ color:'#f59e0b', fontSize:'clamp(8px,0.9vw,11px)', fontWeight:700 }}>
            {display.detail}
          </div>
        )}
      </div>

      {/* ── ×ドット / 休み ── */}
      {dots.length > 0 && (
        <div style={{ flexShrink:0, display:'flex', justifyContent:'center', gap:3, padding:'2px 4px 6px' }}>
          {dots.map((filled, i) => (
            <div key={i} style={{
              width:6, height:6, borderRadius:'50%',
              background: filled ? '#FF2244' : 'rgba(255,255,255,0.12)',
              boxShadow: filled ? '0 0 5px #FF224480' : 'none',
              transition:'all 0.2s',
            }} />
          ))}
        </div>
      )}

      {/* フラッシュオーバーレイ */}
      {flash && (
        <div style={{
          position:'absolute', inset:0, zIndex:10,
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:'clamp(40px,5vw,70px)', opacity:0.55, pointerEvents:'none',
        }}>
          {isCorrect ? '⭕' : '❌'}
        </div>
      )}
    </div>
  )
}
