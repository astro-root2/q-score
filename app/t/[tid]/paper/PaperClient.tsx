'use client'

import { useState, useCallback, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils/cn'
import Papa from 'papaparse'
import { Upload, ChevronUp, ChevronDown, Check, Plus, Trash2, Save, RefreshCw } from 'lucide-react'

interface Participant { id: string; name: string; ruby: string | null; affiliation: string | null; paper_rank: number | null }
interface PaperRound { id: string; name: string; order_index: number; ranking_priority: string[] }
interface PaperQuestion { id: string; paper_round_id: string; order_index: number; question_text: string; correct_answer: string; question_type: string }
interface PaperSubmission {
  id: string; paper_round_id: string; participant_id: string
  raw_score: number; proximity_error: number | null
  chain1: number; chain2: number; chain3: number
}

interface CsvRow {
  no: number; name: string; ruby: string; affiliation: string; grade: string
  raw_score: number; proximity_error: number | null
  chain1: number; chain2: number; chain3: number
}

const SORT_KEYS: { key: string; label: string; asc: boolean }[] = [
  { key: 'raw_score',       label: '素点',       asc: false },
  { key: 'proximity_error', label: '近似値誤差', asc: true  },
  { key: 'chain1',          label: '第1連答',    asc: false },
  { key: 'chain2',          label: '第2連答',    asc: false },
  { key: 'chain3',          label: '第3連答',    asc: false },
]

interface Props {
  tournamentId: string
  participants: Participant[]
  paperRounds: PaperRound[]
  paperQuestions: PaperQuestion[]
  paperSubmissions: PaperSubmission[]
}

type Mode = 'csv' | 'system'

export default function PaperClient({ tournamentId, participants, paperRounds: initRounds, paperQuestions: initQuestions, paperSubmissions: initSubs }: Props) {
  const supabase = createClient()
  const [mode, setMode] = useState<Mode>('csv')

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">ペーパークイズ</h1>
        <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1">
          {(['csv', 'system'] as Mode[]).map(m => (
            <button key={m} onClick={() => setMode(m)}
              className={cn(
                'px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors',
                mode === m ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white'
              )}>
              {m === 'csv' ? 'CSVインポート' : 'システム採点'}
            </button>
          ))}
        </div>
      </div>

      {mode === 'csv'
        ? <CsvMode tournamentId={tournamentId} participants={participants} />
        : <SystemMode
            tournamentId={tournamentId}
            participants={participants}
            initRounds={initRounds}
            initQuestions={initQuestions}
            initSubs={initSubs}
          />
      }
    </div>
  )
}

