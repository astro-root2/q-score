// @ts-nocheck
'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import { Save, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { SLASH_MARKER, splitQuestionText } from '@/lib/utils/questionText'

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
  unusedCount: number
}

export function QuestionBar({ currentQuestion, savedText, onSave, unusedCount }: Props) {
  const [localText, setLocalText] = useState(savedText ?? '')
  const [dirty, setDirty]         = useState(false)
  const [showAnswer, setShowAnswer] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // savedTextが外部から変わった時に同期（次の問題セット時など）
  useEffect(() => {
    if (savedText !== null && !dirty) {
      setLocalText(savedText)
    }
  }, [savedText])

  const insertSlash = useCallback(() => {
    const input = inputRef.current
    if (!input) return
    const start = input.selectionStart ?? localText.length
    const end   = input.selectionEnd ?? localText.length
    const next  = localText.slice(0, start) + SLASH_MARKER + localText.slice(end)
    setLocalText(next)
    setDirty(true)
    // カーソルをマーカーの直後に移動
    requestAnimationFrame(() => {
      input.focus()
      const pos = start + SLASH_MARKER.length
      input.setSelectionRange(pos, pos)
    })
  }, [localText])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    // Ctrl+/ または Cmd+/ でスラッシュ挿入
    if (e.key === '/' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      insertSlash()
    }
    // Enter で保存
    if (e.key === 'Enter') {
      onSave(localText)
      setDirty(false)
    }
  }, [insertSlash, localText, onSave])

  const handleSave = () => {
    onSave(localText)
    setDirty(false)
    setShowAnswer(false)
  }

  const previewParts = splitQuestionText(localText)

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-zinc-600 text-xs shrink-0">問題文</span>
        <input
          ref={inputRef}
          type="text"
          value={localText}
          onChange={e => { setLocalText(e.target.value); setDirty(true) }}
          onKeyDown={handleKeyDown}
          placeholder={currentQuestion ? currentQuestion.body : '問題文を入力 (Ctrl+/ で区切り挿入)'}
          className="flex-1 bg-zinc-800 text-white text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-0"
        />
        <button
          onClick={insertSlash}
          title="読み上げ区切りを挿入 (Ctrl+/)"
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-zinc-700 hover:bg-zinc-600 text-zinc-300 hover:text-white transition-all shrink-0">
          ／区切
        </button>
        <button onClick={handleSave} disabled={!dirty}
          className={cn('flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0',
            dirty ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-zinc-800 text-zinc-600 cursor-not-allowed')}>
          <Save size={12} /> 保存
        </button>
      </div>

      {/* プレビュー（{/}を青スラッシュで表示） */}
      {localText && (
        <p className="text-sm text-zinc-400 leading-relaxed pl-1">
          {previewParts.map((part, i) => (
            <span key={i}>
              {part}
              {i < previewParts.length - 1 && <span className="text-blue-400 font-black mx-1">/</span>}
            </span>
          ))}
        </p>
      )}

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
    </div>
  )
}
