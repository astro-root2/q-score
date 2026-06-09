// @ts-nocheck
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils/cn'

const THEME_COLORS = [
  '#2d4fff', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#06b6d4', '#f97316', '#ec4899',
]

export default function NewTournamentPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [themeColor, setThemeColor] = useState('#2d4fff')
  const [format, setFormat] = useState<'individual' | 'team'>('individual')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('大会名を入力してください'); return }
    setLoading(true); setError(null)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data, error: err } = await (supabase as any)
      .from('tournaments')
      .insert({ owner_id: user.id, name: name.trim(), theme_color: themeColor, status: 'draft', settings: { format } })
      .select('id').single()
    if (err || !data) { setError(err?.message ?? '作成に失敗しました'); setLoading(false); return }
    router.push(`/t/${data.id}/setup/participants`)
  }

  return (
    <div className="max-w-xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <Link href="/" className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-bold text-white">新規大会作成</h1>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">大会名 *</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} required maxLength={100}
            className="w-full px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-lg placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-400/50 focus:border-brand-400 transition-colors"
            placeholder="第○回 ○○クイズ大会" />
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
          <div className="mt-3 p-3 rounded-lg border border-zinc-700 bg-zinc-900">
            <div className="h-1 rounded-full mb-2" style={{ backgroundColor: themeColor }} />
            <p className="text-sm font-semibold" style={{ color: themeColor }}>{name || '大会名のプレビュー'}</p>
          </div>
        </div>
        {error && (
          <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
        )}
        <button type="submit" disabled={loading}
          className="w-full py-3 rounded-lg font-bold text-white bg-brand-600 hover:bg-brand-500 transition-colors disabled:opacity-50 text-lg">
          {loading ? '作成中...' : '大会を作成して参加者設定へ →'}
        </button>
      </form>
    </div>
  )
}
