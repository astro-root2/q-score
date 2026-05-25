'use client'
import Link from 'next/link'
import { Wifi, WifiOff, Play, Pause, Square, Monitor, Radio, Eye } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { MatchStatus } from '@/lib/engine/types'

interface Props {
  matchName: string
  ruleName: string
  status: MatchStatus
  questionNumber: number
  unusedCount: number
  isConnected: boolean
  error: string | null
  obsUrl: string
  screenUrl: string
  staffUrl: string
  onStart: () => void
  onPause: () => void
  onResume: () => void
  onEnd: () => void
}

const STATUS_LABEL: Record<MatchStatus, string> = {
  pending: '待機中', active: '進行中', paused: '一時停止', completed: '終了',
}
const STATUS_COLOR: Record<MatchStatus, string> = {
  pending:   'text-zinc-400 bg-zinc-800',
  active:    'text-emerald-300 bg-emerald-900/40',
  paused:    'text-yellow-300 bg-yellow-900/40',
  completed: 'text-blue-300 bg-blue-900/40',
}

export function MatchHeader({ matchName, ruleName, status, questionNumber, unusedCount, isConnected, error, obsUrl, screenUrl, staffUrl, onStart, onPause, onResume, onEnd }: Props) {
  const isActive  = status === 'active'
  const isPending = status === 'pending'
  const isPaused  = status === 'paused'

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn('flex items-center gap-1.5 text-xs px-2 py-1 rounded-full font-semibold shrink-0', STATUS_COLOR[status])}>
            {STATUS_LABEL[status]}
          </div>
          <span className="font-bold text-white text-base truncate">{matchName}</span>
          <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full shrink-0">{ruleName}</span>
          {questionNumber > 0 && (
            <div className="flex items-baseline gap-0.5 shrink-0">
              <span className="text-zinc-600 text-xs">Q</span>
              <span className="text-white font-black text-xl tabular-nums">{questionNumber}</span>
            </div>
          )}
          {unusedCount > 0 && <span className="text-xs text-zinc-600 shrink-0">残{unusedCount}問</span>}
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <div className={cn('flex items-center gap-1 text-xs px-2 py-1 rounded-full', isConnected ? 'text-emerald-400 bg-emerald-950' : 'text-red-400 bg-red-950')}>
            {isConnected ? <Wifi size={11} /> : <WifiOff size={11} />}
            {isConnected ? 'LIVE' : '切断'}
          </div>
          {isPending && (
            <button onClick={onStart} className="flex items-center gap-1.5 px-4 py-1.5 text-sm bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-colors">
              <Play size={13} /> 開始
            </button>
          )}
          {isActive && (
            <button onClick={onPause} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-yellow-600 hover:bg-yellow-500 text-white rounded-xl transition-colors">
              <Pause size={13} /> 一時停止
            </button>
          )}
          {isPaused && (
            <button onClick={onResume} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-colors">
              <Play size={13} /> 再開
            </button>
          )}
          {(isActive || isPaused) && (
            <button onClick={onEnd} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-xl transition-colors">
              <Square size={12} /> 終了
            </button>
          )}
          <a href={screenUrl} target="_blank" className="flex items-center gap-1 px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-lg text-xs transition-colors">
            <Monitor size={12} /> スクリーン
          </a>
          <a href={obsUrl} target="_blank" className="flex items-center gap-1 px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-lg text-xs transition-colors">
            <Radio size={12} /> OBS
          </a>
          <a href={staffUrl} target="_blank" className="flex items-center gap-1 px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-lg text-xs transition-colors">
            <Eye size={12} /> スタッフ
          </a>
        </div>
      </div>
      {error && (
        <div className="mt-2 text-xs text-red-400 bg-red-950/40 border border-red-900/50 px-3 py-1.5 rounded-lg">{error}</div>
      )}
    </div>
  )
}
