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
    .from('participants').select('id, name, ruby, paper_rank').eq('tournament_id', tid).order('position')
  return <PaperClient tournamentId={tid} participants={participants ?? []} />
}
