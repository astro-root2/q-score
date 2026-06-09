// @ts-nocheck
'use client'

import { useMatchStore } from '@/store/matchStore'
import { cn } from '@/lib/utils/cn'
import { Check, X, Minus, SkipForward, RotateCcw } from 'lucide-react'
import { selectCanUndo } from '@/store/matchStore'
import type { EventType } from '@/lib/engine/types'

interface Props {
  onDispatch: (type: EventType, actorId?: string) => void
  onUndo: () => void
}

export default function ActionBar({ onDispatch, onUndo }: Props) {
  const { matchState, selectedPlayerId } = useMatchStore()
  const canUndo = useMatchStore(selectCanUndo)
  const status = matchState?.status

  const canAct = status === 'active' && selectedPlayerId

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-3 space-y-2">
      {!selectedPlayerId && status === 'active' && (
        <p className="text-center text-xs text-zinc-500 py-1">プレイヤーを選択してください</p>
      )}
      <div className="grid grid-cols-3 gap-2">
        <button
          disabled={!canAct}
          onClick={() => onDispatch('CORRECT', selectedPlayerId!)}
          className={cn(
            'flex flex-col items-center gap-1 py-4 rounded-xl font-bold text-lg transition-all',
            canAct
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95'
              : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
          )}>
          <Check size={28} />
          <span className="text-sm">正解</span>
        </button>
        <button
          disabled={!canAct}
          onClick={() => onDispatch('WRONG', selectedPlayerId!)}
          className={cn(
            'flex flex-col items-center gap-1 py-4 rounded-xl font-bold text-lg transition-all',
            canAct
              ? 'bg-red-600 hover:bg-red-500 text-white active:scale-95'
              : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
          )}>
          <X size={28} />
          <span className="text-sm">誤答</span>
        </button>
        <button
          disabled={!canAct}
          onClick={() => onDispatch('PASS', selectedPlayerId!)}
          className={cn(
            'flex flex-col items-center gap-1 py-4 rounded-xl font-bold text-lg transition-all',
            canAct
              ? 'bg-zinc-700 hover:bg-zinc-600 text-white active:scale-95'
              : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
          )}>
          <Minus size={28} />
          <span className="text-sm">パス</span>
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          disabled={status !== 'active'}
          onClick={() => onDispatch('QUESTION_NEXT')}
          className={cn(
            'flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-all',
            status === 'active'
              ? 'bg-blue-700 hover:bg-blue-600 text-white active:scale-95'
              : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
          )}>
          <SkipForward size={16} /> 次の問題
        </button>
        <button
          disabled={!canUndo}
          onClick={onUndo}
          className={cn(
            'flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-all',
            canUndo
              ? 'bg-zinc-700 hover:bg-zinc-600 text-white active:scale-95'
              : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
          )}>
          <RotateCcw size={16} /> アンドゥ
        </button>
      </div>
    </div>
  )
}
