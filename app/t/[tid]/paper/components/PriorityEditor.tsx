'use client'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { SORT_KEYS } from '../types'

interface Props {
  priority: string[]
  onChange: (next: string[]) => void
}

export function PriorityEditor({ priority, onChange }: Props) {
  const move = (idx: number, dir: -1 | 1) => {
    const next = [...priority]
    const swap = idx + dir
    if (swap < 0 || swap >= next.length) return
    ;[next[idx], next[swap]] = [next[swap], next[idx]]
    onChange(next)
  }

  return (
    <div className="space-y-1">
      {priority.map((key, i) => {
        const def = SORT_KEYS.find(k => k.key === key)!
        return (
          <div key={key} className="flex items-center gap-3 bg-zinc-800 rounded-lg px-3 py-2">
            <span className="text-zinc-500 text-sm w-4">{i + 1}</span>
            <span className="text-white text-sm flex-1">{def.label}</span>
            <span className="text-zinc-600 text-xs">{def.asc ? '小さい順' : '大きい順'}</span>
            <button onClick={() => move(i, -1)} disabled={i === 0} className="text-zinc-600 hover:text-white disabled:opacity-20"><ChevronUp size={16} /></button>
            <button onClick={() => move(i, 1)} disabled={i === priority.length - 1} className="text-zinc-600 hover:text-white disabled:opacity-20"><ChevronDown size={16} /></button>
          </div>
        )
      })}
    </div>
  )
}
