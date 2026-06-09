// @ts-nocheck
'use client'

import { useState } from 'react'
import type { MatchState } from '@/lib/engine/types'
import { cn } from '@/lib/utils/cn'
import { Zap, ShieldMinus } from 'lucide-react'

interface Props {
  matchState: MatchState
  onApply: (adjustments: Record<string, { correct: number; wrong: number; points: number }>) => void
  disabled?: boolean
}

export default function AdvantagePanel({ matchState, onApply, disabled }: Props) {
  const [adjustments, setAdjustments] = useState<Record<string, {
    correct: number; wrong: number; points: number
  }>>(() =>
    Object.fromEntries(matchState.players.map(p => [p.id, { correct: 0, wrong: 0, points: 0 }]))
  )
  const [applied, setApplied] = useState(false)

  const update = (playerId: string, field: 'correct' | 'wrong' | 'points', value: number) => {
    setAdjustments(prev => ({ ...prev, [playerId]: { ...prev[playerId], [field]: value } }))
    setApplied(false)
  }

  const handleApply = () => {
    onApply(adjustments)
    setApplied(true)
  }

  const hasAnyAdjustment = Object.values(adjustments).some(
    a => a.correct !== 0 || a.wrong !== 0 || a.points !== 0
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-zinc-300 text-sm font-semibold flex items-center gap-2">
          <Zap size={14} className="text-yellow-400" />
          初期アドバンテージ設定
        </h3>
        <span className="text-zinc-600 text-xs">試合開始前に設定してください</span>
      </div>
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-950">
              <th className="px-3 py-2 text-left text-zinc-500 text-xs font-medium">参加者</th>
              <th className="px-3 py-2 text-center text-emerald-600 text-xs font-medium">+○</th>
              <th className="px-3 py-2 text-center text-red-600 text-xs font-medium">+✕</th>
              <th className="px-3 py-2 text-center text-blue-500 text-xs font-medium">±pt</th>
            </tr>
          </thead>
          <tbody>
            {matchState.players.map(p => {
              const adj = adjustments[p.id] ?? { correct: 0, wrong: 0, points: 0 }
              const hasAdv = adj.correct > 0 || adj.points > 0
              const hasDis = adj.wrong > 0 || adj.points < 0
              return (
                <tr key={p.id} className={cn(
                  'border-b border-zinc-800/50 last:border-0 transition-colors',
                  hasAdv ? 'bg-emerald-950/20' : hasDis ? 'bg-red-950/20' : ''
                )}>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      {hasAdv && <Zap size={12} className="text-yellow-400" />}
                      {hasDis && <ShieldMinus size={12} className="text-red-400" />}
                      <span className="text-white text-sm font-medium">{p.name}</span>
                      {p.paperRank != null && (
                        <span className="text-zinc-600 text-xs">#{p.paperRank}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <AdjInput value={adj.correct} onChange={v => update(p.id, 'correct', v)}
                      min={0} max={20} color="emerald" disabled={disabled} />
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <AdjInput value={adj.wrong} onChange={v => update(p.id, 'wrong', v)}
                      min={0} max={20} color="red" disabled={disabled} />
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <AdjInput value={adj.points} onChange={v => update(p.id, 'points', v)}
                      min={-50} max={50} color="blue" disabled={disabled} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between">
        <button
          onClick={() => {
            setAdjustments(Object.fromEntries(matchState.players.map(p => [p.id, { correct: 0, wrong: 0, points: 0 }])))
            setApplied(false)
          }}
          className="text-zinc-600 hover:text-zinc-400 text-xs transition-colors">
          リセット
        </button>
        <button
          onClick={handleApply}
          disabled={!hasAnyAdjustment || disabled}
          className={cn(
            'px-4 py-1.5 rounded-lg text-sm font-bold transition-all',
            hasAnyAdjustment && !disabled
              ? applied ? 'bg-emerald-700 text-white' : 'bg-yellow-600 hover:bg-yellow-500 text-white'
              : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
          )}>
          {applied ? '✓ 適用済み' : 'アドバンテージを適用'}
        </button>
      </div>
    </div>
  )
}

function AdjInput({ value, onChange, min, max, color, disabled }: {
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  color: 'emerald' | 'red' | 'blue'
  disabled?: boolean
}) {
  const colorMap = {
    emerald: 'text-emerald-400 focus:ring-emerald-500',
    red: 'text-red-400 focus:ring-red-500',
    blue: 'text-blue-400 focus:ring-blue-500',
  }
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      disabled={disabled}
      onChange={e => onChange(Number(e.target.value))}
      className={cn(
        'w-14 bg-zinc-800 text-center rounded-lg px-1 py-1 text-sm font-bold',
        'focus:outline-none focus:ring-1 disabled:opacity-40',
        colorMap[color],
        value !== 0 ? 'bg-zinc-700' : ''
      )}
    />
  )
}
