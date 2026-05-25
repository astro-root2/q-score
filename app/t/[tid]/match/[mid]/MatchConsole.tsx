'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useMatchStore, selectCanUndo } from '@/store/matchStore'
import { useMatchEngine } from './useMatchEngine'
import PlayerGrid from './PlayerGrid'
import RuleParamsPanel from './RuleParamsPanel'
import AdvantagePanel from './AdvantagePanel'
import { MatchHeader } from './components/MatchHeader'
import { QuestionBar } from './components/QuestionBar'
import { ActionPanel } from './components/ActionPanel'
import type { MatchState, GameEvent, EventType, RuleParamDef } from '@/lib/engine/types'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface Question {
  id: string; order_index: number; body: string; answer: string; genre: string | null; used: boolean
}
interface Props {
  matchId: string; tournamentId: string
  initialState: MatchState; initialEvents: GameEvent[]
  rule: { id: string; name: string; paramDefs: RuleParamDef[] }
  obsToken: string; displayToken: string; staffToken: string
  questions: Question[]
}

export default function MatchConsole({ matchId, initialState, initialEvents, rule, tournamentId, obsToken, displayToken, staffToken, questions: initialQuestions }: Props) {
  const supabase = createClient()
  const { setSelectedPlayer, matchState, selectedPlayerId, isConnected, error } = useMatchStore()
  const canUndo = useMatchStore(selectCanUndo)

  const [questions, setQuestions]   = useState<Question[]>(initialQuestions)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [localParams, setLocalParams]   = useState<Record<string, number | string | boolean>>(initialState?.ruleParams ?? {})

  const status   = matchState?.status ?? 'pending'
  const isActive = status === 'active'
  const isPaused = status === 'paused'

  const unusedQuestions  = questions.filter(q => !q.used).sort((a, b) => a.order_index - b.order_index)
  const currentQuestion  = unusedQuestions[0] ?? null
  const selectedPlayer   = matchState?.players.find(p => p.id === selectedPlayerId) ?? null
  const canAct           = isActive && !!selectedPlayerId

  const handleDispatch = (type: EventType, actorId?: string) => {
    dispatch(type, actorId)
    if (type === 'CORRECT' || type === 'WRONG') setSelectedPlayer(null)
  }

  const handleNextQuestion = async () => {
    if (currentQuestion) {
      setQuestionText(currentQuestion.body)
      await supabase.from('questions').update({ used: true }).eq('id', currentQuestion.id)
      setQuestions(prev => prev.map(q => q.id === currentQuestion.id ? { ...q, used: true } : q))
    }
    handleDispatch('QUESTION_NEXT')
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  return (
    <div className="flex flex-col gap-3 max-w-6xl mx-auto pb-8">
      <MatchHeader
        matchName={matchState?.matchName ?? initialState.matchName}
        ruleName={rule.name}
        status={status}
        questionNumber={matchState?.questionNumber ?? 0}
        unusedCount={unusedQuestions.length}
        isConnected={isConnected}
        error={error}
        obsUrl={`${origin}/obs/${obsToken}`}
        screenUrl={`${origin}/screen/${displayToken}`}
        staffUrl={`${origin}/staff/${staffToken}`}
        onStart={() => handleDispatch('MATCH_START')}
        onPause={() => handleDispatch('MATCH_PAUSE')}
        onResume={() => handleDispatch('MATCH_RESUME')}
        onEnd={() => handleDispatch('MATCH_END')}
      />

      <QuestionBar
        currentQuestion={currentQuestion}
        savedText={matchState?.questionText ?? null}
        onSave={setQuestionText}
        unusedCount={unusedQuestions.length}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-3">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <PlayerGrid ruleId={rule.id} onSelect={id => setSelectedPlayer(selectedPlayerId === id ? null : id)} />
        </div>
        <ActionPanel
          selectedPlayer={selectedPlayer}
          canAct={canAct}
          canUndo={canUndo}
          isActive={isActive}
          unusedCount={unusedQuestions.length}
          onCorrect={() => handleDispatch('CORRECT', selectedPlayerId!)}
          onWrong={() => handleDispatch('WRONG', selectedPlayerId!)}
          onPass={() => handleDispatch('PASS', selectedPlayerId!)}
          onNext={handleNextQuestion}
          onUndo={undo}
        />
      </div>

      {/* 設定（折りたたみ） */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <button onClick={() => setSettingsOpen(!settingsOpen)}
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
                <RuleParamsPanel paramDefs={rule.paramDefs} values={localParams} onChange={(key, value) => setLocalParams(prev => ({ ...prev, [key]: value }))} disabled={isActive} />
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
