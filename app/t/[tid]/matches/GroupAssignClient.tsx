// @ts-nocheck
'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Users, Check, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface Participant { id: string; name: string; affiliation: string | null; paper_rank: number | null }

interface Props {
  matchId: string
  participants: Participant[]
  initialAssigned: string[]
}

export function GroupAssignClient({ matchId, participants, initialAssigned }: Props) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createClient() as any
  const [assigned, setAssigned] = useState<Set<string>>(new Set(initialAssigned))
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  const toggle = (id: string) =>
    setAssigned(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })

  const save = async () => {
    setSaving(true)
    await db.from('match_participants').delete().eq('match_id', matchId)
    const rows = Array.from(assigned).map((pid, i) => ({ match_id: matchId, participant_id: pid, position: i + 1 }))
    if (rows.length > 0) await db.from('match_participants').insert(rows)
    setMsg(`${rows.length}名 割当済`)
    setSaving(false)
    setTimeout(() => setMsg(null), 3000)
  }

  const sorted = [...participants].sort((a, b) => (a.paper_rank ?? 9999) - (b.paper_rank ?? 9999))

  return (
    <div className="ml-4 border-l-2 border-zinc-800 pl-4">
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors py-1">
        <Users size={13} />
        <span>参加者割当 ({assigned.size}名)</span>
        {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>

      {open && (
        <div className="mt-2 space-y-2 pb-2">
          <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
            {sorted.map(p => (
              <button key={p.id} onClick={() => toggle(p.id)}
                className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all border',
                  assigned.has(p.id)
                    ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500')}>
                {assigned.has(p.id) && <Check size={11} />}
                {p.paper_rank != null && <span className="text-zinc-500">{p.paper_rank}位</span>}
                {p.name}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={save} disabled={saving}
              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs rounded-lg font-bold disabled:opacity-50 transition-colors">
              {saving ? '保存中...' : '割当を保存'}
            </button>
            {msg && <span className="text-xs text-emerald-400">{msg}</span>}
            <span className="text-xs text-zinc-600">{assigned.size} / {participants.length}名</span>
          </div>
        </div>
      )}
    </div>
  )
}
