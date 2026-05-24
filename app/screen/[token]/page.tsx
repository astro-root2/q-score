'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { RuleRegistry } from '@/lib/engine/rules'
import type { MatchState, PlayerState } from '@/lib/engine/types'
import { cn } from '@/lib/utils/cn'

export default function ScreenPage() {
  const { token } = useParams<{ token: string }>()
  const supabase = createClient()
  const [state, setState] = useState<MatchState | null>(null)
  const [matchId, setMatchId] = useState<string | null>(null)
  const [config, setConfig] = useState<Record<string, boolean>>({})

  useEffect(() => {
    supabase.from('matches').select('id, game_state').eq('display_token', token).single()
      .then(({ data }) => {
        if (!data) return
        setMatchId(data.id)
        setState(data.game_state as MatchState)
      })
  }, [token])

  useEffect(() => {
    if (!matchId) return
    const ch = supabase.channel(`match:${matchId}`)
      .on('broadcast', { event: 'STATE_UPDATE' }, ({ payload }) => {
        setState(payload.state as MatchState)
        if (payload.displayConfig) setConfig(payload.displayConfig as Record<string, boolean>)
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [matchId])

  if (!state) return (
    <div className="min-h-screen bg-[#0f1729] flex items-center justify-center">
      <div className="text-[#4a6fa5] text-lg animate-pulse">接続待機中...</div>
    </div>
  )

  const rule = RuleRegistry.find(state.ruleId)
  const active = state.players.filter(p => p.status === 'active')
  const winners = state.players.filter(p => p.status === 'winner')
  const others = state.players.filter(p => p.status === 'eliminated' || p.status === 'resting')

  return (
    <div className="min-h-screen bg-[#0f1729] flex flex-col p-4 gap-4 overflow-hidden">
      {/* ヘッダー */}
      <header className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-6">
          {config.showRoundName !== false && (
            <span className="text-[#7090c0] text-2xl font-bold tracking-widest">ROUND</span>
          )}
          {config.showRuleName !== false && (
            <span className="text-white text-xl font-bold">{state.matchName}</span>
          )}
          <span className="text-[#4a6fa5] text-sm bg-[#1a2a4a] px-3 py-1 rounded">
            {rule?.shortName}
          </span>
        </div>
        <div className="flex items-center gap-4 text-[#7090c0]">
          {config.showPlayerCount !== false && (
            <span className="text-sm">参加: <span className="text-white font-bold">{active.length}</span>名</span>
          )}
          {config.showQuestionNum !== false && state.questionNumber > 0 && (
            <span className="text-4xl font-black text-white">Q<span className="text-[#4a90e2]">{state.questionNumber}</span></span>
          )}
        </div>
      </header>

      {/* 問題文 */}
      {config.showQuestion !== false && state.questionText && (
        <div className="bg-[#1a2a4a] rounded-xl px-6 py-3 text-center">
          <QuestionDisplay text={state.questionText} />
        </div>
      )}

      {/* 勝ち抜け表示 */}
      {winners.length > 0 && (
        <div className="flex gap-3 flex-wrap justify-center">
          {winners.map(p => (
            <div key={p.id} className="flex items-center gap-2 bg-emerald-900/50 border border-emerald-400 rounded-xl px-5 py-2">
              <span className="text-2xl">🏆</span>
              <span className="text-xl font-black text-emerald-300">{p.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* プレイヤーグリッド */}
      <div className="flex-1 flex items-center">
        <div className={cn(
          'w-full grid gap-3',
          active.length <= 4 ? 'grid-cols-4' :
          active.length <= 6 ? 'grid-cols-6' :
          active.length <= 8 ? 'grid-cols-8' : 'grid-cols-10'
        )}>
          {active.map(p => (
            <PlayerCard key={p.id} player={p} rule={rule} showTower={config.showTower !== false} params={state.ruleParams} />
          ))}
        </div>
      </div>

      {/* 退場者/休み */}
      {others.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center">
          {others.map(p => (
            <div key={p.id} className={cn('text-xs px-3 py-1 rounded-full',
              p.status === 'eliminated' ? 'bg-red-900/30 text-red-400 line-through' : 'bg-yellow-900/30 text-yellow-400')}>
              {p.name}{p.status === 'resting' ? ` 休${p.restRemaining}` : ''}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function QuestionDisplay({ text }: { text: string }) {
  const parts = text.split('/')
  return (
    <p className="text-white text-lg leading-relaxed">
      {parts.map((part, i) => (
        <span key={i}>
          {part}
          {i < parts.length - 1 && <span className="text-[#4a90e2] font-black mx-1">/</span>}
        </span>
      ))}
    </p>
  )
}

function PlayerCard({ player, rule, showTower, params }: {
  player: PlayerState
  rule: ReturnType<typeof RuleRegistry.find>
  showTower: boolean
  params: Record<string, number | string | boolean>
}) {
  const display = rule?.getScoreDisplay(player, params)
  const towerPct = display?.towerMax && display.towerMax > 0
    ? Math.min((display.towerValue ?? 0) / display.towerMax * 100, 100) : 0

  const isCorrect = player.lastAnswered === 'correct'
  const isWrong = player.lastAnswered === 'wrong'

  return (
    <div className={cn(
      'flex flex-col rounded-2xl overflow-hidden border-2 transition-all duration-300',
      'border-[#1e3a6a] bg-[#111e36]',
      isCorrect && 'border-emerald-400 shadow-lg shadow-emerald-400/20 scale-105',
      isWrong && 'border-red-500 shadow-lg shadow-red-500/20',
    )}>
      {/* 名前エリア（縦書き） */}
      <div className="flex-1 flex items-center justify-center gap-2 py-4 px-3 min-h-[140px]">
        <div className="writing-vertical text-white font-bold text-lg leading-tight text-center"
          style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>
          {player.name}
        </div>
        {player.nickname && (
          <div className="writing-vertical text-[#7090c0] text-xs"
            style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>
            {player.nickname}
          </div>
        )}
      </div>

      {/* スコアエリア（ポイントタワー） */}
      <div className="relative h-24 overflow-hidden">
        {/* タワー背景 */}
        <div className="absolute inset-0 bg-[#1a3060]" />
        {/* タワーフィル */}
        {showTower && (
          <div
            className="absolute bottom-0 inset-x-0 bg-[#2d5a9e] transition-all duration-700 ease-out"
            style={{ height: `${towerPct}%` }}
          />
        )}
        {/* スコア数値 */}
        <div className="relative z-10 flex items-center justify-center h-full">
          <span className={cn(
            'font-black text-5xl tabular-nums',
            isCorrect ? 'text-emerald-300' : isWrong ? 'text-red-300' : 'text-[#4a90e2]'
          )}>
            {display?.primary?.replace(/[○✕pt]/g, '')}
          </span>
        </div>
      </div>

      {/* 副情報 */}
      <div className="bg-[#0a1528] px-3 py-1.5 flex justify-center gap-3 text-xs text-[#4a6fa5]">
        {player.correct > 0 && <span className="text-emerald-400">{player.correct}○</span>}
        {player.wrong > 0 && <span className="text-red-400">{player.wrong}✕</span>}
        {player.paperRank && <span>#{player.paperRank}</span>}
        {display?.detail && <span className="text-yellow-400">{display.detail}</span>}
      </div>
    </div>
  )
}
