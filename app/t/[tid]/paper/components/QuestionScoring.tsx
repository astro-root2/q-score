// @ts-nocheck
'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Save, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { Participant, PaperQuestion, PaperSubmission } from '../types'

type Result = 'correct' | 'partial' | 'wrong' | null

interface AnswerCell { result: Result; score: number }
type Grid = Record<string, Record<string, AnswerCell>>

function buildGrid(participants: Participant[], questions: PaperQuestion[], subs: PaperSubmission[]): Grid {
  const grid: Grid = {}
  for (const p of participants) {
    grid[p.id] = {}
    const sub = subs.find(s => s.participant_id === p.id)
    const answers: Array<{ question_id: string; result: Result; score: number }> =
      Array.isArray((sub as any)?.answers) ? (sub as any).answers : []
    for (const q of questions) {
      const cell = answers.find(a => a.question_id === q.id)
      grid[p.id][q.id] = cell ? { result: cell.result, score: cell.score } : { result: null, score: 0 }
    }
  }
  return grid
}

function computeTotal(cells: Record<string, AnswerCell>): number {
  return Object.values(cells).reduce((s, c) => s + (c.score ?? 0), 0)
}

interface Props {
  participants: Participant[]
  questions: PaperQuestion[]
  subs: PaperSubmission[]
  selectedRoundId: string
  onSubsChange: (subs: PaperSubmission[]) => void
}

export function QuestionScoring({ participants, questions, subs, selectedRoundId, onSubsChange }: Props) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createClient() as any
  const [grid, setGrid] = useState<Grid>(() => buildGrid(participants, questions, subs))
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const cycleResult = (pid: string, qid: string, points: number) => {
    const cur = grid[pid]?.[qid]?.result ?? null
    const next: Result = cur === null ? 'correct' : cur === 'correct' ? 'partial' : cur === 'partial' ? 'wrong' : null
    const score = next === 'correct' ? points : next === 'partial' ? Math.floor(points / 2) : 0
    setGrid(prev => ({ ...prev, [pid]: { ...prev[pid], [qid]: { result: next, score } } }))
  }

  const save = async () => {
    setSaving(true)
    for (const p of participants) {
      const cells = grid[p.id] ?? {}
      const rawScore = computeTotal(cells)
      const answers = questions.map(q => ({ question_id: q.id, result: cells[q.id]?.result ?? null, score: cells[q.id]?.score ?? 0 }))
      await db.from('paper_submissions').upsert(
        { paper_round_id: selectedRoundId, participant_id: p.id, raw_score: rawScore, answers, proximity_error: null, chain1: 0, chain2: 0, chain3: 0 },
        { onConflict: 'paper_round_id,participant_id' }
      )
    }
    const { data } = await db.from('paper_submissions').select('*').eq('paper_round_id', selectedRoundId)
    if (data) onSubsChange(data)
    setSaving(false)
    setMsg('保存しました')
    setTimeout(() => setMsg(null), 3000)
  }

  if (questions.length === 0) return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 text-zinc-500 text-sm text-center">
      問題を登録してから採点できます
    </div>
  )

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800">
        <h2 className="text-sm font-semibold text-zinc-300">問題別採点</h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-500 hidden sm:block">クリックで ○→△→×→未 と切替</span>
          {msg && <span className="text-xs text-emerald-400">{msg}</span>}
          <button onClick={save} disabled={saving}
            className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg font-bold disabled:opacity-50">
            {saving ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />} 保存
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-500 text-xs">
              <th className="px-4 py-2 text-left sticky left-0 bg-zinc-900 z-10 min-w-[120px]">参加者</th>
              {questions.map((q, i) => (
                <th key={q.id} className="px-2 py-2 text-center min-w-[52px]">
                  <div>Q{i + 1}</div>
                  <div className="text-zinc-600 font-normal">{q.points}pt</div>
                </th>
              ))}
              <th className="px-3 py-2 text-center min-w-[60px]">合計</th>
            </tr>
          </thead>
          <tbody>
            {participants.map(p => {
              const cells = grid[p.id] ?? {}
              return (
                <tr key={p.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/20">
                  <td className="px-4 py-2 sticky left-0 bg-zinc-950 z-10">
                    <div className="text-white font-medium text-sm">{p.name}</div>
                    {p.affiliation && <div className="text-zinc-600 text-xs">{p.affiliation}</div>}
                  </td>
                  {questions.map(q => {
                    const cell = cells[q.id] ?? { result: null, score: 0 }
                    return (
                      <td key={q.id} className="px-1 py-1.5 text-center">
                        <button onClick={() => cycleResult(p.id, q.id, q.points)}
                          className={cn(
                            'w-10 h-9 rounded-lg text-sm font-bold transition-all',
                            cell.result === 'correct' ? 'bg-emerald-600 text-white shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                            : cell.result === 'partial' ? 'bg-yellow-600 text-white'
                            : cell.result === 'wrong'   ? 'bg-red-800/80 text-red-300'
                            : 'bg-zinc-800 text-zinc-600 hover:bg-zinc-700'
                          )}>
                          {cell.result === 'correct' ? '○' : cell.result === 'partial' ? '△' : cell.result === 'wrong' ? '×' : '—'}
                        </button>
                      </td>
                    )
                  })}
                  <td className="px-3 py-2 text-center text-blue-300 font-bold">{computeTotal(cells)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="px-5 py-3 border-t border-zinc-800 flex items-center gap-4 text-xs text-zinc-500">
        <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-emerald-600 inline-block" /> ○ 正解（満点）</span>
        <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-yellow-600 inline-block" /> △ 部分点（半点）</span>
        <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-red-800/80 inline-block" /> × 誤答（0点）</span>
      </div>
    </div>
  )
}
