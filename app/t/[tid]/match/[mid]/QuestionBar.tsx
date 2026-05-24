'use client'

import { useState, useEffect } from 'react'
import { useMatchStore } from '@/store/matchStore'
import { cn } from '@/lib/utils/cn'
import { Slash, Save } from 'lucide-react'

interface Props {
  onSlash: () => void
  onSave?: (text: string) => void
}

export default function QuestionBar({ onSlash, onSave }: Props) {
  const { matchState } = useMatchStore()
  const [localText, setLocalText] = useState(matchState?.questionText ?? '')
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    setLocalText(matchState?.questionText ?? '')
    setDirty(false)
  }, [matchState?.questionText])

  const qText = matchState?.questionText ?? ''
  const parts = qText.split('/')

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-zinc-500 text-xs">問題文</span>
        <div className="flex gap-2">
          <button onClick={() => { onSave?.(localText); setDirty(false) }} disabled={!dirty}
            className={cn('flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-bold transition-all',
              dirty ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-zinc-800 text-zinc-600 cursor-not-allowed')}>
            <Save size={13} /> 保存
          </button>
          <button onClick={onSlash} disabled={!qText}
            className={cn('flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-bold transition-all',
              qText ? 'bg-[#2d5a9e] hover:bg-[#3d6aae] text-white' : 'bg-zinc-800 text-zinc-600 cursor-not-allowed')}>
            <Slash size={13} /> / 挿入
          </button>
        </div>
      </div>

      <textarea
        value={localText}
        onChange={e => { setLocalText(e.target.value); setDirty(true) }}
        placeholder="問題文を入力..."
        className="w-full bg-zinc-800 text-white text-sm rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500 h-20"
      />

      {qText && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 px-4 py-3">
          <p className="text-zinc-200 text-sm leading-relaxed">
            {parts.map((part, i) => (
              <span key={i}>
                {part}
                {i < parts.length - 1 && <span className="text-[#4a90e2] font-black mx-1">/</span>}
              </span>
            ))}
          </p>
          {parts.length > 1 && <p className="text-zinc-600 text-xs mt-1">押し箇所: {parts.length - 1}か所</p>}
        </div>
      )}
    </div>
  )
}
