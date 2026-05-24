'use client'

import { useState } from 'react'
import { useMatchStore } from '@/store/matchStore'
import { useMatchEngine } from './useMatchEngine'
import MatchHeader from './MatchHeader'
import PlayerGrid from './PlayerGrid'
import ActionBar from './ActionBar'
import QuestionBar from './QuestionBar'
import RuleParamsPanel from './RuleParamsPanel'
import AdvantagePanel from './AdvantagePanel'
import type { MatchState, GameEvent, EventType, RuleParamDef } from '@/lib/engine/types'
import { Monitor, Radio, SlidersHorizontal, Zap, PlayCircle } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface Props {
  matchId: string
  tournamentId: string
  initialState: MatchState
  initialEvents: GameEvent[]
  rule: { id: string; name: string; paramDefs: RuleParamDef[] }
}

type Tab = 'play' | 'setup' | 'question'

export default function MatchConsole({ matchId, initialState, initialEvents, rule }: Props) {
  const { dispatch, undo, slash, applyAdvantage, setQuestionText } = useMatchEngine(matchId, initialState, initialEvents)
  const { setSelectedPlayer, matchState } = useMatchStore()
  const [tab, setTab] = useState<Tab>('play')
  const [localParams, setLocalParams] = useState<Record<string, number | string | boolean>>(
    initialState.ruleParams ?? {}
  )

  const isActive = matchState?.status === 'active'
  const isPending = matchState?.status === 'pending'

  const handleDispatch = (type: EventType, actorId?: string) => {
    dispatch(type, actorId)
    if (type === 'CORRECT' || type === 'WRONG') setSelectedPlayer(null)
  }

  const obsToken = initialState.matchId
  const obsUrl = typeof window !== 'undefined' ? `${window.location.origin}/obs/${obsToken}` : ''
  const screenUrl = typeof window !== 'undefined' ? `${window.location.origin}/screen/${obsToken}` : ''

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'play', label: '操作', icon: <PlayCircle size={14} /> },
    { id: 'question', label: '問題文', icon: <Monitor size={14} /> },
    { id: 'setup', label: '設定', icon: <SlidersHorizontal size={14} /> },
  ]

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* ヘッダー */}
      <MatchHeader
        matchName={initialState.matchName}
        ruleName={rule.name}
        onDispatch={(type: EventType) => handleDispatch(type)}
      />

      {/* 外部画面リンク */}
      <div className="flex gap-2 text-xs">
        <a href={obsUrl} target="_blank"
          className="flex items-center gap-1 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-lg transition-colors">
          <Radio size={12} /> OBS配信画面
        </a>
        <a href={screenUrl} target="_blank"
          className="flex items-center gap-1 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-lg transition-colors">
          <Monitor size={12} /> 会場スクリーン
        </a>
      </div>

      {/* プレイヤーグリッド（常時表示） */}
      <PlayerGrid
        ruleId={rule.id}
        onSelect={(id) => setSelectedPlayer(id)}
      />

      {/* タブ */}
      <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
        <div className="flex border-b border-zinc-800">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px',
                tab === t.id
                  ? 'text-white border-blue-500 bg-zinc-800/50'
                  : 'text-zinc-500 border-transparent hover:text-zinc-300'
              )}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        <div className="p-4">
          {/* 操作タブ */}
          {tab === 'play' && (
            <ActionBar
              onDispatch={handleDispatch}
              onUndo={undo}
            />
          )}

          {/* 問題文タブ */}
          {tab === 'question' && (
            <QuestionBar onSlash={slash} onSave={setQuestionText} />
          )}

          {/* 設定タブ */}
          {tab === 'setup' && (
            <div className="space-y-6">
              {/* ルールパラメータ */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <SlidersHorizontal size={14} className="text-blue-400" />
                  <h3 className="text-zinc-300 text-sm font-semibold">ルール設定</h3>
                  {isActive && (
                    <span className="text-xs text-yellow-500 bg-yellow-950/40 px-2 py-0.5 rounded-full">
                      試合中は変更不可
                    </span>
                  )}
                </div>
                <RuleParamsPanel
                  paramDefs={rule.paramDefs}
                  values={localParams}
                  onChange={(key, value) => setLocalParams(prev => ({ ...prev, [key]: value }))}
                  disabled={isActive}
                />
              </section>

              <div className="border-t border-zinc-800" />

              {/* アドバンテージ設定 */}
              {matchState && (
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <Zap size={14} className="text-yellow-400" />
                    <h3 className="text-zinc-300 text-sm font-semibold">アドバンテージ / ディスアドバンテージ</h3>
                    {isActive && (
                      <span className="text-xs text-yellow-500 bg-yellow-950/40 px-2 py-0.5 rounded-full">
                        試合中も適用可
                      </span>
                    )}
                  </div>
                  <AdvantagePanel
                    matchState={matchState}
                    onApply={applyAdvantage}
                  />
                </section>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
