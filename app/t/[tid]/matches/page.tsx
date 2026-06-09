// @ts-nocheck
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Monitor, Radio, Play, Circle, Plus } from 'lucide-react'
import { RuleRegistry } from '@/lib/engine/rules'
import { GroupAssignClient } from './GroupAssignClient'

interface Props { params: Promise<{ tid: string }> }
interface RoundRow { id: string; name: string; rule_id: string; matches: MatchRow[] }
interface MatchRow { id: string; match_num: number; name: string | null; status: string; display_token: string; obs_token: string }
interface ParticipantRow { id: string; name: string; affiliation: string | null; paper_rank: number | null }
interface MpRow { match_id: string; participant_id: string }

export default async function MatchesPage({ params }: Props) {
  const { tid } = await params
  const supabase = await createClient()
  const { data: tournament } = await (supabase as any).from('tournaments').select('*').eq('id', tid).single()
  if (!tournament) notFound()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data: rawRounds } = await db.from('rounds').select('*, matches(*)').eq('tournament_id', tid).order('order_index')
  const rounds = (rawRounds ?? []) as RoundRow[]

  const { data: rawParticipants } = await db.from('participants')
    .select('id,name,affiliation,paper_rank,status')
    .eq('tournament_id', tid).eq('status', 'active')
    .order('paper_rank', { ascending: true, nullsFirst: false })
  const participants = (rawParticipants ?? []) as ParticipantRow[]

  const allMatchIds = rounds.flatMap(r => (r.matches ?? []).map(m => m.id))
  const { data: rawMps } = allMatchIds.length
    ? await db.from('match_participants').select('match_id,participant_id').in('match_id', allMatchIds)
    : { data: [] }
  const mps = (rawMps ?? []) as MpRow[]

  const activeMatches = rounds.flatMap(r =>
    (r.matches ?? []).filter(m => m.status === 'active').map(m => ({ ...m, roundName: r.name, ruleName: RuleRegistry.find(r.rule_id)?.name ?? r.rule_id }))
  )

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <h1 className="text-xl font-bold text-white">試合 / グループ管理</h1>

      {activeMatches.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-green-400 uppercase tracking-wide">進行中</h2>
          {activeMatches.map(m => <MatchCard key={m.id} m={m} tid={tid} />)}
        </section>
      )}

      {rounds.map(round => (
        <section key={round.id} className="space-y-3">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-bold text-white">{round.name}</h2>
            <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded">
              {RuleRegistry.find(round.rule_id)?.name ?? round.rule_id}
            </span>
          </div>
          {(round.matches ?? []).map(m => (
            <div key={m.id} className="space-y-1">
              <MatchCard m={{ ...m, roundName: round.name, ruleName: RuleRegistry.find(round.rule_id)?.name ?? round.rule_id }} tid={tid} />
              <GroupAssignClient
                matchId={m.id}
                participants={participants}
                initialAssigned={mps.filter(mp => mp.match_id === m.id).map(mp => mp.participant_id)}
              />
            </div>
          ))}
          <CreateMatchButton roundId={round.id} tournamentId={tid} matchNum={(round.matches ?? []).length + 1} />
        </section>
      ))}

      {rounds.length === 0 && (
        <div className="text-center py-16 border-2 border-dashed border-zinc-800 rounded-xl">
          <p className="text-zinc-500 text-sm">ラウンドがありません</p>
          <Link href={`/t/${tid}/setup/rounds`} className="text-blue-400 hover:text-blue-300 text-sm underline mt-2 block">
            ラウンドを作成する
          </Link>
        </div>
      )}
    </div>
  )
}

function MatchCard({ m, tid }: {
  m: { id: string; match_num: number; name: string | null; status: string; display_token: string; obs_token: string; roundName: string; ruleName: string }
  tid: string
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
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
}

function CreateMatchButton({ roundId, tournamentId, matchNum }: { roundId: string; tournamentId: string; matchNum: number }) {
  return (
    <form action={`/api/tournaments/${tournamentId}/matches`} method="post">
      <input type="hidden" name="round_id" value={roundId} />
      <input type="hidden" name="match_num" value={matchNum} />
      <button type="submit"
        className="w-full p-3 rounded-xl border-2 border-dashed border-zinc-700 hover:border-zinc-600 text-zinc-500 hover:text-zinc-400 text-sm transition-colors flex items-center justify-center gap-2">
        <Plus size={14} /> 試合（グループ）を追加
      </button>
    </form>
  )
}
