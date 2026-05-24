'use client'

import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils/cn'
import { Trophy, Download, CheckCircle2, AlertCircle } from 'lucide-react'
import Papa from 'papaparse'

interface Participant {
  id: string; name: string; ruby: string | null
  affiliation: string | null; paper_rank: number | null; final_rank: number | null
}
interface Match {
  id: string; round_id: string; match_num: number; name: string | null
  status: string; game_state: unknown
}
interface Round { id: string; name: string; order_index: number }
interface GameEvent { match_id: string; event_type: string; actor_id: string | null; undone: boolean }

interface PlayerStats {
  id: string; name: string; ruby: string | null; affiliation: string | null
  paper_rank: number | null; final_rank: number | null
  totalCorrect: number; totalWrong: number; wins: number; matches: number
}

interface Props {
  tournament: { id: string; name: string }
  rounds: Round[]
  matches: Match[]
  participants: Participant[]
  events: GameEvent[]
}

type Tab = 'overall' | 'rounds'

export default function ResultsClient({ tournament, rounds, matches, participants, events }: Props) {
  const supabase = createClient()
  const [tab, setTab] = useState<Tab>('overall')
  const [confirming, setConfirming] = useState(false)
  const [confirmed, setConfirmed] = useState(
    participants.every(p => p.final_rank != null) && participants.length > 0
  )
  const [msg, setMsg] = useState<string | null>(null)

  const stats = useMemo<PlayerStats[]>(() => {
    return participants.map(p => {
      const myEvents = events.filter(e => e.actor_id === p.id)
      const correct = myEvents.filter(e => e.event_type === 'CORRECT').length
      const wrong   = myEvents.filter(e => e.event_type === 'WRONG').length

      let wins = 0
      let myMatches = 0
      for (const m of matches) {
        const gs = m.game_state as { players?: Array<{ id: string; status: string }> } | null
        if (!gs?.players) continue
        const player = gs.players.find(pl => pl.id === p.id)
        if (!player) continue
        myMatches++
        if (player.status === 'winner') wins++
      }

      return {
        id: p.id, name: p.name, ruby: p.ruby, affiliation: p.affiliation,
        paper_rank: p.paper_rank, final_rank: p.final_rank,
        totalCorrect: correct, totalWrong: wrong, wins, matches: myMatches,
      }
    }).sort((a, b) =>
      b.wins - a.wins ||
      b.totalCorrect - a.totalCorrect ||
      a.totalWrong - b.totalWrong
    )
  }, [participants, events, matches])

  const confirmRanks = async () => {
    setConfirming(true)
    setMsg(null)
    try {
      for (let i = 0; i < stats.length; i++) {
        const { error } = await supabase
          .from('participants')
          .update({ final_rank: i + 1 })
          .eq('id', stats[i].id)
        if (error) throw error
      }
      setConfirmed(true)
      setMsg('最終順位を確定しました')
    } catch (e: unknown) {
      setMsg(`エラー: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setConfirming(false)
    }
  }

  const exportCSV = () => {
    const rows = stats.map((s, i) => ({
      最終順位: i + 1,
      名前: s.name,
      よみ: s.ruby ?? '',
      所属: s.affiliation ?? '',
      正解数: s.totalCorrect,
      誤答数: s.totalWrong,
      勝利数: s.wins,
      出場数: s.matches,
      ペーパー順位: s.paper_rank ?? '',
    }))
    const csv = Papa.unparse(rows)
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `results_${tournament.id}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  // ラウンド別データ
  const roundsWithMatches = rounds.map(r => ({
    ...r,
    matches: matches
      .filter(m => m.round_id === r.id)
      .sort((a, b) => a.match_num - b.match_num)
      .map(m => {
        const gs = m.game_state as {
          players?: Array<{
            id: string; name: string; status: string
            correct: number; wrong: number; points: number
          }>
          questionNumber?: number
        } | null
        return { ...m, players: gs?.players ?? [], questionCount: gs?.questionNumber ?? 0 }
      }),
  }))

  const totalCorrect = events.filter(e => e.event_type === 'CORRECT').length
  const totalWrong   = events.filter(e => e.event_type === 'WRONG').length
  const completedMatches = matches.filter(m => m.status === 'completed').length

  return (
    <div className="space-y-5">
      {/* ヘッダー */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Trophy size={20} className="text-yellow-400" />
          <h1 className="text-xl font-bold text-white">結果・統計</h1>
          {confirmed && (
            <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-900/30 px-2 py-0.5 rounded-full">
              <CheckCircle2 size={11} /> 順位確定済み
            </span>
          )}
        </div>
        <button onClick={exportCSV}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg transition-colors">
          <Download size={13} /> CSVエクスポート
        </button>
      </div>

      {/* サマリー */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: '完了試合', value: `${completedMatches}/${matches.length}`, color: 'text-white' },
          { label: '総正解数', value: totalCorrect, color: 'text-emerald-400' },
          { label: '総誤答数', value: totalWrong,   color: 'text-red-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 text-center">
            <div className={cn('text-3xl font-bold tabular-nums', color)}>{value}</div>
            <div className="text-xs text-zinc-500 mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* タブ */}
      <div className="flex border-b border-zinc-800 gap-1">
        {([['overall', '総合順位'], ['rounds', 'ラウンド別']] as [Tab, string][]).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              tab === id ? 'text-white border-blue-500' : 'text-zinc-500 border-transparent hover:text-zinc-300'
            )}>
            {label}
          </button>
        ))}
      </div>

      {/* 総合順位 */}
      {tab === 'overall' && (
        <div className="space-y-3">
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-950 text-zinc-500 text-xs">
                  <th className="px-4 py-2.5 text-left w-12">順位</th>
                  <th className="px-4 py-2.5 text-left">名前</th>
                  <th className="px-4 py-2.5 text-center">正解</th>
                  <th className="px-4 py-2.5 text-center">誤答</th>
                  <th className="px-4 py-2.5 text-center">勝利</th>
                  <th className="px-4 py-2.5 text-center">出場</th>
                  <th className="px-4 py-2.5 text-center">ペーパー</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((s, i) => (
                  <tr key={s.id} className={cn(
                    'border-b border-zinc-800/50 transition-colors',
                    i === 0 && 'bg-yellow-900/10',
                    i === 1 && 'bg-zinc-400/5',
                    i === 2 && 'bg-amber-900/10',
                  )}>
                    <td className="px-4 py-2.5">
                      <span className={cn('font-black text-lg',
                        i === 0 ? 'text-yellow-400' :
                        i === 1 ? 'text-zinc-300' :
                        i === 2 ? 'text-amber-600' : 'text-zinc-600')}>
                        {i + 1}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-white">{s.name}</div>
                      {s.ruby && <div className="text-xs text-zinc-500">{s.ruby}</div>}
                      {s.affiliation && <div className="text-xs text-zinc-600">{s.affiliation}</div>}
                    </td>
                    <td className="px-4 py-2.5 text-center font-bold text-emerald-400">{s.totalCorrect}</td>
                    <td className="px-4 py-2.5 text-center font-bold text-red-400">{s.totalWrong}</td>
                    <td className="px-4 py-2.5 text-center font-bold text-white">{s.wins}</td>
                    <td className="px-4 py-2.5 text-center text-zinc-400">{s.matches}</td>
                    <td className="px-4 py-2.5 text-center text-zinc-500">
                      {s.paper_rank != null ? `#${s.paper_rank}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 確定ボタン */}
          <div className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-4">
            <div>
              <div className="text-sm font-semibold text-zinc-200">最終順位の確定</div>
              <div className="text-xs text-zinc-500 mt-0.5">
                上記の順位をDBに保存します。確定後もCSVエクスポート可能です。
              </div>
              {msg && (
                <div className={cn('flex items-center gap-1 text-xs mt-1.5',
                  msg.startsWith('エラー') ? 'text-red-400' : 'text-emerald-400')}>
                  {msg.startsWith('エラー') ? <AlertCircle size={11} /> : <CheckCircle2 size={11} />}
                  {msg}
                </div>
              )}
            </div>
            <button
              onClick={confirmRanks}
              disabled={confirming || stats.length === 0}
              className={cn(
                'flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all',
                confirmed
                  ? 'bg-emerald-800 text-emerald-300'
                  : 'bg-yellow-600 hover:bg-yellow-500 text-white',
                (confirming || stats.length === 0) && 'opacity-50 cursor-not-allowed'
              )}>
              {confirming ? '保存中...' : confirmed ? '✓ 確定済み（再確定）' : '最終順位を確定する'}
            </button>
          </div>
        </div>
      )}

      {/* ラウンド別 */}
      {tab === 'rounds' && (
        <div className="space-y-4">
          {roundsWithMatches.map(r => (
            <div key={r.id} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-950">
                <span className="font-bold text-white">{r.name}</span>
                <span className="text-zinc-600 text-xs ml-2">{r.matches.length}試合</span>
              </div>
              <div className="divide-y divide-zinc-800">
                {r.matches.length === 0 && (
                  <p className="text-zinc-600 text-sm px-4 py-3">試合なし</p>
                )}
                {r.matches.map(m => (
                  <div key={m.id} className="px-4 py-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white text-sm">
                        {m.name ?? `第${m.match_num}試合`}
                      </span>
                      <span className={cn('text-xs px-2 py-0.5 rounded-full',
                        m.status === 'completed' ? 'text-blue-300 bg-blue-900/30' :
                        m.status === 'active'    ? 'text-emerald-300 bg-emerald-900/30' :
                        'text-zinc-500 bg-zinc-800')}>
                        {m.status === 'completed' ? '終了' : m.status === 'active' ? '進行中' : '待機中'}
                      </span>
                      {m.questionCount > 0 && (
                        <span className="text-zinc-600 text-xs">Q{m.questionCount}まで</span>
                      )}
                    </div>
                    {m.players.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {[...m.players]
                          .sort((a, b) =>
                            a.status === 'winner' ? -1 : b.status === 'winner' ? 1 :
                            a.status === 'eliminated' ? 1 : b.status === 'eliminated' ? -1 : 0
                          )
                          .map(p => (
                            <div key={p.id} className={cn(
                              'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs',
                              p.status === 'winner'   ? 'bg-emerald-900/40 border border-emerald-700/50 text-emerald-300' :
                              p.status === 'eliminated' ? 'bg-red-900/20 border border-red-900/30 text-red-400' :
                              'bg-zinc-800 border border-zinc-700 text-zinc-300'
                            )}>
                              {p.status === 'winner' && <span>✓</span>}
                              <span className="font-medium">{p.name}</span>
                              <span className="text-xs opacity-60">
                                {p.correct}○{p.wrong}✕
                              </span>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