/* ───────── CSV モード ───────── */
function CsvMode({ tournamentId, participants }: { tournamentId: string; participants: Participant[] }) {
  const supabase = createClient()
  const [rows, setRows] = useState<CsvRow[]>([])
  const [priority, setPriority] = useState(SORT_KEYS.map(k => k.key))
  const [applied, setApplied] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const handleCSV = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    Papa.parse<Record<string, string>>(file, {
      header: true, skipEmptyLines: true,
      complete: ({ data }) => {
        const parsed: CsvRow[] = data.map((r, i) => ({
          no:              Number(r['No'] ?? r['no'] ?? i + 1),
          name:            r['名前'] ?? r['name'] ?? '',
          ruby:            r['読み'] ?? r['ruby'] ?? '',
          affiliation:     r['所属機関'] ?? r['affiliation'] ?? '',
          grade:           r['学年'] ?? r['grade'] ?? '',
          raw_score:       Number(r['素点'] ?? r['raw_score'] ?? 0),
          proximity_error: r['近似値誤差'] != null && r['近似値誤差'] !== '' ? Number(r['近似値誤差']) : null,
          chain1:          Number(r['第1連答'] ?? r['chain1'] ?? 0),
          chain2:          Number(r['第2連答'] ?? r['chain2'] ?? 0),
          chain3:          Number(r['第3連答'] ?? r['chain3'] ?? 0),
        }))
        setRows(parsed)
        setApplied(false)
        setMsg(`${parsed.length}件読み込みました`)
      },
    })
    e.target.value = ''
  }, [])

  const moveKey = (idx: number, dir: -1 | 1) => {
    const next = [...priority]
    const swap = idx + dir
    if (swap < 0 || swap >= next.length) return
    ;[next[idx], next[swap]] = [next[swap], next[idx]]
    setPriority(next)
    setApplied(false)
  }

  const ranked = [...rows].sort((a, b) => {
    for (const key of priority) {
      const def = SORT_KEYS.find(k => k.key === key)!
      const av = (a as Record<string, number | null>)[key] ?? (def.asc ? Infinity : -Infinity)
      const bv = (b as Record<string, number | null>)[key] ?? (def.asc ? Infinity : -Infinity)
      const diff = def.asc ? Number(av) - Number(bv) : Number(bv) - Number(av)
      if (diff !== 0) return diff
    }
    return 0
  })

  const applyRanks = async () => {
    let updated = 0
    for (let i = 0; i < ranked.length; i++) {
      const row = ranked[i]
      const p = participants.find(p => p.name === row.name || p.ruby === row.ruby)
      if (p) {
        await supabase.from('participants').update({ paper_rank: i + 1 }).eq('id', p.id)
        updated++
      }
    }
    setApplied(true)
    setMsg(`${updated}/${ranked.length}件の参加者に順位を反映しました`)
  }

  return (
    <div className="space-y-5">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3">
        <h2 className="text-sm font-semibold text-zinc-300">CSVアップロード</h2>
        <p className="text-xs text-zinc-500">
          形式: <code className="bg-zinc-800 px-1 rounded">No,名前,読み,所属機関,学年,素点,近似値誤差,第1連答,第2連答,第3連答</code>
        </p>
        <label className="flex items-center gap-2 w-fit px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold cursor-pointer transition-colors">
          <Upload size={15} /> CSVを選択
          <input type="file" accept=".csv" className="hidden" onChange={handleCSV} />
        </label>
        {msg && <p className="text-sm text-emerald-400">{msg}</p>}
      </div>

      {rows.length > 0 && (
        <>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3">
            <h2 className="text-sm font-semibold text-zinc-300">順位判定の優先順位</h2>
            <div className="space-y-1">
              {priority.map((key, i) => {
                const def = SORT_KEYS.find(k => k.key === key)!
                return (
                  <div key={key} className="flex items-center gap-3 bg-zinc-800 rounded-lg px-3 py-2">
                    <span className="text-zinc-500 text-sm w-4">{i + 1}</span>
                    <span className="text-white text-sm flex-1">{def.label}</span>
                    <span className="text-zinc-600 text-xs">{def.asc ? '小さい順' : '大きい順'}</span>
                    <button onClick={() => moveKey(i, -1)} disabled={i === 0} className="text-zinc-600 hover:text-white disabled:opacity-20"><ChevronUp size={16} /></button>
                    <button onClick={() => moveKey(i, 1)} disabled={i === priority.length - 1} className="text-zinc-600 hover:text-white disabled:opacity-20"><ChevronDown size={16} /></button>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800">
              <h2 className="text-sm font-semibold text-zinc-300">順位表</h2>
              <button onClick={applyRanks}
                className={cn('flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-bold transition-colors',
                  applied ? 'bg-emerald-700 text-white' : 'bg-yellow-600 hover:bg-yellow-500 text-white')}>
                <Check size={14} />{applied ? '反映済み' : '参加者に順位を反映'}
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-500 text-xs">
                    <th className="px-4 py-2 text-left w-12">順位</th>
                    <th className="px-4 py-2 text-left">名前</th>
                    <th className="px-4 py-2 text-left">所属</th>
                    <th className="px-4 py-2 text-center">素点</th>
                    <th className="px-4 py-2 text-center">近似値誤差</th>
                    <th className="px-4 py-2 text-center">第1連答</th>
                    <th className="px-4 py-2 text-center">第2連答</th>
                    <th className="px-4 py-2 text-center">第3連答</th>
                  </tr>
                </thead>
                <tbody>
                  {ranked.map((row, i) => (
                    <tr key={row.no} className={cn('border-b border-zinc-800/50',
                      i === 0 ? 'bg-yellow-950/30' : i < 3 ? 'bg-zinc-900' : 'bg-zinc-950')}>
                      <td className="px-4 py-2 font-bold text-zinc-300">{i + 1}</td>
                      <td className="px-4 py-2">
                        <div className="text-white font-medium">{row.name}</div>
                        <div className="text-zinc-600 text-xs">{row.ruby}</div>
                      </td>
                      <td className="px-4 py-2 text-zinc-400 text-xs">{row.affiliation}{row.grade && ` ${row.grade}`}</td>
                      <td className="px-4 py-2 text-center text-blue-300 font-bold">{row.raw_score}</td>
                      <td className="px-4 py-2 text-center text-zinc-300">{row.proximity_error != null ? `±${row.proximity_error}` : '—'}</td>
                      <td className="px-4 py-2 text-center text-zinc-300">{row.chain1}</td>
                      <td className="px-4 py-2 text-center text-zinc-300">{row.chain2}</td>
                      <td className="px-4 py-2 text-center text-zinc-300">{row.chain3}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

/* ───────── システム採点モード ───────── */
function SystemMode({ tournamentId, participants, initRounds, initQuestions, initSubs }: {
  tournamentId: string
  participants: Participant[]
  initRounds: PaperRound[]
  initQuestions: PaperQuestion[]
  initSubs: PaperSubmission[]
}) {
  const supabase = createClient()
  const [rounds, setRounds] = useState<PaperRound[]>(initRounds)
  const [questions, setQuestions] = useState<PaperQuestion[]>(initQuestions)
  const [subs, setSubs] = useState<PaperSubmission[]>(initSubs)
  const [selectedRoundId, setSelectedRoundId] = useState<string | null>(initRounds[0]?.id ?? null)
  const [newRoundName, setNewRoundName] = useState('')
  const [newQ, setNewQ] = useState({ text: '', answer: '', type: 'regular' })
  const [saving, setSaving] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [priority, setPriority] = useState(SORT_KEYS.map(k => k.key))
  const [applied, setApplied] = useState(false)
  const [isPending, startTransition] = useTransition()

  const selectedRound = rounds.find(r => r.id === selectedRoundId) ?? null
  const roundQuestions = questions.filter(q => q.paper_round_id === selectedRoundId).sort((a, b) => a.order_index - b.order_index)
  const roundSubs = subs.filter(s => s.paper_round_id === selectedRoundId)

  const getOrCreateSub = (participantId: string): PaperSubmission => {
    return roundSubs.find(s => s.participant_id === participantId) ?? {
      id: '', paper_round_id: selectedRoundId!, participant_id: participantId,
      raw_score: 0, proximity_error: null, chain1: 0, chain2: 0, chain3: 0,
    }
  }

  const updateSubLocal = (participantId: string, field: keyof PaperSubmission, value: number | null) => {
    setSubs(prev => {
      const existing = prev.find(s => s.paper_round_id === selectedRoundId && s.participant_id === participantId)
      if (existing) {
        return prev.map(s =>
          s.paper_round_id === selectedRoundId && s.participant_id === participantId
            ? { ...s, [field]: value }
            : s
        )
      }
      return [...prev, {
        id: '', paper_round_id: selectedRoundId!, participant_id: participantId,
        raw_score: 0, proximity_error: null, chain1: 0, chain2: 0, chain3: 0,
        [field]: value,
      }]
    })
    setApplied(false)
  }

  const saveAllSubs = async () => {
    if (!selectedRoundId) return
    setSaving('subs')
    for (const p of participants) {
      const sub = getOrCreateSub(p.id)
      const payload = {
        paper_round_id: selectedRoundId,
        participant_id: p.id,
        raw_score: sub.raw_score,
        proximity_error: sub.proximity_error,
        chain1: sub.chain1,
        chain2: sub.chain2,
        chain3: sub.chain3,
      }
      await supabase.from('paper_submissions').upsert(payload, { onConflict: 'paper_round_id,participant_id' })
    }
    const { data } = await supabase.from('paper_submissions').select('*').eq('paper_round_id', selectedRoundId)
    if (data) setSubs(prev => [...prev.filter(s => s.paper_round_id !== selectedRoundId), ...data])
    setSaving(null)
    setMsg('採点データを保存しました')
    setTimeout(() => setMsg(null), 3000)
  }

  const createRound = async () => {
    if (!newRoundName.trim()) return
    const { data } = await supabase.from('paper_rounds').insert({
      tournament_id: tournamentId,
      name: newRoundName.trim(),
      order_index: rounds.length,
    }).select().single()
    if (data) {
      setRounds(prev => [...prev, data])
      setSelectedRoundId(data.id)
      setNewRoundName('')
    }
  }

  const deleteRound = async (id: string) => {
    if (!confirm('このラウンドを削除しますか？')) return
    await supabase.from('paper_rounds').delete().eq('id', id)
    setRounds(prev => prev.filter(r => r.id !== id))
    setQuestions(prev => prev.filter(q => q.paper_round_id !== id))
    setSubs(prev => prev.filter(s => s.paper_round_id !== id))
    if (selectedRoundId === id) setSelectedRoundId(rounds.find(r => r.id !== id)?.id ?? null)
  }

  const addQuestion = async () => {
    if (!selectedRoundId || !newQ.text.trim()) return
    const { data } = await supabase.from('paper_questions').insert({
      paper_round_id: selectedRoundId,
      order_index: roundQuestions.length + 1,
      question_text: newQ.text.trim(),
      correct_answer: newQ.answer.trim(),
      question_type: newQ.type,
    }).select().single()
    if (data) {
      setQuestions(prev => [...prev, data])
      setNewQ({ text: '', answer: '', type: 'regular' })
    }
  }

  const deleteQuestion = async (id: string) => {
    await supabase.from('paper_questions').delete().eq('id', id)
    setQuestions(prev => prev.filter(q => q.id !== id))
  }

  const moveKey = (idx: number, dir: -1 | 1) => {
    const next = [...priority]
    const swap = idx + dir
    if (swap < 0 || swap >= next.length) return
    ;[next[idx], next[swap]] = [next[swap], next[idx]]
    setPriority(next)
    setApplied(false)
  }

  const ranked = [...participants].sort((a, b) => {
    const sa = getOrCreateSub(a.id)
    const sb = getOrCreateSub(b.id)
    for (const key of priority) {
      const def = SORT_KEYS.find(k => k.key === key)!
      const av = (sa as Record<string, number | null>)[key] ?? (def.asc ? Infinity : -Infinity)
      const bv = (sb as Record<string, number | null>)[key] ?? (def.asc ? Infinity : -Infinity)
      const diff = def.asc ? Number(av) - Number(bv) : Number(bv) - Number(av)
      if (diff !== 0) return diff
    }
    return 0
  })

  const applyRanks = async () => {
    for (let i = 0; i < ranked.length; i++) {
      await supabase.from('participants').update({ paper_rank: i + 1 }).eq('id', ranked[i].id)
    }
    setApplied(true)
    setMsg(`${ranked.length}件の参加者に順位を反映しました`)
    setTimeout(() => setMsg(null), 3000)
  }

  return (
    <div className="space-y-5">
      {/* ラウンド選択 */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3">
        <h2 className="text-sm font-semibold text-zinc-300">ペーパーラウンド</h2>
        <div className="flex flex-wrap gap-2">
          {rounds.map(r => (
            <div key={r.id} className="flex items-center gap-1">
              <button
                onClick={() => setSelectedRoundId(r.id)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  selectedRoundId === r.id ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-300 hover:text-white'
                )}>
                {r.name}
              </button>
              <button onClick={() => deleteRound(r.id)} className="text-zinc-700 hover:text-red-400 transition-colors">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={newRoundName}
            onChange={e => setNewRoundName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && createRound()}
            placeholder="新しいラウンド名"
            className="flex-1 bg-zinc-800 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button onClick={createRound} disabled={!newRoundName.trim()}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg disabled:opacity-40">
            <Plus size={14} /> 追加
          </button>
        </div>
      </div>

      {selectedRound && (
        <>
          {/* 問題登録 */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3">
            <h2 className="text-sm font-semibold text-zinc-300">問題一覧 — {selectedRound.name}</h2>
            {roundQuestions.length === 0
              ? <p className="text-zinc-600 text-sm">問題が登録されていません（任意）</p>
              : (
                <div className="space-y-1">
                  {roundQuestions.map((q, i) => (
                    <div key={q.id} className="flex items-start gap-2 bg-zinc-800 rounded-lg px-3 py-2">
                      <span className="text-zinc-500 text-xs mt-0.5 w-5 shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-white text-sm">{q.question_text}</div>
                        {q.correct_answer && <div className="text-emerald-500 text-xs">正答: {q.correct_answer}</div>}
                        {q.question_type === 'proximity' && <span className="text-yellow-500 text-xs">近似値問題</span>}
                      </div>
                      <button onClick={() => deleteQuestion(q.id)} className="text-zinc-600 hover:text-red-400 shrink-0">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )
            }
            <div className="space-y-2 pt-1 border-t border-zinc-800">
              <div className="flex gap-2">
                <input
                  value={newQ.text}
                  onChange={e => setNewQ(p => ({ ...p, text: e.target.value }))}
                  placeholder="問題文"
                  className="flex-1 bg-zinc-800 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <select
                  value={newQ.type}
                  onChange={e => setNewQ(p => ({ ...p, type: e.target.value }))}
                  className="bg-zinc-800 text-white text-sm rounded-lg px-2 py-2 focus:outline-none">
                  <option value="regular">通常</option>
                  <option value="proximity">近似値</option>
                </select>
              </div>
              <div className="flex gap-2">
                <input
                  value={newQ.answer}
                  onChange={e => setNewQ(p => ({ ...p, answer: e.target.value }))}
                  placeholder="正答（任意）"
                  className="flex-1 bg-zinc-800 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button onClick={addQuestion} disabled={!newQ.text.trim()}
                  className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg disabled:opacity-40">
                  <Plus size={14} /> 追加
                </button>
              </div>
            </div>
          </div>

          {/* 採点入力 */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800">
              <h2 className="text-sm font-semibold text-zinc-300">採点入力</h2>
              <button onClick={saveAllSubs} disabled={saving === 'subs'}
                className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg font-bold disabled:opacity-50">
                {saving === 'subs' ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
                保存
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-500 text-xs">
                    <th className="px-4 py-2 text-left">参加者</th>
                    <th className="px-3 py-2 text-center w-20">素点</th>
                    <th className="px-3 py-2 text-center w-24">近似値誤差</th>
                    <th className="px-3 py-2 text-center w-20">第1連答</th>
                    <th className="px-3 py-2 text-center w-20">第2連答</th>
                    <th className="px-3 py-2 text-center w-20">第3連答</th>
                  </tr>
                </thead>
                <tbody>
                  {participants.map(p => {
                    const sub = getOrCreateSub(p.id)
                    return (
                      <tr key={p.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                        <td className="px-4 py-1.5">
                          <div className="text-white text-sm font-medium">{p.name}</div>
                          {p.affiliation && <div className="text-zinc-600 text-xs">{p.affiliation}</div>}
                        </td>
                        {(['raw_score', 'proximity_error', 'chain1', 'chain2', 'chain3'] as const).map(field => (
                          <td key={field} className="px-2 py-1.5 text-center">
                            <input
                              type="number"
                              value={sub[field] ?? ''}
                              onChange={e => {
                                const v = e.target.value === '' ? null : Number(e.target.value)
                                updateSubLocal(p.id, field, v)
                              }}
                              className="w-full bg-zinc-800 text-white text-center text-sm rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 [appearance:textfield]"
                              placeholder="—"
                            />
                          </td>
                        ))}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 優先順位と順位表 */}
          <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-2 h-fit">
              <h2 className="text-sm font-semibold text-zinc-300">判定優先順位</h2>
              {priority.map((key, i) => {
                const def = SORT_KEYS.find(k => k.key === key)!
                return (
                  <div key={key} className="flex items-center gap-2 bg-zinc-800 rounded-lg px-3 py-1.5">
                    <span className="text-zinc-600 text-xs w-4">{i + 1}</span>
                    <span className="text-white text-xs flex-1">{def.label}</span>
                    <button onClick={() => moveKey(i, -1)} disabled={i === 0} className="text-zinc-600 hover:text-white disabled:opacity-20"><ChevronUp size={14} /></button>
                    <button onClick={() => moveKey(i, 1)} disabled={i === priority.length - 1} className="text-zinc-600 hover:text-white disabled:opacity-20"><ChevronDown size={14} /></button>
                  </div>
                )
              })}
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800">
                <h2 className="text-sm font-semibold text-zinc-300">順位プレビュー</h2>
                <div className="flex items-center gap-2">
                  {msg && <span className="text-xs text-emerald-400">{msg}</span>}
                  <button onClick={applyRanks}
                    className={cn('flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-bold transition-colors',
                      applied ? 'bg-emerald-700 text-white' : 'bg-yellow-600 hover:bg-yellow-500 text-white')}>
                    <Check size={13} />{applied ? '反映済み' : '参加者に反映'}
                  </button>
                </div>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-500 text-xs">
                    <th className="px-4 py-2 text-left w-12">順位</th>
                    <th className="px-4 py-2 text-left">名前</th>
                    <th className="px-3 py-2 text-center">素点</th>
                    <th className="px-3 py-2 text-center">近似値誤差</th>
                    <th className="px-3 py-2 text-center">第1</th>
                    <th className="px-3 py-2 text-center">第2</th>
                    <th className="px-3 py-2 text-center">第3</th>
                  </tr>
                </thead>
                <tbody>
                  {ranked.map((p, i) => {
                    const sub = getOrCreateSub(p.id)
                    return (
                      <tr key={p.id} className={cn('border-b border-zinc-800/50',
                        i === 0 ? 'bg-yellow-950/20' : i < 3 ? 'bg-zinc-900' : 'bg-zinc-950')}>
                        <td className="px-4 py-2">
                          <span className={cn('font-bold text-lg',
                            i === 0 ? 'text-yellow-400' : i === 1 ? 'text-zinc-300' : i === 2 ? 'text-amber-600' : 'text-zinc-600')}>
                            {i + 1}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-white font-medium">{p.name}</td>
                        <td className="px-3 py-2 text-center text-blue-300 font-bold">{sub.raw_score}</td>
                        <td className="px-3 py-2 text-center text-zinc-300">{sub.proximity_error != null ? `±${sub.proximity_error}` : '—'}</td>
                        <td className="px-3 py-2 text-center text-zinc-300">{sub.chain1}</td>
                        <td className="px-3 py-2 text-center text-zinc-300">{sub.chain2}</td>
                        <td className="px-3 py-2 text-center text-zinc-300">{sub.chain3}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
