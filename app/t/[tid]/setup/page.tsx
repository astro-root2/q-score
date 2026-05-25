'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Check, AlertCircle } from 'lucide-react'
import { buildThemeVars } from '@/lib/utils/theme'

const PRESET_COLORS = [
  '#00e5ff', '#00ff88', '#ff0080', '#ffaa00',
  '#7c3aed', '#2d4fff', '#ef4444', '#10b981',
]

interface Tournament { id: string; name: string; theme_color: string; status: string; settings: Record<string, string> }

export default function SetupPage() {
  const params  = useParams()
  const tid     = params.tid as string
  const supabase = createClient()

  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [name, setName]           = useState('')
  const [accent, setAccent]       = useState('#00e5ff')
  const [format, setFormat]       = useState<'individual' | 'team'>('individual')
  const [saving, setSaving]       = useState(false)
  const [saved, setSaved]         = useState(false)
  const [error, setError]         = useState<string | null>(null)

  useEffect(() => {
    supabase.from('tournaments').select('*').eq('id', tid).single().then(({ data }) => {
      if (!data) return
      setTournament(data as Tournament)
      setName(data.name)
      setAccent(data.theme_color ?? '#00e5ff')
      setFormat((data.settings as Record<string, string>)?.format as 'individual' | 'team' ?? 'individual')
    })
  }, [tid])

  async function save() {
    setSaving(true); setError(null)
    const { error: err } = await supabase.from('tournaments')
      .update({ name, theme_color: accent, settings: { format } }).eq('id', tid)
    setSaving(false)
    if (err) { setError(err.message); return }
    setSaved(true); setTimeout(() => setSaved(false), 2000)
  }

  const themeVars = buildThemeVars(accent)

  if (!tournament) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
      <div style={{ color: '#475569', fontSize: 13, letterSpacing: '0.2em' }}>LOADING...</div>
    </div>
  )

  return (
    <div style={{ maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 24, ...themeVars }}>
      <h1 style={{ color: '#f1f5f9', fontWeight: 900, fontSize: 20, letterSpacing: '0.05em', margin: 0 }}>
        大会設定
      </h1>

      {/* 大会名 */}
      <Field label="大会名">
        <input
          type="text" value={name} onChange={e => setName(e.target.value)}
          style={{
            width: '100%', padding: '10px 14px', boxSizing: 'border-box',
            background: 'rgba(5,8,20,0.8)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#f1f5f9', fontSize: 16, fontWeight: 700,
            outline: 'none',
            clipPath: 'polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)',
            fontFamily: 'inherit',
          }}
          onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
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
              letterSpacing: '0.05em',
              transition: 'all 0.15s',
              fontFamily: 'inherit',
            }}>
              {f === 'individual' ? '個人戦' : '団体戦'}
            </button>
          ))}
        </div>
      </Field>

      {/* テーマカラー */}
      <Field label="テーマカラー">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* プリセット */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {PRESET_COLORS.map(c => (
              <button key={c} onClick={() => setAccent(c)} style={{
                width: 36, height: 36, background: c, border: 'none', cursor: 'pointer',
                clipPath: 'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)',
                outline: accent === c ? `2px solid ${c}` : 'none',
                outlineOffset: 3,
                boxShadow: accent === c ? `0 0 12px ${c}` : 'none',
                transform: accent === c ? 'scale(1.15)' : 'scale(1)',
                transition: 'all 0.15s',
              }} />
            ))}
            {/* カスタムカラーピッカー */}
            <label style={{
              width: 36, height: 36, cursor: 'pointer', position: 'relative',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.15)',
              clipPath: 'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)',
              fontSize: 18,
            }}>
              🎨
              <input type="color" value={accent} onChange={e => setAccent(e.target.value)}
                style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }} />
            </label>
          </div>

          {/* プレビュー */}
          <div style={{
            padding: '12px 16px',
            background: 'rgba(5,8,20,0.9)',
            border: `1px solid var(--accent-border)`,
            boxShadow: `0 0 16px var(--accent-glow)`,
            clipPath: 'polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)',
            display: 'flex', alignItems: 'center', gap: 12,
            position: 'relative',
          }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: 'var(--accent)', boxShadow: '0 0 8px var(--accent)' }} />
            <div style={{ paddingLeft: 8 }}>
              <div style={{ color: 'var(--accent)', fontSize: 10, letterSpacing: '0.2em', opacity: 0.8 }}>PREVIEW</div>
              <div style={{ color: '#f1f5f9', fontWeight: 900, fontSize: 16 }}>{name || tournament.name}</div>
            </div>
            <div style={{
              marginLeft: 'auto',
              color: 'var(--accent)', fontSize: 10, fontWeight: 700,
              padding: '2px 10px',
              border: '1px solid var(--accent-border)',
              background: 'var(--accent-dim)',
              clipPath: 'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)',
              letterSpacing: '0.1em',
            }}>{accent.toUpperCase()}</div>
          </div>
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
          style={{
            padding: '8px 12px',
            background: 'rgba(5,8,20,0.8)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#f1f5f9', fontSize: 13,
            outline: 'none', cursor: 'pointer',
            clipPath: 'polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)',
            fontFamily: 'inherit',
          }}>
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
        boxShadow: `0 0 16px var(--accent-glow)`,
        transition: 'all 0.2s',
        fontFamily: 'inherit',
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
