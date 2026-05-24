'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils/cn'
import { Check, AlertCircle } from 'lucide-react'

const THEME_COLORS = ['#2d4fff','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#ec4899']

interface Tournament { id: string; name: string; theme_color: string; status: string; settings: Record<string, string> }

export default function SetupPage() {
  const params = useParams()
  const tid = params.tid as string
  const supabase = createClient()
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [name, setName] = useState('')
  const [themeColor, setThemeColor] = useState('#2d4fff')
  const [format, setFormat] = useState<'individual' | 'team'>('individual')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase.from('tournaments').select('*').eq('id', tid).single().then(({ data }) => {
      if (!data) return
      setTournament(data as Tournament)
      setName(data.name)
      setThemeColor(data.theme_color)
      setFormat((data.settings as Record<string,string>)?.format as 'individual' | 'team' ?? 'individual')
    })
  }, [tid])

  async function save() {
    setSaving(true); setError(null)
    const { error: err } = await supabase.from('tournaments')
      .update({ name, theme_color: themeColor, settings: { format } }).eq('id', tid)
    setSaving(false)
    if (err) { setError(err.message); return }
    setSaved(true); setTimeout(() => setSaved(false), 2000)
  }

  if (!tournament) return (
    <div className="flex items-center justify-center h-48">
      <div className="w-8 h-8 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="max-w-xl space-y-8">
      <h1 className="text-xl font-bold text-white">大会設定</h1>
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">大会名</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-lg placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-400/50 focus:border-brand-400 transition-colors" />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">形式</label>
          <div className="grid grid-cols-2 gap-3">
            {(['individual', 'team'] as const).map(f => (
              <button key={f} type="button" onClick={() => setFormat(f)}
                className={cn('py-3 px-4 rounded-lg border-2 font-semibold transition-all',
                  format === f ? 'border-brand-400 bg-brand-950 text-brand-300' : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600')}>
                {f === 'individual' ? '個人戦' : '団体戦'}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">テーマカラー</label>
          <div className="flex gap-3 flex-wrap">
            {THEME_COLORS.map(c => (
              <button key={c} type="button" onClick={() => setThemeColor(c)}
                className={cn('w-10 h-10 rounded-full transition-all',
                  themeColor === c ? 'ring-2 ring-offset-2 ring-offset-zinc-900 ring-white scale-110' : 'hover:scale-105')}
                style={{ backgroundColor: c }} />
            ))}
            <input type="color" value={themeColor} onChange={e => setThemeColor(e.target.value)}
              className="w-10 h-10 rounded-full cursor-pointer bg-transparent border-2 border-zinc-600" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">大会ステータス</label>
          <select defaultValue={tournament.status}
            onChange={async (e) => {
              await supabase.from('tournaments').update({ status: e.target.value }).eq('id', tid)
              setSaved(true); setTimeout(() => setSaved(false), 1500)
            }}
            className="px-3 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm focus:outline-none focus:ring-1 focus:ring-brand-400/50">
            <option value="draft">準備中</option>
            <option value="active">開催中</option>
            <option value="completed">終了</option>
            <option value="archived">アーカイブ</option>
          </select>
        </div>
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
            <AlertCircle size={15} />{error}
          </div>
        )}
        <button onClick={save} disabled={saving}
          className="flex items-center gap-2 px-6 py-3 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-bold transition-colors disabled:opacity-50">
          {saved ? <><Check size={16} />保存しました</> : saving ? '保存中...' : '設定を保存'}
        </button>
      </div>
    </div>
  )
}
