import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Monitor, Radio, Play, Circle } from 'lucide-react'
import { RuleRegistry } from '@/lib/engine/rules'

interface Props { params: Promise<{ tid: string }> }

export default async function MatchesPage({ params }: Props) {
  const { tid } = await params
  const supabase = await createClient()
  const { data: tournament } = await supabase.from('tournaments').select('*').eq('id', tid).single()
  if (!tournament) notFound()
  const { data: rounds } = await supabase
    .from('rounds').select('*, matches(*)').eq('tournament_id', tid).order('order_index')

  const allMatches = (rounds ?? []).flatMap(round =>
    ((round.matches ?? []) as Array<{
      id: string; match_num: number; name: string | null
      status: string; display_token: string; obs_token: string
    }>).map(m => ({ ...m, roundName: round.name, ruleName: RuleRegistry.find(round.rule_id)?.name ?? round.rule_id }))
  )

  const active = allMatches.filter(m => m.status === 'active')
  const others = allMatches.filter(m => m.status !== 'active')

  const MatchCard = ({ m }: { m: typeof allMatches[0] }) => (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Circle size={10} className={m.status === 'active' ? 'fill-green-400 text-green-400 animate-pulse' : m.status === 'completed' ? 'fill-blue-400 text-blue-400' : 'fill-zinc-600 text-zinc-600'} />
        <span className="font-bold text-white">{m.name ?? `第${m.match_num}試合`}</span>
        <span className="text-xs text-zinc-500">{m.roundName}</span>
        <span className="text-xs text-zinc-600 bg-zinc-800 px-2 py-0.5 rounded">{m.ruleName}</span>
      </div>
      <div className="flex gap-2 flex-wrap">
        <a href={`/screen/${m.display_token}`} target="_blank"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition-colors">
          <Monitor size={15} /> 会場スクリーン
        </a>
        <a href={`/obs/${m.obs_token}`} target="_blank"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white text-sm transition-colors">
          <Radio size={15} /> OBS
        </a>
        <Link href={`/t/${tid}/match/${m.id}`}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-sm transition-colors">
          <Play size={15} /> 操作卓
        </Link>
      </div>
    </div>
  )

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <h1 className="text-xl font-bold text-white">試合・スクリーン</h1>

      {active.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-green-400 uppercase tracking-wide">進行中</h2>
          {active.map(m => <MatchCard key={m.id} m={m} />)}
        </section>
      )}

      {others.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide">その他の試合</h2>
          {others.map(m => <MatchCard key={m.id} m={m} />)}
        </section>
      )}

      {allMatches.length === 0 && (
        <div className="text-center py-16 border-2 border-dashed border-zinc-800 rounded-xl">
          <p className="text-zinc-500 text-sm">試合がありません</p>
          <Link href={`/t/${tid}/setup/rounds`} className="text-blue-400 hover:text-blue-300 text-sm underline mt-2 block">
            ラウンドを作成する
          </Link>
        </div>
      )}
    </div>
  )
}
