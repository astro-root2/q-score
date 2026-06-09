// @ts-nocheck
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import ParticipantsClient from './ParticipantsClient'

interface Props { params: Promise<{ tid: string }> }

export default async function ParticipantsPage({ params }: Props) {
  const { tid } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: tournament } = await (supabase as any)
    .from('tournaments').select('*').eq('id', tid).single()
  if (!tournament) notFound()

  const { data: participants } = await (supabase as any)
    .from('participants').select('*').eq('tournament_id', tid).order('created_at')

  const { data: teams } = await (supabase as any)
    .from('teams').select('*').eq('tournament_id', tid).order('created_at')

  return (
    <ParticipantsClient
      tournament={tournament}
      initialParticipants={participants ?? []}
      initialTeams={teams ?? []}
    />
  )
}
