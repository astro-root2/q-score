// @ts-nocheck
'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2, Save, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { SORT_KEYS } from '../types'
import type { Participant, PaperRound, PaperQuestion, PaperSubmission } from '../types'
import { PriorityEditor } from './PriorityEditor'
import { SystemRankTable } from './RankTable'
import { QuestionScoring } from './QuestionScoring'

type ScoreTab = 'aggregate' | 'per_question'

interface Props {
  tournamentId: string
  participants: Participant[]
  initRounds: PaperRound[]
  initQuestions: PaperQuestion[]
  initSubs: PaperSubmission[]
}

export function SystemMode({ tournamentId, participants, initRounds, initQuestions, initSubs }: Props) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createClient() as any
  const [rounds, setRounds]       = useState<PaperRound[]>(initRounds)
  const [questions, setQuestions] = useState<PaperQuestion[]>(initQuestions)
  const [subs, setSubs]           = useState<PaperSubmission[]>(initSubs)
  const [selectedRoundId, setSelectedRoundId] = useState<string | null>(initRounds[0]?.id ?? null)
  const [newRoundName, setNewRoundName] = useState('')
  const [newQ, setNewQ] = useState({ text: '', answer: '', type: 'regular', points: 1 })
  const [saving, setSaving]   = useState(false)
  const [msg, setMsg]         = useState<string | null>(null)
  const [priority, setPriority] = useState(SORT_KEYS.map(k => k.key))
  const [applied, setApplied] = useState(false)
  const [scoreTab, setScoreTab] = useState<ScoreTab>('aggregate')

  const selectedRound  = rounds.find(r => r.id === selectedRoundId) ?? null
  const roundQuestions = questions.filter(q => q.paper_round_id === selectedRoundId).sort((a, b) => a.order_index - b.order_index)
  const roundSubs      = subs.filter(s => s.paper_round_id === selectedRoundId)

  const getOrCreateSub = (participantId: string): PaperSubmission =>
    roundSubs.find(s => s.participant_id === participantId) ?? {
      id: '', paper_round_id: selectedRoundId!, participant_id: participantId,
      raw_score: 0, proximity_error: null, chain1: 0, chain2: 0, chain3: 0,
    }

  const updateSubLocal = (participantId: string, field: keyof PaperSubmission, value: number | null) => {
    setSubs(prev => {
      const exists = prev.find(s => s.paper_round_id === selectedRoundId && s.participant_id === participantId)
      if (exists) return prev.map(s => s.paper_round_id === selectedRoundId && s.participant_id === participantId ? { ...s, [field]: value } : s)
      return [...prev, { id: '', paper_round_id: selectedRoundId!, participant_id: participantId, raw_score: 0, proximity_error: null, chain1: 0, chain2: 0, chain3: 0, [field]: value }]
    })
    setApplied(false)
  }

  const saveAllSubs = async () => {
    if (!selectedRoundId) return
    setSaving(true)
    for (const p of participants) {
      const sub = getOrCreateSub(p.id)
      await db.from('paper_submissions').upsert(
        { paper_round_id: selectedRoundId, participant_id: p.id, raw_score: sub.raw_score, proximity_error: sub.proximity_error, chain1: sub.chain1, chain2: sub.chain2, chain3: sub.chain3 },
        { onConflict: 'paper_round_id,participant_id' }
      )
    }
    const { data } = await db.from('paper_submissions').select('*').eq('paper_round_id', selectedRoundId)
    if (data) setSubs(prev => [...prev.filter(s => s.paper_round_id !== selectedRoundId), ...data])
    setSaving(false)
    setMsg('保存しました')
    setTimeout(() => setMsg(null), 3000)
  }

  const createRound = async () => {
    if (!newRoundName.trim()) return
    const { data } = await db.from('paper_rounds').insert({ tournament_id: tournamentId, name: newRoundName.trim(), order_index: rounds.length }).select().single()
    if (data) { setRounds(prev => [...prev, data]); setSelectedRoundId(data.id); setNewRoundName('') }
  }

  const deleteRound = async (id: string) => {
    if (!confirm('このラウンドを削除しますか？')) return
    await db.from('paper_rounds').delete().eq('id', id)
    setRounds(prev => prev.filter(r => r.id !== id))
    setQuestions(prev => prev.filter(q => q.paper_round_id !== id))
    setSubs(prev => prev.filter(s => s.paper_round_id !== id))
    if (selectedRoundId === id) setSelectedRoundId(rounds.find(r => r.id !== id)?.id ?? null)
  }

  const addQuestion = async () => {
    if (!selectedRoundId || !newQ.text.trim()) return
    const { data } = await db.from('paper_questions').insert({
      paper_round_id: selectedRoundId, order_index: roundQuestions.length + 1,
      question_text: newQ.text.trim(), correct_answer: newQ.answer.trim(),
      question_type: newQ.type, points: newQ.points,
    }).select().single()
    if (data) { setQuestions(prev => [...prev, data]); setNewQ({ text: '', answer: '', type: 'regular', points: 1 }) }
  }

  const deleteQuestion = async (id: string) => {
    await db.from('paper_questions').delete().eq('id', id)
    setQuestions(prev => prev.filter(q => q.id !== id))
  }

  const ranked = [...participants].sort((a, b) => {
    const sa = getOrCreateSub(a.id)
    const sb = getOrCreateSub(b.id)
    for (const key of priority) {
      const def = SORT_KEYS.find(k => k.key === key)!
      const av = (sa as unknown as Record<string, number | null>)[key] ?? (def.asc ? Infinity : -Infinity)
      const bv = (sb as unknown as Record<string, number | null>)[key] ?? (def.asc ? Infinity : -Infinity)
      const diff = def.asc ? Number(av) - Number(bv) : Number(bv) - Number(av)
      if (diff !== 0) return diff
    }
    return 0
  })

  const applyRanks = async () => {
    for (let i = 0; i < ranked.length; i++)
      await db.from('participants').update({ paper_rank: i + 1 }).eq('id', ranked[i].id)
    setApplied(true)
    setMsg(`${ranked.length}件反映しました`)
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
              <button onClick={() => setSelectedRoundId(r.id)}
                className={cn('px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  selectedRoundId === r.id ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-300 hover:text-white')}>
                {r.name}
              </button>
              <button onClick={() => deleteRound(r.id)} className="text-zinc-700 hover:text-red-400">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={newRoundName} onChange={e => setNewRoundName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && createRound()} placeholder="新しいラウンド名"
            className="flex-1 bg-zinc-800 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
          <button onClick={createRound} disabled={!newRoundName.trim()}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg disabled:opacity-40">
            <Plus size={14} /> 追加
          </button>
        </div>
      </div>

      {selectedRound && (
        <>
          {/* 問題一覧 */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3">
            <h2 className="text-sm font-semibold text-zinc-300">問題一覧 — {selectedRound.name}</h2>
            {roundQuestions.length === 0
              ? <p className="text-zinc-600 text-sm">問題が登録されていません（任意）</p>
              : <div className="space-y-1">
                  {roundQuestions.map((q, i) => (
                    <div key={q.id} className="flex items-start gap-2 bg-zinc-800 rounded-lg px-3 py-2">
                      <span className="text-zinc-500 text-xs mt-0.5 w-5 shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-white text-sm">{q.question_text}</div>
                        {q.correct_answer && <div className="text-emerald-500 text-xs">正答: {q.correct_answer}</div>}
                        {q.question_type === 'proximity' && <span className="text-yellow-500 text-xs">近似値問題</span>}
                      </div>
                      <span className="text-blue-400 text-xs font-bold shrink-0">{q.points}pt</span>
                      <button onClick={() => deleteQuestion(q.id)} className="text-zinc-600 hover:text-red-400 shrink-0">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
            }
            <div className="space-y-2 pt-1 border-t border-zinc-800">
              <div className="flex gap-2">
                <input value={newQ.text} onChange={e => setNewQ(p => ({ ...p, text: e.target.value }))} placeholder="問題文"
                  className="flex-1 bg-zinc-800 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                <select value={newQ.type} onChange={e => setNewQ(p => ({ ...p, type: e.target.value }))}
                  className="bg-zinc-800 text-white text-sm rounded-lg px-2 py-2 focus:outline-none">
                  <option value="regular">通常</option>
                  <option value="proximity">近似値</option>
                </select>
                <input type="number" value={newQ.points} min={1}
                  onChange={e => setNewQ(p => ({ ...p, points: Number(e.target.value) }))}
                  className="w-16 bg-zinc-800 text-white text-sm rounded-lg px-2 py-2 focus:outline-none text-center"
                  title="配点" />
              </div>
              <div className="flex gap-2">
                <input value={newQ.answer} onChange={e => setNewQ(p => ({ ...p, answer: e.target.value }))} placeholder="正答（任意）"
                  className="flex-1 bg-zinc-800 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                <button onClick={addQuestion} disabled={!newQ.text.trim()}
                  className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg disabled:opacity-40">
                  <Plus size={14} /> 追加
                </button>
              </div>
            </div>
          </div>

          {/* 採点モード切替 */}
          <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1 w-fit">
            {([['aggregate', '集計入力'], ['per_question', '問題別採点']] as [ScoreTab, string][]).map(([id, label]) => (
              <button key={id} onClick={() => setScoreTab(id)}
                className={cn('px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors',
                  scoreTab === id ? 'bg-purple-600 text-white' : 'text-zinc-400 hover:text-white')}>
                {label}
              </button>
            ))}
          </div>

          {scoreTab === 'per_question' ? (
            <QuestionScoring
              participants={participants}
              questions={roundQuestions}
              subs={roundSubs}
              selectedRoundId={selectedRoundId!}
              onSubsChange={newSubs => setSubs(prev => [...prev.filter(s => s.paper_round_id !== selectedRoundId), ...newSubs])}
            />
          ) : (
            <>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800">
                  <h2 className="text-sm font-semibold text-zinc-300">集計入力</h2>
                  <button onClick={saveAllSubs} disabled={saving}
                    className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg font-bold disabled:opacity-50">
                    {saving ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />} 保存
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
                                <input type="number"
                                  value={sub[field] ?? ''}
                                  onChange={e => updateSubLocal(p.id, field, e.target.value === '' ? null : Number(e.target.value))}
                                  className="w-full bg-zinc-800 text-white text-center text-sm rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 [appearance:textfield]"
                                  placeholder="—" />
                              </td>
                            ))}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-2 h-fit">
              <h2 className="text-sm font-semibold text-zinc-300">判定優先順位</h2>
              <PriorityEditor priority={priority} onChange={(p: string[]) => { setPriority(p as typeof priority); setApplied(false) }} />
            </div>
            <SystemRankTable ranked={ranked} getSub={getOrCreateSub} applied={applied} msg={msg} onApply={applyRanks} />
          </div>
        </>
      )}
    </div>
  )
}
