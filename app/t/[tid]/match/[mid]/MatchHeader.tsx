'use client'

import { useMatchStore } from '@/store/matchStore'
import { cn } from '@/lib/utils/cn'
import { Wifi, WifiOff, Pause, Play } from 'lucide-react'
import type { EventType } from '@/lib/engine/types'

interface Props {
  matchName: string
  ruleName: string
  onDispatch: (type: EventType) => void
}

export default function MatchHeader({ matchName, ruleName, onDispatch }: Props) {
  const { matchState, isConnected, error } = useMatchStore()
  const status = matchState?.status ?? 'pending'
  const qNum = matchState?.questionNumber ?? 0

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 px-4 py-3 space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <span className="font-bold text-white text-lg">{matchName}</span>
          <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded">{ruleName}</span>
          {qNum > 0 && <span className="text-sm text-zinc-400">Q{qNum}</span>}
        </div>
        <div className="flex items-center gap-2">
          <div className={cn('flex items-center gap-1 text-xs px-2 py-1 rounded',
            isConnected ? 'text-emerald-400 bg-emerald-900/30' : 'text-red-400 bg-red-900/30')}>
            {isConnected ? <Wifi size={11} /> : <WifiOff size={11} />}
            {isConnected ? 'LIVE' : '切断'}
          </div>
          <div className={cn('text-xs px-2 py-1 rounded font-semibold',
            status === 'active' ? 'bg-green-900/40 text-green-400' :
            status === 'paused' ? 'bg-yellow-900/40 text-yellow-400' :
            status === 'completed' ? 'bg-blue-900/40 text-blue-400' : 'bg-zinc-800 text-zinc-400')}>
            {status === 'active' ? '進行中' : status === 'paused' ? '一時停止' : status === 'completed' ? '終了' : '待機中'}
          </div>
          {status === 'pending' && (
            <button onClick={() => onDispatch('MATCH_START')}
              className="flex items-center gap-1 px-3 py-1 text-sm bg-green-600 hover:bg-green-500 text-white rounded-lg font-bold transition-colors">
              <Play size={13} /> 開始
            </button>
          )}
          {status === 'active' && (
            <button onClick={() => onDispatch('MATCH_PAUSE')}
              className="flex items-center gap-1 px-3 py-1 text-sm bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg transition-colors">
              <Pause size={13} /> 一時停止
            </button>
          )}
          {status === 'paused' && (
            <button onClick={() => onDispatch('MATCH_RESUME')}
              className="flex items-center gap-1 px-3 py-1 text-sm bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors">
              <Play size={13} /> 再開
            </button>
          )}
          {(status === 'active' || status === 'paused') && (
            <button onClick={() => onDispatch('MATCH_END')}
              className="px-3 py-1 text-sm bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-lg transition-colors">
              終了
            </button>
          )}
        </div>
      </div>
      {error && <div className="text-xs text-red-400 bg-red-900/20 px-3 py-1.5 rounded">{error}</div>}
    </div>
  )
}
