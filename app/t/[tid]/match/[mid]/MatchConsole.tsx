'use client'

import { useState } from 'react'
import { useMatchStore } from '@/store/matchStore'
import { useMatchEngine } from './useMatchEngine'
import PlayerGrid from './PlayerGrid'
import RuleParamsPanel from './RuleParamsPanel'
import AdvantagePanel from './AdvantagePanel'
import type { MatchState, GameEvent, EventType, RuleParamDef } from '@/lib/engine/types'
import {
  Wifi, WifiOff, Play, Pause, Square,
  Check, X, Minus, SkipForward, RotateCcw,
  ChevronDown, ChevronUp, Radio, Monitor,
  Slash, Save,
} from 'lucide-react'
import { selectCanUndo } from '@/store/matchStore'
import { cn } from '@/lib/utils/cn'

interface Props {
  matchId: string
  tournamentId: string
  initialState: MatchState
  initialEvents: GameEvent[]
  rule: { id: string; name: string; paramDefs: RuleParamDef[] }
  obsToken: string
  displayToken: string
}

export default function MatchConsole({ matchId, initialState, initialEvents, rule, tournamentId, obsToken, displayToken }: Props) {
  const { dispatch, undo, slash, applyAdvantage, setQuestionText } = useMatchEngine(matchId, initialState, initialEvents)
  const { setSelectedPlayer, matchState, selectedPlayerId, isConnected, error } = useMatchStore()
  const canUndo = useMatchStore(selectCanUndo)

  const [localParams, setLocalParams] = useState<Record<string, number | string | boolean>>(
    initialState?.ruleParams ?? {}
  )
  const [localText, setLocalText] = useState(matchState?.questionText ?? '')
  const [textDirty, setTextDirty] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const status = matchState?.status ?? 'pending'
  const qNum = matchState?.questionNumber ?? 0
  const isActive = status === 'active'
  const isPending = status === 'pending'
  const isPaused = status === 'paused'

  const selectedPlayer = matchState?.players.find(p => p.id === selectedPlayerId) ?? null
  const canAct = isActive && !!selectedPlayerId

  const handleDispatch = (type: EventType, actorId?: string) => {
    dispatch(type, actorId)
    if (type === 'CORRECT' || type === 'WRONG') setSelectedPlayer(null)
  }

  const obsUrl = typeof window !== 'undefined' ? `${window.location.origin}/obs/${obsToken}` : ''
  const screenUrl = typeof window !== 'undefined' ? `${window.location.origin}/screen/${displayToken}` : ''

  const statusLabel = { pending: '待機中', active: '進行中', paused: '一時停止', completed: '終了' }[status]
  const statusColor = {
    pending: 'text-zinc-400 bg-zinc-800',
    active: 'text-emerald-300 bg-emerald-900/40',
    paused: 'text-yellow-300 bg-yellow-900/40',
    completed: 'text-blue-300 bg-blue-900/40',
  }[status]

  return (
    <div className="flex flex-col gap-3 max-w-6xl mx-auto pb-8">

      {/* ヘッダー */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <div className={cn('flex items-center gap-1.5 text-xs px-2 py-1 rounded-full font-semibold shrink-0', statusColor)}>
              {statusLabel}
            </div>
            <span className="font-bold text-white text-base truncate">{matchState?.matchName ?? initialState.matchName}</span>
            <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full shrink-0">{rule.name}</span>
            {qNum > 0 && (
              <div className="flex items-baseline gap-0.5 shrink-0">
                <span className="text-zinc-600 text-xs">Q</span>
                <span className="text-white font-black text-xl tabular-nums">{qNum}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className={cn('flex items-center gap-1 text-xs px-2 py-1 rounded-full',
              isConnected ? 'text-emerald-400 bg-emerald-950' : 'text-red-400 bg-red-950')}>
              {isConnected ? <Wifi size={11} /> : <WifiOff size={11} />}
              {isConnected ? 'LIVE' : '切断'}
            </div>
            {isPending && (
              <button onClick={() => handleDispatch('MATCH_START')}
                className="flex items-center gap-1.5 px-4 py-1.5 text-sm bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-colors">
                <Play size={13} /> 開始
              </button>
            )}
            {isActive && (
              <button onClick={() => handleDispatch('MATCH_PAUSE')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-yellow-600 hover:bg-yellow-500 text-white rounded-xl transition-colors">
                <Pause size={13} /> 一時停止
              </button>
            )}
            {isPaused && (
              <button onClick={() => handleDispatch('MATCH_RESUME')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-colors">
                <Play size={13} /> 再開
              </button>
            )}
            {(isActive || isPaused) && (
              <button onClick={() => handleDispatch('MATCH_END')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-xl transition-colors">
                <Square size={12} /> 終了
              </button>
            )}
            <a href={screenUrl} target="_blank"
              className="flex items-center gap-1 px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-lg text-xs transition-colors">
              <Monitor size={12} /> スクリーン
            </a>
            <a href={obsUrl} target="_blank"
              className="flex items-center gap-1 px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-lg text-xs transition-colors">
              <Radio size={12} /> OBS
            </a>
          </div>
        </div>
        {error && (
          <div className="mt-2 text-xs text-red-400 bg-red-950/40 border border-red-900/50 px-3 py-1.5 rounded-lg">
            {error}
          </div>
        )}
      </div>

      {/* 問題文バー */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-zinc-600 text-xs shrink-0">問題文</span>
          <input
            type="text"
            value={localText}
            onChange={e => { setLocalText(e.target.value); setTextDirty(true) }}
            placeholder="問題文を入力（任意）"
            className="flex-1 bg-zinc-800 text-white text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-0"
          />
          <button
            onClick={() => { setQuestionText(localText); setTextDirty(false) }}
            disabled={!textDirty}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0',
              textDirty ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
            )}>
            <Save size={12} /> 保存
          </button>
          <button
            onClick={slash}
            disabled={!localText}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0',
              localText ? 'bg-zinc-700 hover:bg-zinc-600 text-white' : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
            )}>
            <Slash size={11} /> /挿入
          </button>
        </div>
        {matchState?.questionText && (
          <p className="mt-2 text-sm text-zinc-200 leading-relaxed pl-1">
            {matchState.questionText.split('/').map((part, i, arr) => (
              <span key={i}>
                {part}
                {i < arr.length - 1 && <span className="text-blue-400 font-black mx-1">/</span>}
              </span>
            ))}
          </p>
        )}
      </div>

      {/* メイン: プレイヤーグリッド + アクションパネル */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-3">

        {/* プレイヤーグリッド */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <PlayerGrid
            ruleId={rule.id}
            onSelect={(id) => setSelectedPlayer(selectedPlayerId === id ? null : id)}
          />
        </div>

        {/* アクションパネル */}
        <div className="flex flex-col gap-3">

          {/* 選択中プレイヤー */}
          <div className={cn(
            'rounded-2xl border px-4 py-3 transition-all min-h-[60px] flex items-center',
            selectedPlayer ? 'bg-blue-950/40 border-blue-700/60' : 'bg-zinc-900 border-zinc-800'
          )}>
            {selectedPlayer ? (
              <div>
                <div className="text-xs text-blue-400 font-semibold mb-0.5">選択中</div>
                <div className="text-white font-bold text-base leading-tight">{selectedPlayer.name}</div>
                {selectedPlayer.affiliation && (
                  <div className="text-zinc-400 text-xs">{selectedPlayer.affiliation}</div>
                )}
              </div>
            ) : (
              <p className="text-zinc-600 text-sm w-full text-center">
                {isActive ? 'プレイヤーを選択' : '試合を開始してください'}
              </p>
            )}
          </div>

          {/* 正解・誤答・パス */}
          <div className="flex flex-col gap-2">
            <button
              disabled={!canAct}
              onClick={() => handleDispatch('CORRECT', selectedPlayerId!)}
              className={cn(
                'flex items-center justify-center gap-2 py-5 rounded-2xl font-black text-xl transition-all',
                canAct
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95 shadow-lg shadow-emerald-900/40'
                  : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
              )}>
              <Check size={26} strokeWidth={3} /> 正解
            </button>
            <button
              disabled={!canAct}
              onClick={() => handleDispatch('WRONG', selectedPlayerId!)}
              className={cn(
                'flex items-center justify-center gap-2 py-5 rounded-2xl font-black text-xl transition-all',
                canAct
                  ? 'bg-red-600 hover:bg-red-500 text-white active:scale-95 shadow-lg shadow-red-900/40'
                  : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
              )}>
              <X size={26} strokeWidth={3} /> 誤答
            </button>
            <button
              disabled={!canAct}
              onClick={() => handleDispatch('PASS', selectedPlayerId!)}
              className={cn(
                'flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-base transition-all',
                canAct
                  ? 'bg-zinc-700 hover:bg-zinc-600 text-white active:scale-95'
                  : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
              )}>
              <Minus size={18} /> パス
            </button>
          </div>

          {/* 次の問題・アンドゥ */}
          <div className="flex flex-col gap-2">
            <button
              disabled={!isActive}
              onClick={() => handleDispatch('QUESTION_NEXT')}
              className={cn(
                'flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-base transition-all',
                isActive
                  ? 'bg-blue-700 hover:bg-blue-600 text-white active:scale-95'
                  : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
              )}>
              <SkipForward size={18} /> 次の問題
            </button>
            <button
              disabled={!canUndo}
              onClick={undo}
              className={cn(
                'flex items-center justify-center gap-2 py-2.5 rounded-2xl font-semibold text-sm transition-all',
                canUndo
                  ? 'bg-zinc-700 hover:bg-zinc-600 text-zinc-200 active:scale-95'
                  : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
              )}>
              <RotateCcw size={15} /> アンドゥ
            </button>
          </div>
        </div>
      </div>

      {/* 設定（折りたたみ） */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <button
          onClick={() => setSettingsOpen(!settingsOpen)}
          className="w-full flex items-center justify-between px-5 py-3.5 text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors">
          <span className="text-sm font-semibold">設定・アドバンテージ</span>
          {settingsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {settingsOpen && (
          <div className="px-5 pb-5 space-y-6 border-t border-zinc-800 pt-4">
            {rule.paramDefs.length > 0 && (
              <section>
                <h3 className="text-zinc-300 text-sm font-semibold mb-3">ルール設定</h3>
                {isActive && <p className="text-xs text-yellow-500 mb-2">⚠ 試合中は変更できません</p>}
                <RuleParamsPanel
                  paramDefs={rule.paramDefs}
                  values={localParams}
                  onChange={(key, value) => setLocalParams(prev => ({ ...prev, [key]: value }))}
                  disabled={isActive}
                />
              </section>
            )}
            {matchState && (
              <section>
                <h3 className="text-zinc-300 text-sm font-semibold mb-3">アドバンテージ / ディスアドバンテージ</h3>
                <AdvantagePanel matchState={matchState} onApply={applyAdvantage} />
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
