import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import QuestionsClient from './QuestionsClient'

interface Props { params: Promise<{ tid: string }> }

export default async function QuestionsPage({ params }: Props) {
  const { tid } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: tournament } = await supabase
    .from('tournaments').select('*').eq('id', tid).single()
  if (!tournament) notFound()

  const { data: questions } = await supabase
    .from('questions')
    .select('*')
    .eq('tournament_id', tid)
    .order('order_index', { ascending: true })

  return <QuestionsClient tournament={tournament} initialQuestions={questions ?? []} />
}
