'use client'
import { useState } from 'react'
import { Save, Slash, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface Question {
  id: string
  body: string
  answer: string
  genre: string | null
}

interface Props {
  currentQuestion: Question | null
  savedText: string | null
  onSave: (text: string) => void
  onSlash: () => void
  unusedCount: number
}

export function QuestionBar({ currentQuestion, savedText, onSave, onSlash, unusedCount }: Props) {
  const [localText, setLocalText] = useState(savedText ?? '')
  const [dirty, setDirty]         = useState(false)
  const [showAnswer, setShowAnswer] = useState(false)

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-zinc-600 text-xs shrink-0">問題文</span>
        <input
          type="text"
          value={localText}
          onChange={e => { setLocalText(e.target.value); setDirty(true) }}
          placeholder={currentQuestion ? currentQuestion.body : '問題文を入力（任意）'}
          className="flex-1 bg-zinc-800 text-white text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-0"
        />
        <button onClick={() => { onSave(localText); setDirty(false) }} disabled={!dirty}
          className={cn('flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0',
            dirty ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-zinc-800 text-zinc-600 cursor-not-allowed')}>
          <Save size={12} /> 保存
        </button>
        <button onClick={onSlash} disabled={!localText}
          className={cn('flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0',
            localText ? 'bg-zinc-700 hover:bg-zinc-600 text-white' : 'bg-zinc-800 text-zinc-600 cursor-not-allowed')}>
          <Slash size={11} /> /挿入
        </button>
      </div>

      {currentQuestion && (
        <div className="flex items-center gap-2 pl-1">
          <BookOpen size={11} className="text-zinc-600 shrink-0" />
          <button onClick={() => setShowAnswer(v => !v)} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
            {showAnswer ? '答えを隠す' : '答えを表示'}
          </button>
          {showAnswer && <span className="text-sm font-bold text-emerald-400">{currentQuestion.answer}</span>}
          {currentQuestion.genre && <span className="text-xs text-zinc-600 ml-2">{currentQuestion.genre}</span>}
        </div>
      )}

      {savedText && (
        <p className="text-sm text-zinc-200 leading-relaxed pl-1">
          {savedText.split('/').map((part, i, arr) => (
            <span key={i}>{part}{i < arr.length - 1 && <span className="text-blue-400 font-black mx-1">/</span>}</span>
          ))}
        </p>
      )}
    </div>
  )
}
