import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, Trophy, Users, Play } from 'lucide-react'

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  draft:     { label: '準備中', color: 'text-zinc-400' },
  active:    { label: '開催中', color: 'text-green-400' },
  completed: { label: '終了', color: 'text-blue-400' },
  archived:  { label: 'アーカイブ', color: 'text-zinc-600' },
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
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">大会一覧</h1>
          <p className="text-zinc-400 text-sm mt-1">{tournaments?.length ?? 0} 件の大会</p>
        </div>
        <Link href="/new"
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-semibold transition-colors text-sm">
          <Plus size={16} />新規大会作成
        </Link>
      </div>

      {!tournaments || tournaments.length === 0 ? (
        <div className="text-center py-24 border-2 border-dashed border-zinc-700 rounded-2xl">
          <Trophy size={48} className="mx-auto text-zinc-600 mb-4" />
          <h2 className="text-lg font-semibold text-zinc-400 mb-2">大会がありません</h2>
          <p className="text-zinc-500 text-sm mb-6">最初の大会を作成してみましょう</p>
          <Link href="/new"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-semibold transition-colors">
            <Plus size={18} />大会を作成
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tournaments.map(t => {
            const statusInfo = STATUS_LABEL[t.status] ?? STATUS_LABEL.draft
            const participantCount = (t.participants as unknown as [{ count: number }])[0]?.count ?? 0
            const roundCount = (t.rounds as unknown as [{ count: number }])[0]?.count ?? 0
            return (
              <Link key={t.id} href={`/t/${t.id}`}
                className="group block p-5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/50 transition-all">
                <div className="w-full h-1 rounded-full mb-4" style={{ backgroundColor: t.theme_color }} />
                <div className="flex items-start justify-between mb-3">
                  <h2 className="font-bold text-white text-lg leading-tight group-hover:text-brand-300 transition-colors line-clamp-2">
                    {t.name}
                  </h2>
                  <span className={`text-xs font-semibold shrink-0 ml-2 ${statusInfo.color}`}>
                    {statusInfo.label}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-zinc-500">
                  <span className="flex items-center gap-1"><Users size={13} />{participantCount}人</span>
                  <span className="flex items-center gap-1"><Play size={13} />{roundCount}ラウンド</span>
                </div>
                <p className="text-xs text-zinc-600 mt-3">
                  {new Date(t.created_at).toLocaleDateString('ja-JP')}
                </p>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
