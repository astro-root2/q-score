// @ts-nocheck
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import ResultsClient from './ResultsClient'

interface Props { params: Promise<{ tid: string }> }

export default async function ResultsPage({ params }: Props) {
  const { tid } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: tournament } = await (supabase as any)
    .from('tournaments').select('*').eq('id', tid).single()
  if (!tournament) notFound()

  const { data: rounds } = await (supabase as any)
    .from('rounds').select('*').eq('tournament_id', tid).order('order_index')

  const roundIds = (rounds ?? []).map((r: { id: string }) => r.id)

  const { data: matches } = await (supabase as any)
    .from('matches').select('*').in('round_id', roundIds.length ? roundIds : [''])

  const matchIds = (matches ?? []).map((m: { id: string }) => m.id)

  const { data: participants } = await (supabase as any)
    .from('participants')
    .select('id, name, ruby, affiliation, paper_rank, final_rank')
    .eq('tournament_id', tid)

  const { data: events } = await (supabase as any)
    .from('game_events')
    .select('match_id, event_type, actor_id, undone')
    .in('match_id', matchIds.length ? matchIds : [''])
    .eq('undone', false)

  return (
    <ResultsClient
      tournament={tournament}
      rounds={rounds ?? []}
      matches={matches ?? []}
      participants={participants ?? []}
      events={events ?? []}
    />
  )
}
