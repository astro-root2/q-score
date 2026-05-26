'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Check, AlertCircle, Plus, Trash2 } from 'lucide-react'
import { buildThemeVars } from '@/lib/utils/theme'
import type { RankColorTier } from '@/app/screen/[token]/types'
import { DEFAULT_RANK_TIERS } from '@/app/screen/[token]/types'

const PRESET_COLORS = [
  '#00e5ff', '#00ff88', '#ff0080', '#ffaa00',
  '#7c3aed', '#2d4fff', '#ef4444', '#10b981',
]

interface Tournament {
  id: string
  name: string
  theme_color: string
  status: string
  settings: Record<string, unknown>
}

export default function SetupPage() {
  const params   = useParams()
  const tid      = params.tid as string
  const supabase = createClient()

  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [name, setName]     = useState('')
  const [accent, setAccent] = useState('#00e5ff')
  const [format, setFormat] = useState<'individual' | 'team'>('individual')
  const [tiers, setTiers]   = useState<RankColorTier[]>(DEFAULT_RANK_TIERS)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)
  const [error, setError]   = useState<string | null>(null)

  useEffect(() => {
    supabase.from('tournaments').select('*').eq('id', tid).single().then(({ data }) => {
      if (!data) return
      setTournament(data as Tournament)
      setName(data.name)
      setAccent(data.theme_color ?? '#00e5ff')
      const s = (data.settings ?? {}) as Record<string, unknown>
      setFormat((s.format as 'individual' | 'team') ?? 'individual')
      if (Array.isArray(s.rankColorTiers) && s.rankColorTiers.length > 0) {
        setTiers(s.rankColorTiers as RankColorTier[])
      }
    })
  }, [tid])

  async function save() {
    setSaving(true); setError(null)
    const { error: err } = await supabase.from('tournaments')
      .update({ name, theme_color: accent, settings: { format, rankColorTiers: tiers } })
      .eq('id', tid)
    setSaving(false)
    if (err) { setError(err.message); return }
    setSaved(true); setTimeout(() => setSaved(false), 2000)
  }

  function updateTier(i: number, patch: Partial<RankColorTier>) {
    setTiers(prev => prev.map((t, idx) => idx === i ? { ...t, ...patch } : t))
  }

  function addTier() {
    setTiers(prev => {
      const next = [...prev]
      const catchAll = next.pop()!
      next.push({ maxRank: (next[next.length - 1]?.maxRank ?? 0) + 5, bg: '#1a1a2e', bar: '#4444aa' })
      next.push(catchAll)
      return next
    })
  }

  function removeTier(i: number) {
    if (tiers.length <= 1) return
    setTiers(prev => prev.filter((_, idx) => idx !== i))
  }

  const themeVars = buildThemeVars(accent)

  if (!tournament) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
      <div style={{ color: '#475569', fontSize: 13, letterSpacing: '0.2em' }}>LOADING...</div>
    </div>
  )

  return (
    <div style={{ maxWidth: 600, display: 'flex', flexDirection: 'column', gap: 28, ...themeVars }}>
      <h1 style={{ color: '#f1f5f9', fontWeight: 900, fontSize: 20, margin: 0, letterSpacing: '0.05em' }}>
        大会設定
      </h1>

      {/* 大会名 */}
      <Field label="大会名">
        <input
          type="text" value={name} onChange={e => setName(e.target.value)}
          style={inputStyle}
          onFocus={e => (e.target.style.borderColor = accent)}
          onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
        />
      </Field>

      {/* 形式 */}
      <Field label="形式">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {(['individual', 'team'] as const).map(f => (
            <button key={f} onClick={() => setFormat(f)} style={{
              padding: '10px 16px',
              background: format === f ? 'var(--accent-dim)' : 'rgba(5,8,20,0.6)',
              border: `1px solid ${format === f ? 'var(--accent-border)' : 'rgba(255,255,255,0.08)'}`,
              color: format === f ? 'var(--accent)' : '#475569',
              fontWeight: 700, fontSize: 13, cursor: 'pointer',
              clipPath: 'polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)',
              letterSpacing: '0.05em', transition: 'all 0.15s', fontFamily: 'inherit',
            }}>
              {f === 'individual' ? '個人戦' : '団体戦'}
            </button>
          ))}
        </div>
      </Field>

      {/* テーマカラー */}
      <Field label="テーマカラー">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {PRESET_COLORS.map(c => (
              <button key={c} onClick={() => setAccent(c)} style={{
                width: 34, height: 34, background: c, border: 'none', cursor: 'pointer',
                clipPath: 'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)',
                outline: accent === c ? `2px solid ${c}` : 'none',
                outlineOffset: 3,
                boxShadow: accent === c ? `0 0 12px ${c}` : 'none',
                transform: accent === c ? 'scale(1.15)' : 'scale(1)',
                transition: 'all 0.15s',
              }} />
            ))}
            <label style={{
              width: 34, height: 34, cursor: 'pointer', position: 'relative',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.15)',
              clipPath: 'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)',
              fontSize: 16,
            }}>
              🎨
              <input type="color" value={accent} onChange={e => setAccent(e.target.value)}
                style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }} />
            </label>
          </div>
        </div>
      </Field>

      {/* ランクカラー設定 */}
      <Field label="スクリーン カードカラー（ペーパー順位ティア）">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <p style={{ margin: '0 0 8px', color: '#475569', fontSize: 12, lineHeight: 1.5 }}>
            ペーパー順位の範囲ごとにカードの色を設定します。<br />
            最後のティアは上限なしの「その他」として扱われます。
          </p>

          {tiers.map((tier, i) => {
            const isLast = i === tiers.length - 1
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 12px',
                background: tier.bg,
                border: `2px solid ${tier.bar}`,
                clipPath: 'polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)',
              }}>
                {/* プレビュー */}
                <div style={{ width: 4, height: 32, background: tier.bar, flexShrink: 0 }} />

                {/* 上限順位 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
                  <span style={{ color: '#475569', fontSize: 9, letterSpacing: '0.1em' }}>
                    {isLast ? 'その他' : '上限順位'}
                  </span>
                  {isLast ? (
                    <span style={{ color: '#334155', fontSize: 13, fontWeight: 700, width: 52 }}>∞</span>
                  ) : (
                    <input
                      type="number" min={1} value={tier.maxRank}
                      onChange={e => updateTier(i, { maxRank: Number(e.target.value) })}
                      style={{
                        width: 52, background: 'rgba(0,0,0,0.4)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        color: '#f1f5f9', fontSize: 13, fontWeight: 700,
                        padding: '3px 6px', fontFamily: 'inherit',
                        outline: 'none',
                      }}
                    />
                  )}
                </div>

                <span style={{ color: '#334155', fontSize: 11 }}>位まで</span>

                {/* 背景色 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ color: '#475569', fontSize: 9, letterSpacing: '0.1em' }}>背景色</span>
                  <label style={{ position: 'relative', cursor: 'pointer' }}>
                    <div style={{
                      width: 32, height: 22,
                      background: tier.bg,
                      border: '1px solid rgba(255,255,255,0.2)',
                    }} />
                    <input type="color" value={tier.bg}
                      onChange={e => updateTier(i, { bg: e.target.value })}
                      style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }} />
                  </label>
                </div>

                {/* バー色 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ color: '#475569', fontSize: 9, letterSpacing: '0.1em' }}>バー・枠色</span>
                  <label style={{ position: 'relative', cursor: 'pointer' }}>
                    <div style={{
                      width: 32, height: 22,
                      background: tier.bar,
                      border: '1px solid rgba(255,255,255,0.2)',
                    }} />
                    <input type="color" value={tier.bar}
                      onChange={e => updateTier(i, { bar: e.target.value })}
                      style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }} />
                  </label>
                </div>

                <div style={{ flex: 1 }} />

                {/* 削除 */}
                {!isLast && tiers.length > 2 && (
                  <button onClick={() => removeTier(i)} style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#334155', padding: 4, flexShrink: 0,
                  }}>
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            )
          })}

          <button onClick={addTier} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '8px', marginTop: 4,
            background: 'rgba(255,255,255,0.03)',
            border: '1px dashed rgba(255,255,255,0.12)',
            color: '#475569', fontSize: 12, cursor: 'pointer',
            fontFamily: 'inherit', transition: 'all 0.15s',
          }}>
            <Plus size={13} /> ティアを追加
          </button>
        </div>
      </Field>

      {/* ステータス */}
      <Field label="大会ステータス">
        <select
          defaultValue={tournament.status}
          onChange={async e => {
            await supabase.from('tournaments').update({ status: e.target.value }).eq('id', tid)
            setSaved(true); setTimeout(() => setSaved(false), 1500)
          }}
          style={{ ...inputStyle, width: 'auto' }}>
          <option value="draft">準備中</option>
          <option value="active">開催中</option>
          <option value="completed">終了</option>
          <option value="archived">アーカイブ</option>
        </select>
      </Field>

      {error && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          color: '#ef4444', fontSize: 13,
          padding: '10px 14px',
          background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.2)',
        }}>
          <AlertCircle size={14} />{error}
        </div>
      )}

      <button onClick={save} disabled={saving} style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        padding: '12px 28px',
        background: saved ? 'rgba(16,185,129,0.15)' : 'var(--accent-dim)',
        border: `1px solid ${saved ? 'rgba(16,185,129,0.4)' : 'var(--accent-border)'}`,
        color: saved ? '#10b981' : 'var(--accent)',
        fontWeight: 900, fontSize: 14, cursor: saving ? 'not-allowed' : 'pointer',
        clipPath: 'polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)',
        letterSpacing: '0.1em', opacity: saving ? 0.5 : 1,
        boxShadow: 'none',
        transition: 'all 0.2s', fontFamily: 'inherit',
      }}>
        {saved ? <><Check size={15} /> 保存しました</> : saving ? '保存中...' : '設定を保存'}
      </button>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <label style={{ color: '#64748b', fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', boxSizing: 'border-box',
  background: 'rgba(5,8,20,0.8)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: '#f1f5f9', fontSize: 15, fontWeight: 700,
  outline: 'none', fontFamily: 'inherit',
  clipPath: 'polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)',
  transition: 'border-color 0.15s',
}
