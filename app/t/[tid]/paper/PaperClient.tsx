'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils/cn'
import { Plus, ChevronDown, ChevronUp, GripVertical, Camera, Check, X } from 'lucide-react'

// ─── 型 ────────────────────────────────────────────────────────────────────────
interface PaperQuestion {
  id: string
  order_index: number
  question_text: string
  correct_answer: string
  question_type: 'regular' | 'proximity'
}

interface Participant {
  id: string
  name: string
  ruby: string
  position: number
}

interface Submission {
  id: string
  participant_id: string
  photo_url: string | null
  submitted_at: string | null
  raw_score: number
  proximity_error: number | null
  chain1: number
  chain2: number
  chain3: number
  answers: AnswerEntry[]
  participants: Participant
}

interface AnswerEntry {
  question_id: string
  is_correct: boolean | null
  answer_text: string
  proximity_value: number | null
}

interface PaperRound {
  id: string
  name: string
  order_index: number
  time_limit_seconds: number | null
  ranking_priority: string[]
  paper_questions: PaperQuestion[]
  paper_submissions: Submission[]
}

interface Props {
  tournamentId: string
  initialRounds: PaperRound[]
  participants: Participant[]
}

const DEFAULT_PRIORITY = ['raw_score', 'proximity', 'chain1', 'chain2', 'chain3']
const PRIORITY_LABELS: Record<string, string> = {
  raw_score: '素点', proximity: '近似値誤差', chain1: '第1連答', chain2: '第2連答', chain3: '第3連答',
}

