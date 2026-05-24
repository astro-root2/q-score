'use client'
import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Upload } from 'lucide-react'
import Papa from 'papaparse'
import { SORT_KEYS } from '../types'
import type { Participant, CsvRow } from '../types'
import { PriorityEditor } from './PriorityEditor'
import { CsvRankTable } from './RankTable'

export function CsvMode({ participants }: { participants: Participant[] }) {
  const supabase = createClient()
  const [rows, setRows] = useState<CsvRow[]>([])
  const [priority, setPriority] = useState(SORT_KEYS.map(k => k.key))
  const [applied, setApplied] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const handleCSV = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    Papa.parse<Record<string, string>>(file, {
      header: true, skipEmptyLines: true,
      complete: ({ data }) => {
        const parsed: CsvRow[] = data.map((r, i) => ({
          no:              Number(r['No'] ?? r['no'] ?? i + 1),
          name:            r['名前'] ?? r['name'] ?? '',
          ruby:            r['読み'] ?? r['ruby'] ?? '',
          affiliation:     r['所属機関'] ?? r['affiliation'] ?? '',
          grade:           r['学年'] ?? r['grade'] ?? '',
          raw_score:       Number(r['素点'] ?? r['raw_score'] ?? 0),
          proximity_error: r['近似値誤差'] != null && r['近似値誤差'] !== '' ? Number(r['近似値誤差']) : null,
          chain1:          Number(r['第1連答'] ?? r['chain1'] ?? 0),
          chain2:          Number(r['第2連答'] ?? r['chain2'] ?? 0),
          chain3:          Number(r['第3連答'] ?? r['chain3'] ?? 0),
        }))
        setRows(parsed)
        setApplied(false)
        setMsg(`${parsed.length}件読み込みました`)
      },
    })
    e.target.value = ''
  }, [])

  const ranked = [...rows].sort((a, b) => {
    for (const key of priority) {
      const def = SORT_KEYS.find(k => k.key === key)!
      const av = (a as Record<string, number | null>)[key] ?? (def.asc ? Infinity : -Infinity)
      const bv = (b as Record<string, number | null>)[key] ?? (def.asc ? Infinity : -Infinity)
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
    setMsg(`${updated}/${ranked.length}件反映しました`)
  }

  return (
    <div className="space-y-5">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3">
        <h2 className="text-sm font-semibold text-zinc-300">CSVアップロード</h2>
        <p className="text-xs text-zinc-500">形式: <code className="bg-zinc-800 px-1 rounded">No,名前,読み,所属機関,学年,素点,近似値誤差,第1連答,第2連答,第3連答</code></p>
        <label className="flex items-center gap-2 w-fit px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold cursor-pointer transition-colors">
          <Upload size={15} /> CSVを選択
          <input type="file" accept=".csv" className="hidden" onChange={handleCSV} />
        </label>
        {msg && <p className="text-sm text-emerald-400">{msg}</p>}
      </div>

      {rows.length > 0 && (
        <>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3">
            <h2 className="text-sm font-semibold text-zinc-300">順位判定の優先順位</h2>
            <PriorityEditor priority={priority} onChange={p => { setPriority(p); setApplied(false) }} />
          </div>
          <CsvRankTable ranked={ranked} applied={applied} onApply={applyRanks} />
        </>
      )}
    </div>
  )
}
