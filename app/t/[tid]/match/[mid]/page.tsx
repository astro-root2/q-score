import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { GameEngine } from '@/lib/engine/GameEngine'
import { RuleRegistry } from '@/lib/engine/rules'
import MatchConsole from './MatchConsole'

interface Props { params: Promise<{ tid: string; mid: string }> }

export default async function MatchPage({ params }: Props) {
  const { tid, mid } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: match } = await supabase
    .from('matches').select('*, rounds(rule_id, rule_params, tournament_id)').eq('id', mid).single()
  if (!match) notFound()

  const round = match.rounds as { rule_id: string; rule_params: Record<string, number | string | boolean>; tournament_id: string }

  const { data: participants } = await supabase
    .from('participants').select('*').eq('tournament_id', round.tournament_id).eq('status', 'active')

  const { data: events } = await supabase
    .from('game_events').select('*').eq('match_id', mid).order('seq')

  const rule = RuleRegistry.find(round.rule_id)
  if (!rule) notFound()

  let gameState = match.game_state
  if (!gameState && participants && participants.length > 0) {
    gameState = rule.initMatchState(
      mid, match.name ?? `第${match.match_num}試合`,
      participants.map((p, i) => ({ id: p.id, name: p.name, ruby: p.ruby ?? '', position: i + 1 })),
      round.rule_params ?? {}
    )
    const startQ = Number(round.rule_params?._startQ ?? 1)
    if (startQ > 1) gameState.questionNumber = startQ - 1
  }

  if (!gameState) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-zinc-400">参加者が登録されていません</p>
          <a href={`/t/${tid}/setup/participants`} className="text-blue-400 hover:text-blue-300 underline text-sm">
            参加者を登録する
          </a>
        </div>
      </div>
    )
  }

  const replayedState = events && events.length > 0
    ? GameEngine.replay(events as Parameters<typeof GameEngine.replay>[0], gameState)
    : gameState

  return (
    <MatchConsole
      matchId={mid}
      tournamentId={tid}
      initialState={replayedState}
      initialEvents={events ?? []}
      rule={{ id: rule.id, name: rule.name, paramDefs: rule.paramDefs }}
      obsToken={match.obs_token}
      displayToken={match.display_token}
    />
  )
}
