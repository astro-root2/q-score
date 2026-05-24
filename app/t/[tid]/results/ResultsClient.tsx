'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils/cn'
import { Trophy, Download, BarChart2 } from 'lucide-react'
import Papa from 'papaparse'

interface Participant { id: string; name: string; ruby: string | null; team_id: string | null }
interface Match { id: string; round_id: string; status: string; game_state: unknown }
interface Round { id: string; name: string; order_index: number }
interface GameEvent { match_id: string; event_type: string; actor_id: string | null; undone: boolean }

interface PlayerStats {
  id: string
  name: string
  ruby: string | null
  team: string | null
  totalCorrect: number
  totalWrong: number
  wins: number
  matches: number
  winRate: number
}

interface Props {
  tournament: { id: string; name: string }
  rounds: Round[]
  matches: Match[]
  participants: Participant[]
  events: GameEvent[]
}

export default function ResultsClient({ tournament, participants, matches, events }: Props) {
  const stats = useMemo<PlayerStats[]>(() => {
    return participants.map(p => {
      const myEvents = events.filter(e => e.actor_id === p.id)
      const correct = myEvents.filter(e => e.event_type === 'CORRECT').length
      const wrong = myEvents.filter(e => e.event_type === 'WRONG').length

      let wins = 0
      for (const m of matches) {
        const gs = m.game_state as { players?: Array<{ id: string; status: string }> } | null
        if (!gs?.players) continue
        const player = gs.players.find(pl => pl.id === p.id)
        if (player?.status === 'winner') wins++
      }

      const myMatches = matches.filter(m => {
        const gs = m.game_state as { players?: Array<{ id: string }> } | null
        return gs?.players?.some(pl => pl.id === p.id) ?? false
      }).length

      return {
        id: p.id,
        name: p.name,
        ruby: p.ruby,
        team: p.team_id,
        totalCorrect: correct,
        totalWrong: wrong,
        wins,
        matches: myMatches,
        winRate: myMatches > 0 ? Math.round((wins / myMatches) * 100) : 0,
      }
    }).sort((a, b) => b.wins - a.wins || b.totalCorrect - a.totalCorrect)
  }, [participants, events, matches])

  const exportCSV = () => {
    const rows = stats.map((s, i) => ({
      rank: i + 1,
      name: s.name,
      ruby: s.ruby ?? '',
      team: s.team ?? '',
      correct: s.totalCorrect,
      wrong: s.totalWrong,
      wins: s.wins,
      matches: s.matches,
      win_rate: `${s.winRate}%`,
    }))
    const csv = Papa.unparse(rows)
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `results_${tournament.id}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const totalEvents = events.length
  const totalCorrect = events.filter(e => e.event_type === 'CORRECT').length
  const totalWrong = events.filter(e => e.event_type === 'WRONG').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <BarChart2 size={20} className="text-yellow-400" />
          <h1 className="text-xl font-bold text-white">結果・統計</h1>
        </div>
        <button onClick={exportCSV}
          className="flex items-center gap-1.5 px-4 py-2 text-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg transition-colors">
          <Download size={14} /> CSV エクスポート
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: '総イベント数', value: totalEvents, color: '' },
          { label: '正解数', value: totalCorrect, color: 'text-emerald-400' },
          { label: '誤答数', value: totalWrong, color: 'text-red-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 text-center">
            <div className={cn('text-3xl font-bold', color || 'text-white')}>{value}</div>
            <div className="text-xs text-zinc-500 mt-1">{label}</div>
          </div>
        ))}
      </div>

      <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2">
          <Trophy size={16} className="text-yellow-400" />
          <span className="font-bold text-white">順位表</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/50">
                <th className="px-4 py-2 text-left text-zinc-400 w-12">順位</th>
                <th className="px-4 py-2 text-left text-zinc-400">名前</th>
                <th className="px-4 py-2 text-center text-zinc-400">チーム</th>
                <th className="px-4 py-2 text-center text-zinc-400">正解</th>
                <th className="px-4 py-2 text-center text-zinc-400">誤答</th>
                <th className="px-4 py-2 text-center text-zinc-400">勝利</th>
                <th className="px-4 py-2 text-center text-zinc-400">試合</th>
                <th className="px-4 py-2 text-center text-zinc-400">勝率</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((s, i) => (
                <tr key={s.id} className={cn(
                  'border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors',
                  i === 0 && 'bg-yellow-900/10',
                  i === 1 && 'bg-zinc-400/5',
                  i === 2 && 'bg-amber-900/10',
                )}>
                  <td className="px-4 py-2">
                    <span className={cn('font-bold text-lg',
                      i === 0 ? 'text-yellow-400' :
                      i === 1 ? 'text-zinc-300' :
                      i === 2 ? 'text-amber-600' : 'text-zinc-500')}>
                      {i + 1}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <div className="font-medium text-white">{s.name}</div>
                    {s.ruby && <div className="text-xs text-zinc-500">{s.ruby}</div>}
                  </td>
                  <td className="px-4 py-2 text-center text-zinc-400 text-xs">{s.team ?? '—'}</td>
                  <td className="px-4 py-2 text-center font-bold text-emerald-400">{s.totalCorrect}</td>
                  <td className="px-4 py-2 text-center font-bold text-red-400">{s.totalWrong}</td>
                  <td className="px-4 py-2 text-center font-bold text-white">{s.wins}</td>
                  <td className="px-4 py-2 text-center text-zinc-400">{s.matches}</td>
                  <td className="px-4 py-2 text-center">
                    <span className={cn('font-bold',
                      s.winRate >= 70 ? 'text-emerald-400' :
                      s.winRate >= 40 ? 'text-yellow-400' : 'text-zinc-400')}>
                      {s.winRate}%
                    </span>
                  </td>
                </tr>
              ))}
              {stats.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-zinc-500">
                    データがありません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
