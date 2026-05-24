import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import PaperClient from './PaperClient'

interface Props { params: Promise<{ tid: string }> }

export default async function PaperPage({ params }: Props) {
  const { tid } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: tournament } = await supabase
    .from('tournaments').select('id, name, owner_id').eq('id', tid).single()
  if (!tournament || tournament.owner_id !== user.id) notFound()

  const { data: participants } = await supabase
    .from('participants')
    .select('id, name, ruby, affiliation, paper_rank')
    .eq('tournament_id', tid)
    .order('name')

  const { data: paperRounds } = await supabase
    .from('paper_rounds')
    .select('*')
    .eq('tournament_id', tid)
    .order('order_index')

  const roundIds = (paperRounds ?? []).map((r: { id: string }) => r.id)

  const { data: paperQuestions } = roundIds.length
    ? await supabase.from('paper_questions').select('*').in('paper_round_id', roundIds).order('order_index')
    : { data: [] }

  const { data: paperSubmissions } = roundIds.length
    ? await supabase.from('paper_submissions').select('*').in('paper_round_id', roundIds)
    : { data: [] }

  return (
    <PaperClient
      tournamentId={tid}
      participants={participants ?? []}
      paperRounds={paperRounds ?? []}
      paperQuestions={paperQuestions ?? []}
      paperSubmissions={paperSubmissions ?? []}
    />
  )
}
