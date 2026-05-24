'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils/cn'
import Papa from 'papaparse'
import { Upload, ChevronUp, ChevronDown, Check } from 'lucide-react'

interface Participant { id: string; name: string; ruby: string; paper_rank: number | null }

interface CsvRow {
  no: number
  name: string
  ruby: string
  affiliation: string
  grade: string
  raw_score: number
  proximity_error: number | null
  chain1: number
  chain2: number
  chain3: number
}

const SORT_KEYS: { key: keyof CsvRow; label: string; asc: boolean }[] = [
  { key: 'raw_score',        label: '素点',       asc: false },
  { key: 'proximity_error',  label: '近似値誤差', asc: true  },
  { key: 'chain1',           label: '第1連答',    asc: false },
  { key: 'chain2',           label: '第2連答',    asc: false },
  { key: 'chain3',           label: '第3連答',    asc: false },
]

interface Props {
  tournamentId: string
  participants: Participant[]
}

export default function PaperClient({ tournamentId, participants }: Props) {
  const supabase = createClient()
  const [rows, setRows] = useState<CsvRow[]>([])
  const [priority, setPriority] = useState(SORT_KEYS.map(k => k.key))
  const [applied, setApplied] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const handleCSV = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data }) => {
        const parsed: CsvRow[] = data.map((r, i) => ({
          no:               Number(r['No'] ?? r['no'] ?? i + 1),
          name:             r['名前'] ?? r['name'] ?? '',
          ruby:             r['読み'] ?? r['ruby'] ?? '',
          affiliation:      r['所属機関'] ?? r['affiliation'] ?? '',
          grade:            r['学年'] ?? r['grade'] ?? '',
          raw_score:        Number(r['素点'] ?? r['raw_score'] ?? 0),
          proximity_error:  r['近似値誤差'] != null && r['近似値誤差'] !== '' ? Number(r['近似値誤差']) : null,
          chain1:           Number(r['第1連答'] ?? r['chain1'] ?? 0),
          chain2:           Number(r['第2連答'] ?? r['chain2'] ?? 0),
          chain3:           Number(r['第3連答'] ?? r['chain3'] ?? 0),
        }))
        setRows(parsed)
        setApplied(false)
        setMsg(`${parsed.length}件読み込みました`)
      },
    })
    e.target.value = ''
  }, [])

  const moveKey = (idx: number, dir: -1 | 1) => {
    const next = [...priority]
    const swap = idx + dir
    if (swap < 0 || swap >= next.length) return
    ;[next[idx], next[swap]] = [next[swap], next[idx]]
    setPriority(next)
    setApplied(false)
  }

  const ranked = [...rows].sort((a, b) => {
    for (const key of priority) {
      const def = SORT_KEYS.find(k => k.key === key)!
      const av = a[key] ?? (def.asc ? Infinity : -Infinity)
      const bv = b[key] ?? (def.asc ? Infinity : -Infinity)
      const diff = def.asc ? Number(av) - Number(bv) : Number(bv) - Number(av)
      if (diff !== 0) return diff
    }
    return 0
  })

  const applyRanks = async () => {
    let updated = 0
    for (let i = 0; i < ranked.length; i++) {
      const row = ranked[i]
      const p = participants.find(p => p.name === row.name || p.ruby === row.ruby)
      if (p) {
        await supabase.from('participants').update({ paper_rank: i + 1 }).eq('id', p.id)
        updated++
      }
    }
    setApplied(true)
    setMsg(`${updated}/${ranked.length}件の参加者に順位を反映しました`)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-white">ペーパークイズ</h1>

      {/* CSVアップロード */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3">
        <h2 className="text-sm font-semibold text-zinc-300">CSVアップロード</h2>
        <p className="text-xs text-zinc-500">
          形式: <code className="bg-zinc-800 px-1 rounded">No,名前,読み,所属機関,学年,素点,近似値誤差,第1連答,第2連答,第3連答</code>
        </p>
        <label className="flex items-center gap-2 w-fit px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold cursor-pointer transition-colors">
          <Upload size={15} /> CSVを選択
          <input type="file" accept=".csv" className="hidden" onChange={handleCSV} />
        </label>
        {msg && <p className="text-sm text-emerald-400">{msg}</p>}
      </div>

      {rows.length > 0 && (
        <>
          {/* 優先順位設定 */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3">
            <h2 className="text-sm font-semibold text-zinc-300">順位判定の優先順位</h2>
            <p className="text-xs text-zinc-500">上が高優先。矢印で並べ替えてください。</p>
            <div className="space-y-1">
              {priority.map((key, i) => {
                const def = SORT_KEYS.find(k => k.key === key)!
                return (
                  <div key={key} className="flex items-center gap-3 bg-zinc-800 rounded-lg px-3 py-2">
                    <span className="text-zinc-500 text-sm w-4">{i + 1}</span>
                    <span className="text-white text-sm flex-1">{def.label}</span>
                    <span className="text-zinc-600 text-xs">{def.asc ? '小さい順' : '大きい順'}</span>
                    <button onClick={() => moveKey(i, -1)} disabled={i === 0}
                      className="text-zinc-600 hover:text-white disabled:opacity-20 transition-colors">
                      <ChevronUp size={16} />
                    </button>
                    <button onClick={() => moveKey(i, priority.length - 1)} disabled={i === priority.length - 1}
                      className="text-zinc-600 hover:text-white disabled:opacity-20 transition-colors">
                      <ChevronDown size={16} />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 順位表 */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800">
              <h2 className="text-sm font-semibold text-zinc-300">順位表</h2>
              <button onClick={applyRanks}
                className={cn('flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-bold transition-colors',
                  applied ? 'bg-emerald-700 text-white' : 'bg-yellow-600 hover:bg-yellow-500 text-white')}>
                <Check size={14} />
                {applied ? '反映済み' : '参加者に順位を反映'}
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-500 text-xs">
                    <th className="px-4 py-2 text-left w-12">順位</th>
                    <th className="px-4 py-2 text-left">名前</th>
                    <th className="px-4 py-2 text-left">所属</th>
                    <th className="px-4 py-2 text-center">素点</th>
                    <th className="px-4 py-2 text-center">近似値誤差</th>
                    <th className="px-4 py-2 text-center">第1連答</th>
                    <th className="px-4 py-2 text-center">第2連答</th>
                    <th className="px-4 py-2 text-center">第3連答</th>
                  </tr>
                </thead>
                <tbody>
                  {ranked.map((row, i) => (
                    <tr key={row.no} className={cn('border-b border-zinc-800/50',
                      i === 0 ? 'bg-yellow-950/30' : i < 3 ? 'bg-zinc-900' : 'bg-zinc-950')}>
                      <td className="px-4 py-2 font-bold text-zinc-300">{i + 1}</td>
                      <td className="px-4 py-2">
                        <div className="text-white font-medium">{row.name}</div>
                        <div className="text-zinc-600 text-xs">{row.ruby}</div>
                      </td>
                      <td className="px-4 py-2 text-zinc-400 text-xs">{row.affiliation}{row.grade && ` ${row.grade}`}</td>
                      <td className="px-4 py-2 text-center text-blue-300 font-bold">{row.raw_score}</td>
                      <td className="px-4 py-2 text-center text-zinc-300">{row.proximity_error != null ? `±${row.proximity_error}` : '—'}</td>
                      <td className="px-4 py-2 text-center text-zinc-300">{row.chain1}</td>
                      <td className="px-4 py-2 text-center text-zinc-300">{row.chain2}</td>
                      <td className="px-4 py-2 text-center text-zinc-300">{row.chain3}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
