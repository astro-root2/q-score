'use client'
import { useState, useCallback } from 'react'
import { ChevronLeft, RotateCcw, Eye } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

interface RankTier { maxRank: number; bg: string; bar: string }
interface Participant { id: string; name: string; ruby: string | null; affiliation: string | null; paper_rank: number | null }

const DEFAULT_TIERS: RankTier[] = [
  { maxRank: 1,    bg: '#2D0505', bar: '#CC2200' },
  { maxRank: 3,    bg: '#030D2D', bar: '#1155BB' },
  { maxRank: 6,    bg: '#1E1900', bar: '#887700' },
  { maxRank: 9999, bg: '#071507', bar: '#226622' },
]

function getTier(rank: number, tiers: RankTier[]): RankTier {
  const sorted = [...tiers].sort((a, b) => a.maxRank - b.maxRank)
  return sorted.find(t => rank <= t.maxRank) ?? sorted[sorted.length - 1]
}

interface Props {
  tournamentName: string
  themeColor: string
  participants: Participant[]
  rankTiers: RankTier[] | null
}

export default function TurnoverClient({ tournamentName, themeColor, participants, rankTiers }: Props) {
  const { tid } = useParams<{ tid: string }>()
  const tiers = (rankTiers && rankTiers.length > 0) ? rankTiers : DEFAULT_TIERS
  const ordered = [...participants].sort((a, b) => (b.paper_rank ?? 9999) - (a.paper_rank ?? 9999))
  const [revealedCount, setRevealedCount] = useState(0)

  const next = useCallback(() => {
    setRevealedCount(c => Math.min(c + 1, ordered.length))
  }, [ordered.length])

  const reset = () => setRevealedCount(0)
  const allRevealed = revealedCount >= ordered.length

  return (
    <div style={{
      minHeight: '100vh', background: '#060608', color: '#f1f5f9', display: 'flex', flexDirection: 'column',
      fontFamily: "'Hiragino Kaku Gothic ProN','Hiragino Sans','Meiryo',system-ui,sans-serif",
    }}>
      {/* ヘッダー */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: `1px solid ${themeColor}30`, background: 'rgba(0,0,0,0.6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href={`/t/${tid}/paper`} style={{ color: '#64748b', display: 'flex', alignItems: 'center' }}>
            <ChevronLeft size={20} />
          </Link>
          <span style={{ fontWeight: 900, fontSize: 16, color: themeColor }}>{tournamentName}</span>
          <span style={{ fontWeight: 700, fontSize: 14, color: '#94a3b8' }}>ペーパー順位発表</span>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ color: '#64748b', fontSize: 13 }}>{revealedCount} / {ordered.length}</span>
          <button onClick={reset} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: '#1e293b', color: '#94a3b8', border: '1px solid #334155', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>
            <RotateCcw size={14} /> リセット
          </button>
          {!allRevealed
            ? <button onClick={next} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 18px', background: themeColor, color: '#000', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 900, fontSize: 14, boxShadow: `0 0 16px ${themeColor}60` }}>
                <Eye size={16} /> 次を発表
              </button>
            : <span style={{ color: '#10b981', fontWeight: 900, fontSize: 14 }}>✓ 全員発表完了</span>
          }
        </div>
      </div>

      {/* メイン */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 20px', gap: 24 }}>
        {revealedCount === 0 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>🏆</div>
            <div style={{ fontSize: 14, color: '#475569' }}>「次を発表」で最下位から順に発表</div>
            <div style={{ fontSize: 13, color: '#334155', marginTop: 6 }}>{participants.length}名</div>
          </div>
        )}

        {revealedCount > 0 && (
          <div style={{ width: '100%', maxWidth: 960 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 12 }}>
              {ordered.slice(ordered.length - revealedCount).reverse().map((p) => {
                const rank = p.paper_rank ?? 0
                const tier = getTier(rank, tiers)
                const isTop = rank === 1
                return (
                  <div key={p.id} style={{
                    background: tier.bg,
                    border: `2px solid ${tier.bar}`,
                    borderRadius: 12,
                    padding: '16px 10px',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                    boxShadow: isTop ? `0 0 28px ${tier.bar}80` : `0 0 8px ${tier.bar}20`,
                    animation: 'fadeIn 0.4s ease forwards',
                    minHeight: 140,
                  }}>
                    <div style={{ fontSize: isTop ? 26 : 18, fontWeight: 900, color: tier.bar, textShadow: `0 0 10px ${tier.bar}80` }}>
                      {rank}位
                    </div>
                    <div style={{
                      writingMode: 'vertical-rl', textOrientation: 'upright',
                      fontSize: isTop ? 22 : 18, fontWeight: 900, color: '#f0f0f0',
                      letterSpacing: 4, textShadow: `0 0 6px ${tier.bar}40`,
                    }}>
                      {p.name}
                    </div>
                    {p.affiliation && (
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', textAlign: 'center' }}>
                        {p.affiliation}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(16px) scale(0.92); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  )
}
