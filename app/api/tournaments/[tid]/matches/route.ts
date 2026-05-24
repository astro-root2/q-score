import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest, { params }: { params: Promise<{ tid: string }> }) {
  const { tid } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.formData()
  const round_id = body.get('round_id') as string
  const match_num = Number(body.get('match_num') ?? 1)

  const { data, error } = await supabase.from('matches').insert({
    round_id,
    match_num,
    name: `第${match_num}試合`,
    status: 'pending',
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.redirect(new URL(`/t/${tid}`, req.url))
}
