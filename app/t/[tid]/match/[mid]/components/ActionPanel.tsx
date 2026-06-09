// @ts-nocheck
'use client'
import { Check, X, Minus, SkipForward, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { PlayerState } from '@/lib/engine/types'

interface Props {
  selectedPlayer: PlayerState | null
  canAct: boolean
  canUndo: boolean
  isActive: boolean
  unusedCount: number
  onCorrect: () => void
  onWrong: () => void
  onPass: () => void
  onNext: () => void
  onUndo: () => void
}

export function ActionPanel({ selectedPlayer, canAct, canUndo, isActive, unusedCount, onCorrect, onWrong, onPass, onNext, onUndo }: Props) {
  return (
    <div className="flex flex-col gap-3">
      {/* 選択中プレイヤー */}
      <div className={cn('rounded-2xl border px-4 py-3 transition-all min-h-[60px] flex items-center',
        selectedPlayer ? 'bg-blue-950/40 border-blue-700/60' : 'bg-zinc-900 border-zinc-800')}>
        {selectedPlayer ? (
          <div>
            <div className="text-xs text-blue-400 font-semibold mb-0.5">選択中</div>
            <div className="text-white font-bold text-base leading-tight">{selectedPlayer.name}</div>
            {selectedPlayer.affiliation && <div className="text-zinc-400 text-xs">{selectedPlayer.affiliation}</div>}
          </div>
        ) : (
          <p className="text-zinc-600 text-sm w-full text-center">
            {isActive ? 'プレイヤーを選択' : '試合を開始してください'}
          </p>
        )}
      </div>

      {/* 正解・誤答・パス */}
      <button disabled={!canAct} onClick={onCorrect}
        className={cn('flex items-center justify-center gap-2 py-5 rounded-2xl font-black text-xl transition-all',
          canAct ? 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95 shadow-lg shadow-emerald-900/40' : 'bg-zinc-800 text-zinc-600 cursor-not-allowed')}>
        <Check size={26} strokeWidth={3} /> 正解
      </button>
      <button disabled={!canAct} onClick={onWrong}
        className={cn('flex items-center justify-center gap-2 py-5 rounded-2xl font-black text-xl transition-all',
          canAct ? 'bg-red-600 hover:bg-red-500 text-white active:scale-95 shadow-lg shadow-red-900/40' : 'bg-zinc-800 text-zinc-600 cursor-not-allowed')}>
        <X size={26} strokeWidth={3} /> 誤答
      </button>
      <button disabled={!canAct} onClick={onPass}
        className={cn('flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-base transition-all',
          canAct ? 'bg-zinc-700 hover:bg-zinc-600 text-white active:scale-95' : 'bg-zinc-800 text-zinc-600 cursor-not-allowed')}>
        <Minus size={18} /> パス
      </button>

      {/* 次の問題・アンドゥ */}
      <button disabled={!isActive} onClick={onNext}
        className={cn('flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-base transition-all',
          isActive ? 'bg-blue-700 hover:bg-blue-600 text-white active:scale-95' : 'bg-zinc-800 text-zinc-600 cursor-not-allowed')}>
        <SkipForward size={18} />
        {unusedCount > 0 ? `次の問題 (残${unusedCount})` : '次の問題'}
      </button>
      <button disabled={!canUndo} onClick={onUndo}
        className={cn('flex items-center justify-center gap-2 py-2.5 rounded-2xl font-semibold text-sm transition-all',
          canUndo ? 'bg-zinc-700 hover:bg-zinc-600 text-zinc-200 active:scale-95' : 'bg-zinc-800 text-zinc-600 cursor-not-allowed')}>
        <RotateCcw size={15} /> アンドゥ
      </button>
    </div>
  )
}
