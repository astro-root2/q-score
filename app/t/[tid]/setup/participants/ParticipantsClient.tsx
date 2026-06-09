// @ts-nocheck
'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils/cn'
import { Plus, Trash2, Users, Upload, Download } from 'lucide-react'
import Papa from 'papaparse'

interface Participant {
  id: string; tournament_id: string; team_id: string | null
  name: string; ruby: string | null; status: string
  nickname: string | null; affiliation: string | null; grade: string | null; paper_rank: number | null
}
interface Team { id: string; tournament_id: string; name: string }
interface Props {
  tournament: { id: string; name: string; settings: Record<string, unknown> }
  initialParticipants: Participant[]
  initialTeams: Team[]
}

export default function ParticipantsClient({ tournament, initialParticipants, initialTeams }: Props) {
  const supabase = createClient()
  const [participants, setParticipants] = useState<Participant[]>(initialParticipants)
  const [teams, setTeams] = useState<Team[]>(initialTeams)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const isTeamMode = tournament.settings?.format === 'team'

  const addRow = () => {
    setParticipants(prev => [...prev, {
      id: `new-${Date.now()}`,
      tournament_id: tournament.id,
      team_id: null, name: '', ruby: '', status: 'active',
      nickname: null, affiliation: null, grade: null, paper_rank: null,
    }])
  }

  const update = (id: string, field: keyof Participant, value: unknown) => {
    setParticipants(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p))
  }

  const remove = async (p: Participant) => {
    if (!p.id.startsWith('new-')) {
      await (supabase as any).from('participants').delete().eq('id', p.id)
    }
    setParticipants(prev => prev.filter(x => x.id !== p.id))
  }

  const handleCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    Papa.parse<Record<string, string>>(file, {
      header: true, skipEmptyLines: true,
      complete: ({ data }) => {
        const imported: Participant[] = data.map((row, i) => ({
          id: `new-${Date.now()}-${i}`,
          tournament_id: tournament.id,
          team_id: null,
          name: row['name'] ?? row['名前'] ?? '',
          ruby: row['ruby'] ?? row['読み'] ?? '',
          status: 'active',
          nickname: row['nickname'] ?? row['二つ名'] ?? null,
          affiliation: row['affiliation'] ?? row['所属'] ?? null,
          grade: row['grade'] ?? row['学年'] ?? null,
          paper_rank: row['paper_rank'] ? Number(row['paper_rank']) : null,
        }))
        setParticipants(prev => [...prev, ...imported])
        setMsg(`${imported.length} 名インポートしました`)
      },
    })
    e.target.value = ''
  }

  const exportCSV = () => {
    const rows = participants.map(p => ({
      name: p.name, ruby: p.ruby ?? '',
      nickname: p.nickname ?? '', affiliation: p.affiliation ?? '', grade: p.grade ?? '',
      paper_rank: p.paper_rank ?? '',
      team: teams.find(t => t.id === p.team_id)?.name ?? '',
      status: p.status,
    }))
    const csv = Papa.unparse(rows)
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `participants_${tournament.id}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const save = async () => {
    setSaving(true); setMsg(null)
    try {
      await (supabase as any).from('participants').delete().eq('tournament_id', tournament.id)
      const rows = participants.map(p => ({
        tournament_id: tournament.id,
        team_id: p.team_id || null,
        name: p.name,
        ruby: p.ruby || null,
        nickname: p.nickname || null,
        affiliation: p.affiliation || null,
        grade: p.grade || null,
        paper_rank: p.paper_rank ?? null,
        status: p.status,
      }))
      const { data, error } = await (supabase as any).from('participants').insert(rows).select()
      if (error) throw error
      setParticipants(data ?? [])
      setMsg('保存しました ✓')
    } catch (e) {
      setMsg(`エラー: ${(e as Error).message}`)
    } finally {
      setSaving(false)
    }
  }

  const addTeam = async () => {
    const name = `チーム ${teams.length + 1}`
    const { data, error } = await (supabase as any)
      .from('teams').insert({ tournament_id: tournament.id, name }).select().single()
    if (!error && data) setTeams(prev => [...prev, data])
  }

  const removeTeam = async (t: Team) => {
    await (supabase as any).from('teams').delete().eq('id', t.id)
    setTeams(prev => prev.filter(x => x.id !== t.id))
    setParticipants(prev => prev.map(p => p.team_id === t.id ? { ...p, team_id: null } : p))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Users size={20} className="text-cyan-400" />
          <h1 className="text-xl font-bold text-white">参加者管理</h1>
          <span className="text-sm text-zinc-400">{participants.length} 名</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleCSV} />
          <button onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg transition-colors">
            <Upload size={14} /> CSV
          </button>
          <button onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg transition-colors">
            <Download size={14} /> CSV
          </button>
          <button onClick={addRow}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors">
            <Plus size={14} /> 参加者追加
          </button>
          <button onClick={save} disabled={saving}
            className="flex items-center gap-1.5 px-4 py-1.5 text-sm bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg font-bold transition-colors">
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>

      {msg && (
        <div className={cn('px-4 py-2 rounded-lg text-sm',
          msg.startsWith('エラー') ? 'bg-red-900/50 text-red-300' : 'bg-emerald-900/50 text-emerald-300')}>
          {msg}
        </div>
      )}

      {isTeamMode && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-white">チーム</span>
            <button onClick={addTeam}
              className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300">
              <Plus size={12} /> チーム追加
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {teams.map(t => (
              <div key={t.id} className="flex items-center gap-1 bg-zinc-800 rounded-lg px-2 py-1 text-sm text-white">
                {t.name}
                <button onClick={() => removeTeam(t)} className="text-zinc-500 hover:text-red-400 ml-1">
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
            {teams.length === 0 && <span className="text-xs text-zinc-500">チームなし</span>}
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/50">
              <th className="px-3 py-2 text-left text-zinc-400 w-10">#</th>
              <th className="px-3 py-2 text-left text-zinc-400">名前</th>
              <th className="px-3 py-2 text-left text-zinc-400 w-36">読み (ruby)</th>
              <th className="px-3 py-2 text-left text-zinc-400 w-28">二つ名</th>
              <th className="px-3 py-2 text-left text-zinc-400 w-28">所属</th>
              <th className="px-3 py-2 text-left text-zinc-400 w-20">学年</th>
              <th className="px-3 py-2 text-center text-zinc-400 w-16">P順位</th>
              {isTeamMode && <th className="px-3 py-2 text-left text-zinc-400 w-32">チーム</th>}
              <th className="px-3 py-2 text-center text-zinc-400 w-20">状態</th>
              <th className="px-3 py-2 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {participants.length === 0 && (
              <tr>
                <td colSpan={isTeamMode ? 10 : 9} className="px-4 py-8 text-center text-zinc-500">
                  参加者がいません
                </td>
              </tr>
            )}
            {participants.map((p, i) => (
              <tr key={p.id} className="border-b border-zinc-800/50 hover:bg-zinc-900/30 transition-colors">
                <td className="px-3 py-1.5 text-zinc-500">{i + 1}</td>
                <td className="px-3 py-1.5">
                  <input value={p.name} onChange={e => update(p.id, 'name', e.target.value)}
                    placeholder="名前" className="w-full bg-transparent text-white placeholder-zinc-600 focus:outline-none focus:bg-zinc-800/50 rounded px-1 py-0.5" />
                </td>
                <td className="px-3 py-1.5">
                  <input value={p.ruby ?? ''} onChange={e => update(p.id, 'ruby', e.target.value)}
                    placeholder="よみ" className="w-full bg-transparent text-zinc-400 placeholder-zinc-600 focus:outline-none focus:bg-zinc-800/50 rounded px-1 py-0.5" />
                </td>
                <td className="px-3 py-1.5">
                  <input value={p.nickname ?? ''} onChange={e => update(p.id, 'nickname', e.target.value || null)}
                    placeholder="—" className="w-full bg-transparent text-yellow-400 placeholder-zinc-600 focus:outline-none focus:bg-zinc-800/50 rounded px-1 py-0.5" />
                </td>
                <td className="px-3 py-1.5">
                  <input value={p.affiliation ?? ''} onChange={e => update(p.id, 'affiliation', e.target.value || null)}
                    placeholder="—" className="w-full bg-transparent text-zinc-300 placeholder-zinc-600 focus:outline-none focus:bg-zinc-800/50 rounded px-1 py-0.5" />
                </td>
                <td className="px-3 py-1.5">
                  <input value={p.grade ?? ''} onChange={e => update(p.id, 'grade', e.target.value || null)}
                    placeholder="—" className="w-full bg-transparent text-zinc-300 placeholder-zinc-600 focus:outline-none focus:bg-zinc-800/50 rounded px-1 py-0.5" />
                </td>
                <td className="px-3 py-1.5 text-center">
                  <input type="number" value={p.paper_rank ?? ''} onChange={e => update(p.id, 'paper_rank', e.target.value ? Number(e.target.value) : null)}
                    placeholder="—" className="w-12 bg-transparent text-zinc-300 placeholder-zinc-600 focus:outline-none focus:bg-zinc-800/50 rounded px-1 py-0.5 text-center" />
                </td>
                {isTeamMode && (
                  <td className="px-3 py-1.5">
                    <select value={p.team_id ?? ''} onChange={e => update(p.id, 'team_id', e.target.value || null)}
                      className="w-full bg-zinc-800 text-zinc-300 rounded px-1 py-0.5 text-xs">
                      <option value="">未所属</option>
                      {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </td>
                )}
                <td className="px-3 py-1.5 text-center">
                  <select value={p.status} onChange={e => update(p.id, 'status', e.target.value)}
                    className="bg-zinc-800 text-zinc-300 rounded px-1 py-0.5 text-xs">
                    <option value="active">参加</option>
                    <option value="withdrawn">棄権</option>
                  </select>
                </td>
                <td className="px-3 py-1.5 text-center">
                  <button onClick={() => remove(p)} className="p-1 text-zinc-600 hover:text-red-400 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
