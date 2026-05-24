'use client'

import { useState } from 'react'
import { useMatchStore } from '@/store/matchStore'
import { cn } from '@/lib/utils/cn'
import { Slash } from 'lucide-react'

interface Props {
  onSlash: () => void
}

export default function QuestionBar({ onSlash }: Props) {
  const { matchState } = useMatchStore()
  const [editing, setEditing] = useState(false)
  const [localText, setLocalText] = useState('')
  const qText = matchState?.questionText ?? ''

  const parts = qText.split('/')

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 px-4 py-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => { setEditing(e => !e); setLocalText(qText) }}
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
          {editing ? '閉じる' : '問題文を入力'}
        </button>
        <button
          onClick={onSlash}
          disabled={!matchState?.questionText}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-bold transition-all',
            matchState?.questionText
              ? 'bg-[#2d5a9e] hover:bg-[#3d6aae] text-white'
              : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
          )}>
          <Slash size={14} /> / 挿入
        </button>
      </div>

      {editing && (
        <textarea
          value={localText}
          onChange={e => setLocalText(e.target.value)}
          placeholder="問題文を入力（/で押し箇所を記録）"
          className="w-full bg-zinc-800 text-white text-sm rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500 h-20"
        />
      )}

      {qText && (
        <div className="text-sm text-zinc-200 leading-relaxed">
          {parts.map((part, i) => (
            <span key={i}>
              {part}
              {i < parts.length - 1 && <span className="text-[#4a90e2] font-black mx-1">/</span>}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
