// @ts-nocheck
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import RoundsClient from './RoundsClient'
import { RuleRegistry } from '@/lib/engine/rules'

interface Props { params: Promise<{ tid: string }> }

export default async function RoundsPage({ params }: Props) {
  const { tid } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: tournament } = await (supabase as any)
    .from('tournaments').select('*').eq('id', tid).single()
  if (!tournament) notFound()

  const { data: rounds } = await (supabase as any)
    .from('rounds').select('*').eq('tournament_id', tid).order('order_index')

  const rules = RuleRegistry.getAll().map(r => ({
    id: r.id, name: r.name, shortName: r.shortName,
    description: r.description, paramDefs: r.paramDefs,
  }))

  return <RoundsClient tournament={tournament} initialRounds={rounds ?? []} rules={rules} />
}
