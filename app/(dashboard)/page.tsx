import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, Users, Play } from 'lucide-react'

const STATUS = {
  draft:     { label: '準備中',     color: '#475569', bg: 'rgba(71,85,105,0.1)',  border: 'rgba(71,85,105,0.3)'  },
  active:    { label: '開催中',     color: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.3)' },
  completed: { label: '終了',       color: '#60a5fa', bg: 'rgba(96,165,250,0.1)', border: 'rgba(96,165,250,0.3)' },
  archived:  { label: 'アーカイブ', color: '#334155', bg: 'rgba(51,65,85,0.1)',   border: 'rgba(51,65,85,0.2)'   },
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: tournaments } = await supabase
    .from('tournaments')
    .select('*, participants(count), rounds(count)')
    .eq('owner_id', user!.id)
    .order('created_at', { ascending: false })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ color: '#f1f5f9', fontWeight: 900, fontSize: 24, margin: 0, letterSpacing: '0.02em' }}>
            大会一覧
          </h1>
          <p style={{ color: '#334155', fontSize: 12, margin: '4px 0 0', letterSpacing: '0.1em' }}>
            {tournaments?.length ?? 0} TOURNAMENTS
          </p>
        </div>
        <Link href="/new" style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 20px', textDecoration: 'none',
          background: 'rgba(0,229,255,0.1)',
          border: '1px solid rgba(0,229,255,0.4)',
          color: '#00e5ff', fontWeight: 700, fontSize: 13,
          clipPath: 'polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)',
          boxShadow: '0 0 16px rgba(0,229,255,0.15)',
          letterSpacing: '0.05em',
          transition: 'all 0.15s',
        }}>
          <Plus size={15} /> 新規大会作成
        </Link>
      </div>

      {!tournaments || tournaments.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '80px 24px',
          border: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(5,8,20,0.6)',
          clipPath: 'polygon(12px 0, 100% 0, calc(100% - 12px) 100%, 0 100%)',
        }}>
          <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>🏆</div>
          <p style={{ color: '#334155', fontSize: 14, margin: '0 0 20px', fontWeight: 600 }}>大会がありません</p>
          <Link href="/new" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '10px 24px', textDecoration: 'none',
            background: 'rgba(0,229,255,0.1)', border: '1px solid rgba(0,229,255,0.4)',
            color: '#00e5ff', fontWeight: 700, fontSize: 13,
            clipPath: 'polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)',
          }}>
            <Plus size={15} /> 大会を作成
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
          {tournaments.map(t => {
            const s = STATUS[t.status as keyof typeof STATUS] ?? STATUS.draft
            const accent = t.theme_color ?? '#00e5ff'
            const participantCount = (t.participants as unknown as [{ count: number }])[0]?.count ?? 0
            const roundCount       = (t.rounds as unknown as [{ count: number }])[0]?.count ?? 0

            return (
              <Link key={t.id} href={`/t/${t.id}`} style={{ textDecoration: 'none' }}>
                <div style={{
                  padding: '18px 20px',
                  background: 'rgba(5,8,20,0.85)',
                  border: `1px solid ${accent}30`,
                  clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))',
                  boxShadow: `0 0 20px ${accent}12`,
                  position: 'relative',
                  transition: 'all 0.15s',
                  cursor: 'pointer',
                }}>
                  {/* 左アクセントバー */}
                  <div style={{
                    position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
                    background: accent, boxShadow: `0 0 8px ${accent}`,
                  }} />

                  {/* コーナー装飾 */}
                  <div style={{ position: 'absolute', top: 0, right: 12, width: 12, height: 1, background: `${accent}60` }} />
                  <div style={{ position: 'absolute', top: 0, right: 0, width: 1, height: 12, background: `${accent}60` }} />

                  <div style={{ paddingLeft: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                      <h2 style={{ color: '#f1f5f9', fontWeight: 900, fontSize: 17, margin: 0, lineHeight: 1.3 }}>
                        {t.name}
                      </h2>
                      <div style={{
                        fontSize: 10, fontWeight: 700, color: s.color,
                        padding: '2px 8px', flexShrink: 0, marginLeft: 8,
                        background: s.bg, border: `1px solid ${s.border}`,
                        clipPath: 'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)',
                        letterSpacing: '0.05em',
                      }}>
                        {s.label}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#475569' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Users size={12} />{participantCount}人
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Play size={12} />{roundCount}ラウンド
                      </span>
                    </div>

                    <p style={{ color: '#1e293b', fontSize: 11, margin: '8px 0 0', letterSpacing: '0.05em' }}>
                      {new Date(t.created_at).toLocaleDateString('ja-JP')}
                    </p>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
