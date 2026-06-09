import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import PaperClient from './PaperClient'
import type { Participant, PaperRound, PaperQuestion, PaperSubmission } from './types'

interface Props { params: Promise<{ tid: string }> }

export default async function PaperPage({ params }: Props) {
  const { tid } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: tournament } = await db
    .from('tournaments').select('id,name,owner_id').eq('id', tid).single()
  if (!tournament || tournament.owner_id !== user.id) notFound()

  const { data: participants } = await db
    .from('participants').select('id,name,ruby,affiliation,paper_rank')
    .eq('tournament_id', tid).order('name') as { data: Participant[] | null }

  const { data: paperRounds } = await db
    .from('paper_rounds').select('*').eq('tournament_id', tid).order('order_index') as { data: PaperRound[] | null }

  const roundIds = (paperRounds ?? []).map((r: PaperRound) => r.id)

  const { data: paperQuestions } = roundIds.length
    ? await db.from('paper_questions').select('*').in('paper_round_id', roundIds).order('order_index') as { data: PaperQuestion[] | null }
    : { data: [] as PaperQuestion[] }

  const { data: paperSubmissions } = roundIds.length
    ? await db.from('paper_submissions').select('*').in('paper_round_id', roundIds) as { data: PaperSubmission[] | null }
    : { data: [] as PaperSubmission[] }

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
