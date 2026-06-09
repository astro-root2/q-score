// @ts-nocheck
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface Params { params: Promise<{ tid: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { tid } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await (supabase as any)
    .from('questions')
    .select('*')
    .eq('tournament_id', tid)
    .order('order_index', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest, { params }: Params) {
  const { tid } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { data, error } = await (supabase as any)
    .from('questions')
    .insert({ ...body, tournament_id: tid })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function PUT(req: NextRequest, { params }: Params) {
  const { tid } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as Array<{
    tournament_id: string
    order_index: number
    body: string
    answer: string
    genre: string | null
    difficulty: number
    note: string | null
    used: boolean
  }>

  await (supabase as any).from('questions').delete().eq('tournament_id', tid)
  const { data, error } = await (supabase as any).from('questions').insert(
    body.map((q, i) => ({ ...q, tournament_id: tid, order_index: i + 1 }))
  ).select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
