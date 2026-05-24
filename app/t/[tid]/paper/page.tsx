import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PaperClient from './PaperClient'

export default async function PaperPage({ params }: { params: { tid: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: tournament } = await supabase
    .from('tournaments').select('id, name, owner_id').eq('id', params.tid).single()
  if (!tournament || tournament.owner_id !== user.id) redirect('/')

  const { data: rounds } = await supabase
    .from('paper_rounds')
    .select(`*, paper_questions(*), paper_submissions(*, participants(*))`)
    .eq('tournament_id', params.tid)
    .order('order_index')

  const { data: participants } = await supabase
    .from('participants').select('*').eq('tournament_id', params.tid).order('position')

  return (
    <PaperClient
      tournamentId={params.tid}
      initialRounds={rounds ?? []}
      participants={participants ?? []}
    />
  )
}
