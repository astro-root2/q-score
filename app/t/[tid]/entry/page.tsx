import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import EntryClient from './EntryClient'
import type { EntryForm, EntryResponse } from '@/types/entry'

interface Props { params: Promise<{ tid: string }> }

export default async function EntryPage({ params }: Props) {
  const { tid } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: tournament } = await supabase
    .from('tournaments').select('id,name,owner_id').eq('id', tid).single()
  const t = tournament as any
  if (!t || t.owner_id !== user.id) notFound()

  const db = supabase as any
  const { data: forms } = await db
    .from('entry_forms').select('*').eq('tournament_id', tid).order('created_at') as { data: EntryForm[] | null }

  const formIds = (forms ?? []).map((f: EntryForm) => f.id)
  const { data: responses } = formIds.length
    ? await db.from('entry_responses').select('*').in('form_id', formIds).order('created_at', { ascending: false }) as { data: EntryResponse[] | null }
    : { data: [] as EntryResponse[] }

  return (
    <EntryClient
      tournamentId={tid}
      initialForms={forms ?? []}
      initialResponses={responses ?? []}
    />
  )
}
