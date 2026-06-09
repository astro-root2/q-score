// @ts-nocheck
'use client'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { CsvRow, PaperSubmission, Participant } from '../types'

interface CsvRankTableProps {
  ranked: CsvRow[]
  applied: boolean
  onApply: () => void
}

export function CsvRankTable({ ranked, applied, onApply }: CsvRankTableProps) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800">
        <h2 className="text-sm font-semibold text-zinc-300">順位表</h2>
        <button onClick={onApply}
          className={cn('flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-bold transition-colors',
            applied ? 'bg-emerald-700 text-white' : 'bg-yellow-600 hover:bg-yellow-500 text-white')}>
          <Check size={14} />{applied ? '反映済み' : '参加者に順位を反映'}
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
  )
}

interface SystemRankTableProps {
  ranked: Participant[]
  getSub: (id: string) => PaperSubmission
  applied: boolean
  msg: string | null
  onApply: () => void
}

export function SystemRankTable({ ranked, getSub, applied, msg, onApply }: SystemRankTableProps) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800">
        <h2 className="text-sm font-semibold text-zinc-300">順位プレビュー</h2>
        <div className="flex items-center gap-2">
          {msg && <span className="text-xs text-emerald-400">{msg}</span>}
          <button onClick={onApply}
            className={cn('flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-bold transition-colors',
              applied ? 'bg-emerald-700 text-white' : 'bg-yellow-600 hover:bg-yellow-500 text-white')}>
            <Check size={13} />{applied ? '反映済み' : '参加者に反映'}
          </button>
        </div>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800 text-zinc-500 text-xs">
            <th className="px-4 py-2 text-left w-12">順位</th>
            <th className="px-4 py-2 text-left">名前</th>
            <th className="px-3 py-2 text-center">素点</th>
            <th className="px-3 py-2 text-center">近似値誤差</th>
            <th className="px-3 py-2 text-center">第1</th>
            <th className="px-3 py-2 text-center">第2</th>
            <th className="px-3 py-2 text-center">第3</th>
          </tr>
        </thead>
        <tbody>
          {ranked.map((p, i) => {
            const sub = getSub(p.id)
            return (
              <tr key={p.id} className={cn('border-b border-zinc-800/50',
                i === 0 ? 'bg-yellow-950/20' : i < 3 ? 'bg-zinc-900' : 'bg-zinc-950')}>
                <td className="px-4 py-2">
                  <span className={cn('font-bold text-lg',
                    i === 0 ? 'text-yellow-400' : i === 1 ? 'text-zinc-300' : i === 2 ? 'text-amber-600' : 'text-zinc-600')}>
                    {i + 1}
                  </span>
                </td>
                <td className="px-4 py-2 text-white font-medium">{p.name}</td>
                <td className="px-3 py-2 text-center text-blue-300 font-bold">{sub.raw_score}</td>
                <td className="px-3 py-2 text-center text-zinc-300">{sub.proximity_error != null ? `±${sub.proximity_error}` : '—'}</td>
                <td className="px-3 py-2 text-center text-zinc-300">{sub.chain1}</td>
                <td className="px-3 py-2 text-center text-zinc-300">{sub.chain2}</td>
                <td className="px-3 py-2 text-center text-zinc-300">{sub.chain3}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
