// @ts-nocheck
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import TurnoverClient from './TurnoverClient'

interface Props { params: Promise<{ tid: string }> }

export default async function TurnoverPage({ params }: Props) {
  const { tid } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data: tournament } = await db
    .from('tournaments').select('id,name,owner_id,theme_color,settings').eq('id', tid).single()
  if (!tournament || tournament.owner_id !== user.id) notFound()

  const { data: participants } = await db
    .from('participants')
    .select('id,name,ruby,affiliation,paper_rank')
    .eq('tournament_id', tid)
    .eq('status', 'active')
    .not('paper_rank', 'is', null)
    .order('paper_rank', { ascending: true }) as { data: Array<{ id: string; name: string; ruby: string | null; affiliation: string | null; paper_rank: number | null }> | null }

  return (
    <TurnoverClient
      tournamentName={tournament.name}
      themeColor={tournament.theme_color ?? '#00e5ff'}
      participants={participants ?? []}
      rankTiers={tournament.settings?.rankColorTiers ?? null}
    />
  )
}
