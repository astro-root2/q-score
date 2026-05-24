import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Play, Plus, Monitor, Radio } from 'lucide-react'

interface Props { params: Promise<{ tid: string }> }

export default async function TournamentDashboard({ params }: Props) {
  const { tid } = await params
  const supabase = await createClient()

  const { data: tournament } = await supabase.from('tournaments').select('*').eq('id', tid).single()
  if (!tournament) notFound()

  const { data: rounds } = await supabase
    .from('rounds').select('*, matches(*)').eq('tournament_id', tid).order('order_num')

  const { data: participants } = await supabase
    .from('participants').select('id').eq('tournament_id', tid).eq('status', 'active')

  return (
    <div className="space-y-8">
      <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800">
        <div className="h-1.5 rounded-full mb-4 w-24" style={{ backgroundColor: tournament.theme_color }} />
        <h1 className="text-2xl font-black text-white mb-1">{tournament.name}</h1>
        <p className="text-zinc-400 text-sm">
          参加者 {participants?.length ?? 0}名 ・
          {(tournament.settings as Record<string, string>)?.format === 'team' ? '団体戦' : '個人戦'}
        </p>
        <div className="flex gap-3 mt-4 flex-wrap">
          <Link href={`/t/${tid}/setup/participants`} className="text-sm text-zinc-400 hover:text-white underline">参加者を管理</Link>
          <Link href={`/t/${tid}/setup/rounds`} className="text-sm text-zinc-400 hover:text-white underline">ラウンドを追加</Link>
          <Link href={`/t/${tid}/questions`} className="text-sm text-zinc-400 hover:text-white underline">問題を管理</Link>
          <Link href={`/t/${tid}/results`} className="text-sm text-zinc-400 hover:text-white underline">結果・統計</Link>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">ラウンド & 試合</h2>
          <Link href={`/t/${tid}/setup/rounds`}
            className="flex items-center gap-1.5 text-sm text-brand-400 hover:text-brand-300">
            <Plus size={14} /> ラウンド追加
          </Link>
        </div>

        {!rounds || rounds.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-zinc-800 rounded-xl">
            <p className="text-zinc-500 text-sm mb-3">ラウンドがありません</p>
            <Link href={`/t/${tid}/setup/rounds`} className="text-brand-400 hover:text-brand-300 text-sm underline">
              ラウンドを作成する
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {rounds.map(round => (
              <div key={round.id} className="space-y-2">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-white">{round.name}</h3>
                  <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded">{round.rule_id}</span>
                </div>
                <div className="grid gap-2">
                  {(round.matches as Array<{
                    id: string; match_num: number; name: string | null
                    status: string; display_token: string; obs_token: string
                  }>).map(match => (
                    <div key={match.id}
                      className="flex items-center justify-between p-4 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${
                          match.status === 'active' ? 'bg-green-400 animate-pulse' :
                          match.status === 'completed' ? 'bg-blue-400' : 'bg-zinc-600'}`} />
                        <span className="font-medium text-white">{match.name ?? `第${match.match_num}試合`}</span>
                        <span className="text-xs text-zinc-500">
                          {match.status === 'active' ? '進行中' : match.status === 'completed' ? '終了' : '待機中'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <a href={`/obs/${match.obs_token}`} target="_blank"
                          className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors" title="OBS配信画面">
                          <Radio size={15} />
                        </a>
                        <a href={`/screen/${match.display_token}`} target="_blank"
                          className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors" title="会場スクリーン">
                          <Monitor size={15} />
                        </a>
                        <Link href={`/t/${tid}/match/${match.id}`}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold transition-colors">
                          <Play size={14} />操作卓
                        </Link>
                      </div>
                    </div>
                  ))}
                  <CreateMatchButton roundId={round.id} tournamentId={tid} matchNum={(round.matches?.length ?? 0) + 1} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function CreateMatchButton({ roundId, tournamentId, matchNum }: {
  roundId: string; tournamentId: string; matchNum: number
}) {
  return (
    <form action={`/api/tournaments/${tournamentId}/matches`} method="post">
      <input type="hidden" name="round_id" value={roundId} />
      <input type="hidden" name="match_num" value={matchNum} />
      <button type="submit"
        className="w-full p-3 rounded-xl border-2 border-dashed border-zinc-700 hover:border-zinc-600 text-zinc-500 hover:text-zinc-400 text-sm transition-colors flex items-center justify-center gap-2">
        <Plus size={14} /> 試合を追加
      </button>
    </form>
  )
}