// ─── メイン ──────────────────────────────────────────────────────────────────
export default function PaperClient({ tournamentId, initialRounds, participants }: Props) {
  const supabase = createClient()
  const [rounds, setRounds] = useState<PaperRound[]>(initialRounds)
  const [activeRoundId, setActiveRoundId] = useState<string | null>(rounds[0]?.id ?? null)
  const [tab, setTab] = useState<'questions' | 'submissions' | 'ranking'>('questions')

  const activeRound = rounds.find(r => r.id === activeRoundId)

  const addRound = async () => {
    const { data } = await supabase.from('paper_rounds').insert({
      tournament_id: tournamentId,
      name: `ペーパー${rounds.length + 1}回戦`,
      order_index: rounds.length,
      ranking_priority: DEFAULT_PRIORITY,
    }).select('*, paper_questions(*), paper_submissions(*, participants(*))').single()
    if (data) {
      setRounds(prev => [...prev, data])
      setActiveRoundId(data.id)
    }
  }

  const updateRound = async (id: string, patch: Partial<PaperRound>) => {
    await supabase.from('paper_rounds').update(patch).eq('id', id)
    setRounds(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r))
  }

  const updateLocal = (roundId: string, patch: Partial<PaperRound>) => {
    setRounds(prev => prev.map(r => r.id === roundId ? { ...r, ...patch } : r))
  }

  if (!activeRound) return (
    <div className="min-h-screen bg-zinc-950 p-6 flex flex-col items-center justify-center gap-4">
      <p className="text-zinc-500">ペーパーラウンドがありません</p>
      <button onClick={addRound}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold">
        <Plus size={16} /> ラウンド作成
      </button>
    </div>
  )

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex">
      {/* サイドバー: ラウンド一覧 */}
      <aside className="w-52 bg-zinc-900 border-r border-zinc-800 p-3 flex flex-col gap-2">
        <h2 className="text-zinc-400 text-xs font-semibold px-2 pt-1">ペーパーラウンド</h2>
        {rounds.map(r => (
          <button key={r.id} onClick={() => setActiveRoundId(r.id)}
            className={cn('w-full text-left px-3 py-2 rounded-lg text-sm transition-colors',
              r.id === activeRoundId ? 'bg-blue-700 text-white' : 'text-zinc-400 hover:bg-zinc-800')}>
            {r.name}
          </button>
        ))}
        <button onClick={addRound}
          className="mt-2 flex items-center gap-1.5 px-3 py-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 text-sm transition-colors">
          <Plus size={14} /> 追加
        </button>
      </aside>

      {/* メインコンテンツ */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* ラウンド設定ヘッダー */}
        <div className="bg-zinc-900 border-b border-zinc-800 px-6 py-3 space-y-3">
          <div className="flex items-center gap-4">
            <input
              value={activeRound.name}
              onChange={e => updateLocal(activeRound.id, { name: e.target.value })}
              onBlur={e => updateRound(activeRound.id, { name: e.target.value })}
              className="text-lg font-bold bg-transparent focus:outline-none focus:bg-zinc-800 rounded px-2 py-1"
            />
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <span>制限時間</span>
              <input
                type="number"
                value={activeRound.time_limit_seconds != null ? activeRound.time_limit_seconds / 60 : ''}
                onChange={e => updateLocal(activeRound.id, { time_limit_seconds: e.target.value ? Number(e.target.value) * 60 : null })}
                onBlur={e => updateRound(activeRound.id, { time_limit_seconds: e.target.value ? Number(e.target.value) * 60 : null })}
                placeholder="なし"
                className="w-16 bg-zinc-800 rounded px-2 py-1 text-white text-center focus:outline-none"
              />
              <span>分</span>
            </div>
          </div>

          {/* 順位判定優先順位 */}
          <PriorityEditor
            priority={activeRound.ranking_priority}
            onChange={priority => {
              updateLocal(activeRound.id, { ranking_priority: priority })
              updateRound(activeRound.id, { ranking_priority: priority })
            }}
          />
        </div>

        {/* タブ */}
        <div className="flex border-b border-zinc-800 px-6">
          {(['questions', 'submissions', 'ranking'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={cn('px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px',
                tab === t ? 'text-blue-400 border-blue-400' : 'text-zinc-500 border-transparent hover:text-zinc-300')}>
              {t === 'questions' ? '問題管理' : t === 'submissions' ? '採点' : '順位表'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-auto p-6">
          {tab === 'questions' && (
            <QuestionsPanel round={activeRound} onUpdate={updated => updateLocal(activeRound.id, { paper_questions: updated })} />
          )}
          {tab === 'submissions' && (
            <SubmissionsPanel round={activeRound} participants={participants} onUpdate={updated => updateLocal(activeRound.id, { paper_submissions: updated })} />
          )}
          {tab === 'ranking' && (
            <RankingPanel round={activeRound} />
          )}
        </div>
      </div>
    </div>
  )
}

// ─── 優先順位エディタ ─────────────────────────────────────────────────────────
function PriorityEditor({ priority, onChange }: { priority: string[]; onChange: (p: string[]) => void }) {
  const move = (idx: number, dir: -1 | 1) => {
    const next = [...priority]
    const swap = idx + dir
    if (swap < 0 || swap >= next.length) return
    ;[next[idx], next[swap]] = [next[swap], next[idx]]
    onChange(next)
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-zinc-500 text-xs">順位判定優先順:</span>
      {priority.map((key, i) => (
        <div key={key} className="flex items-center gap-0.5 bg-zinc-800 rounded-lg px-2 py-0.5">
          <span className="text-zinc-300 text-xs font-medium">{i + 1}. {PRIORITY_LABELS[key]}</span>
          <button onClick={() => move(i, -1)} disabled={i === 0} className="text-zinc-600 hover:text-zinc-300 disabled:opacity-20">
            <ChevronUp size={12} />
          </button>
          <button onClick={() => move(i, 1)} disabled={i === priority.length - 1} className="text-zinc-600 hover:text-zinc-300 disabled:opacity-20">
            <ChevronDown size={12} />
          </button>
        </div>
      ))}
    </div>
  )
}

// ─── 問題管理パネル ───────────────────────────────────────────────────────────
function QuestionsPanel({ round, onUpdate }: { round: PaperRound; onUpdate: (q: PaperQuestion[]) => void }) {
  const supabase = createClient()
  const questions = [...round.paper_questions].sort((a, b) => a.order_index - b.order_index)

  const addQuestion = async () => {
    const { data } = await supabase.from('paper_questions').insert({
      paper_round_id: round.id,
      order_index: questions.length,
      question_text: '',
      correct_answer: '',
      question_type: 'regular',
    }).select().single()
    if (data) onUpdate([...questions, data])
  }

  const updateQuestion = async (id: string, patch: Partial<PaperQuestion>) => {
    await supabase.from('paper_questions').update(patch).eq('id', id)
    onUpdate(questions.map(q => q.id === id ? { ...q, ...patch } : q))
  }

  const deleteQuestion = async (id: string) => {
    await supabase.from('paper_questions').delete().eq('id', id)
    onUpdate(questions.filter(q => q.id !== id))
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-zinc-400 text-sm">{questions.length}問</span>
        <button onClick={addQuestion}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold">
          <Plus size={14} /> 問題追加
        </button>
      </div>
      {questions.map((q, i) => (
        <div key={q.id} className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <GripVertical size={14} className="text-zinc-700" />
            <span className="text-zinc-500 text-sm w-6">Q{i + 1}</span>
            <select
              value={q.question_type}
              onChange={e => updateQuestion(q.id, { question_type: e.target.value as 'regular' | 'proximity' })}
              className="bg-zinc-800 text-zinc-300 text-xs rounded px-2 py-1 focus:outline-none">
              <option value="regular">通常</option>
              <option value="proximity">近似値</option>
            </select>
            <button onClick={() => deleteQuestion(q.id)} className="ml-auto text-zinc-700 hover:text-red-400 transition-colors">
              <X size={14} />
            </button>
          </div>
          <input
            value={q.question_text}
            onChange={e => updateQuestion(q.id, { question_text: e.target.value })}
            placeholder="問題文"
            className="w-full bg-zinc-800 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <input
            value={q.correct_answer}
            onChange={e => updateQuestion(q.id, { correct_answer: e.target.value })}
            placeholder={q.question_type === 'proximity' ? '正解値（数値）' : '正解'}
            className="w-full bg-zinc-800 text-emerald-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      ))}
    </div>
  )
}

// ─── 採点パネル ───────────────────────────────────────────────────────────────
function SubmissionsPanel({ round, participants, onUpdate }: {
  round: PaperRound
  participants: Participant[]
  onUpdate: (s: Submission[]) => void
}) {
  const supabase = createClient()
  const [selected, setSelected] = useState<string | null>(participants[0]?.id ?? null)

  const questions = [...round.paper_questions].sort((a, b) => a.order_index - b.order_index)
  const submission = round.paper_submissions.find(s => s.participant_id === selected)
  const participant = participants.find(p => p.id === selected)

  const ensureSubmission = async (participantId: string): Promise<Submission> => {
    const existing = round.paper_submissions.find(s => s.participant_id === participantId)
    if (existing) return existing
    const answers: AnswerEntry[] = questions.map(q => ({
      question_id: q.id, is_correct: null, answer_text: '', proximity_value: null,
    }))
    const { data } = await supabase.from('paper_submissions').insert({
      paper_round_id: round.id,
      participant_id: participantId,
      answers,
      raw_score: 0,
    }).select('*, participants(*)').single()
    if (data) {
      const next = [...round.paper_submissions, data]
      onUpdate(next)
      return data
    }
    throw new Error('Failed to create submission')
  }

  const setAnswer = async (questionId: string, patch: Partial<AnswerEntry>) => {
    if (!selected) return
    const sub = await ensureSubmission(selected)
    const answers: AnswerEntry[] = questions.map(q => {
      const existing = sub.answers?.find((a: AnswerEntry) => a.question_id === q.id)
        ?? { question_id: q.id, is_correct: null, answer_text: '', proximity_value: null }
      return q.id === questionId ? { ...existing, ...patch } : existing
    })
    const rawScore = answers.filter(a => a.is_correct === true).length
    const proximityQ = questions.find(q => q.question_type === 'proximity')
    const proxAnswer = proximityQ ? answers.find(a => a.question_id === proximityQ.id) : null
    const proximityError = proxAnswer?.proximity_value != null
      ? Math.abs(Number(proximityQ?.correct_answer ?? 0) - proxAnswer.proximity_value)
      : null

    // 連答計算
    let chain1 = 0, chain2 = 0, chain3 = 0, currentChain = 0
    for (const a of answers) {
      if (a.is_correct === true) {
        currentChain++
        if (currentChain === 1) chain1++
        else if (currentChain === 2) chain2++
        else if (currentChain >= 3) chain3++
      } else {
        currentChain = 0
      }
    }

    await supabase.from('paper_submissions').update({ answers, raw_score: rawScore, proximity_error: proximityError, chain1, chain2, chain3 }).eq('id', sub.id)
    const updated = round.paper_submissions.map(s =>
      s.id === sub.id ? { ...s, answers, raw_score: rawScore, proximity_error: proximityError, chain1, chain2, chain3 } : s
    )
    onUpdate(updated)
  }

  const handlePhotoUpload = async (file: File) => {
    if (!selected) return
    const sub = await ensureSubmission(selected)
    const path = `paper/${round.id}/${selected}/${file.name}`
    await supabase.storage.from('quiz-assets').upload(path, file, { upsert: true })
    const { data: urlData } = supabase.storage.from('quiz-assets').getPublicUrl(path)
    const photo_url = urlData.publicUrl
    await supabase.from('paper_submissions').update({ photo_url, submitted_at: new Date().toISOString() }).eq('id', sub.id)
    onUpdate(round.paper_submissions.map(s => s.id === sub.id ? { ...s, photo_url, submitted_at: new Date().toISOString() } : s))
  }

  return (
    <div className="flex gap-4 h-full">
      {/* 参加者リスト */}
      <div className="w-44 flex-shrink-0 space-y-1">
        {participants.map(p => {
          const sub = round.paper_submissions.find(s => s.participant_id === p.id)
          return (
            <button key={p.id} onClick={() => setSelected(p.id)}
              className={cn('w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between gap-2',
                p.id === selected ? 'bg-blue-700 text-white' : 'text-zinc-400 hover:bg-zinc-800')}>
              <span>{p.name}</span>
              {sub?.submitted_at && <Camera size={12} className="text-emerald-400 flex-shrink-0" />}
              {sub && <span className="text-xs text-zinc-400">{sub.raw_score}pt</span>}
            </button>
          )
        })}
      </div>

      {/* 採点エリア */}
      <div className="flex-1 space-y-4">
        {participant && (
          <>
            <div className="flex items-center gap-4">
              <h3 className="font-bold text-lg">{participant.name}</h3>
              {submission?.raw_score != null && (
                <span className="bg-blue-700 px-3 py-1 rounded-full text-sm font-bold">
                  {submission.raw_score}/{questions.length}点
                </span>
              )}
              {/* 写真アップロード */}
              <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 cursor-pointer text-sm transition-colors">
                <Camera size={14} /> 解答用紙アップロード
                <input type="file" accept="image/*" className="hidden"
                  onChange={e => { if (e.target.files?.[0]) handlePhotoUpload(e.target.files[0]) }} />
              </label>
            </div>

            {/* 写真プレビュー */}
            {submission?.photo_url && (
              <img src={submission.photo_url} alt="解答用紙" className="max-h-64 rounded-xl border border-zinc-700 object-contain" />
            )}

            {/* 各問採点 */}
            <div className="space-y-2">
              {questions.map((q, i) => {
                const ans = submission?.answers?.find((a: AnswerEntry) => a.question_id === q.id)
                  ?? { question_id: q.id, is_correct: null, answer_text: '', proximity_value: null }
                return (
                  <div key={q.id} className="bg-zinc-900 rounded-xl border border-zinc-800 p-3 flex items-center gap-3">
                    <span className="text-zinc-500 text-sm w-6">Q{i + 1}</span>
                    <div className="flex-1">
                      <p className="text-zinc-300 text-sm">{q.question_text || '(問題文なし)'}</p>
                      <p className="text-emerald-500 text-xs mt-0.5">正解: {q.correct_answer}</p>
                      {q.question_type === 'proximity' && (
                        <input
                          type="number"
                          value={ans.proximity_value ?? ''}
                          onChange={e => setAnswer(q.id, { proximity_value: e.target.value ? Number(e.target.value) : null })}
                          placeholder="参加者の回答値"
                          className="mt-1 bg-zinc-800 text-white rounded px-2 py-1 text-sm w-32 focus:outline-none"
                        />
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setAnswer(q.id, { is_correct: true })}
                        className={cn('w-9 h-9 rounded-lg flex items-center justify-center transition-all',
                          ans.is_correct === true ? 'bg-emerald-600 text-white scale-110' : 'bg-zinc-800 text-zinc-600 hover:text-emerald-400')}>
                        <Check size={16} />
                      </button>
                      <button
                        onClick={() => setAnswer(q.id, { is_correct: false })}
                        className={cn('w-9 h-9 rounded-lg flex items-center justify-center transition-all',
                          ans.is_correct === false ? 'bg-red-600 text-white scale-110' : 'bg-zinc-800 text-zinc-600 hover:text-red-400')}>
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── 順位表パネル ─────────────────────────────────────────────────────────────
function RankingPanel({ round }: { round: PaperRound }) {
  const supabase = createClient()

  const ranked = useMemo(() => {
    const subs = round.paper_submissions.map(s => ({
      ...s,
      name: s.participants?.name ?? '?',
    }))

    const priority = round.ranking_priority

    return [...subs].sort((a, b) => {
      for (const key of priority) {
        let diff = 0
        if (key === 'raw_score') diff = b.raw_score - a.raw_score
        else if (key === 'proximity') {
          const ae = a.proximity_error ?? Infinity
          const be = b.proximity_error ?? Infinity
          diff = ae - be // 小さいほど上位
        }
        else if (key === 'chain1') diff = b.chain1 - a.chain1
        else if (key === 'chain2') diff = b.chain2 - a.chain2
        else if (key === 'chain3') diff = b.chain3 - a.chain3
        if (diff !== 0) return diff
      }
      return 0
    })
  }, [round.paper_submissions, round.ranking_priority])

  const applyRanksToParticipants = async () => {
    for (let i = 0; i < ranked.length; i++) {
      await supabase.from('participants')
        .update({ paper_rank: i + 1 })
        .eq('id', ranked[i].participant_id)
    }
    alert('ペーパー順位を参加者に反映しました')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold">順位表（暫定）</h3>
        <button onClick={applyRanksToParticipants}
          className="px-4 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-bold transition-colors">
          順位を参加者に反映
        </button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-zinc-900 border-b border-zinc-800">
              <th className="px-4 py-2 text-left text-zinc-400 font-medium">順位</th>
              <th className="px-4 py-2 text-left text-zinc-400 font-medium">名前</th>
              <th className="px-4 py-2 text-center text-zinc-400 font-medium">素点</th>
              <th className="px-4 py-2 text-center text-zinc-400 font-medium">近似値誤差</th>
              <th className="px-4 py-2 text-center text-zinc-400 font-medium">第1連答</th>
              <th className="px-4 py-2 text-center text-zinc-400 font-medium">第2連答</th>
              <th className="px-4 py-2 text-center text-zinc-400 font-medium">第3連答</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((s, i) => (
              <tr key={s.id} className={cn('border-b border-zinc-800/50',
                i === 0 ? 'bg-yellow-950/30' : i < 3 ? 'bg-zinc-900/50' : 'bg-zinc-950')}>
                <td className="px-4 py-2 font-bold text-zinc-300">{i + 1}</td>
                <td className="px-4 py-2 text-white font-medium">{s.name}</td>
                <td className="px-4 py-2 text-center text-blue-300 font-bold">{s.raw_score}</td>
                <td className="px-4 py-2 text-center text-zinc-300">
                  {s.proximity_error != null ? `±${s.proximity_error}` : '—'}
                </td>
                <td className="px-4 py-2 text-center text-zinc-300">{s.chain1}</td>
                <td className="px-4 py-2 text-center text-zinc-300">{s.chain2}</td>
                <td className="px-4 py-2 text-center text-zinc-300">{s.chain3}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
