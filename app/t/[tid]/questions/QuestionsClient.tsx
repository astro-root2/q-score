// @ts-nocheck
'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils/cn'
import { Plus, Upload, Download, Trash2, Check, X as XIcon, BookOpen } from 'lucide-react'
import Papa from 'papaparse'

interface Question {
  id: string
  tournament_id: string
  order_index: number
  body: string
  answer: string
  genre: string | null
  difficulty: number | null
  note: string | null
  used: boolean
}

interface Tournament { id: string; name: string }

interface Props {
  tournament: Tournament
  initialQuestions: Question[]
}

export default function QuestionsClient({ tournament, initialQuestions }: Props) {
  const supabase = createClient()
  const [questions, setQuestions] = useState<Question[]>(initialQuestions)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const addRow = () => {
    const temp: Question = {
      id: `new-${Date.now()}`,
      tournament_id: tournament.id,
      order_index: questions.length + 1,
      body: '',
      answer: '',
      genre: '',
      difficulty: 1,
      note: '',
      used: false,
    }
    setQuestions(prev => [...prev, temp])
  }

  const update = (id: string, field: keyof Question, value: unknown) => {
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, [field]: value } : q))
  }

  const remove = async (q: Question) => {
    if (!q.id.startsWith('new-')) {
      await (supabase as any).from('questions').delete().eq('id', q.id)
    }
    setQuestions(prev => prev.filter(x => x.id !== q.id))
  }

  const handleCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data }) => {
        const imported: Question[] = data.map((row, i) => ({
          id: `new-${Date.now()}-${i}`,
          tournament_id: tournament.id,
          order_index: questions.length + i + 1,
          body: row['問題文'] ?? row['question'] ?? row['body'] ?? '',
          answer: row['解答'] ?? row['answer'] ?? '',
          genre: row['ジャンル'] ?? row['genre'] ?? '',
          difficulty: parseInt(row['難易度'] ?? row['difficulty'] ?? '1') || 1,
          note: row['備考'] ?? row['note'] ?? '',
          used: false,
        }))
        setQuestions(prev => [...prev, ...imported])
        setMsg(`${imported.length} 問インポートしました`)
      },
    })
    e.target.value = ''
  }

  const exportCSV = () => {
    const rows = questions.map((q, i) => ({
      '問題番号': i + 1,
      '問題文': q.body,
      '解答': q.answer,
      'ジャンル': q.genre ?? '',
      '難易度': q.difficulty ?? 1,
      '備考': q.note ?? '',
    }))
    const csv = Papa.unparse(rows)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `questions_${tournament.id}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const save = async () => {
    setSaving(true)
    setMsg(null)
    try {
      await (supabase as any).from('questions').delete().eq('tournament_id', tournament.id)
      const rows = questions.map((q, i) => ({
        tournament_id: tournament.id,
        order_index: i + 1,
        body: q.body,
        answer: q.answer,
        genre: q.genre || null,
        difficulty: q.difficulty ?? 1,
        note: q.note || null,
        used: q.used,
      }))
      const { data, error } = await (supabase as any).from('questions').insert(rows).select()
      if (error) throw error
      setQuestions(data ?? [])
      setMsg('保存しました ✓')
    } catch (e) {
      setMsg(`エラー: ${(e as Error).message}`)
    } finally {
      setSaving(false)
    }
  }

  const total = questions.length
  const unused = questions.filter(q => !q.used).length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <BookOpen size={20} className="text-blue-400" />
          <h1 className="text-xl font-bold text-white">問題管理</h1>
          <span className="text-sm text-zinc-400">{total} 問 / 未使用 {unused} 問</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleCSV} />
          <button onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg transition-colors">
            <Upload size={14} /> CSVインポート
          </button>
          <button onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg transition-colors">
            <Download size={14} /> CSVエクスポート
          </button>
          <button onClick={addRow}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors">
            <Plus size={14} /> 問題を追加
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

      <details className="bg-zinc-900 rounded-lg border border-zinc-800">
        <summary className="px-4 py-2 text-sm text-zinc-400 cursor-pointer hover:text-zinc-200">
          CSVフォーマット (クリックで展開)
        </summary>
        <div className="px-4 pb-3 text-xs text-zinc-500 font-mono">
          問題番号,問題文,解答,ジャンル,難易度,備考<br />
          日本の首都は？,東京,地理,1,<br />
          初代内閣総理大臣は？,伊藤博文,歴史,2,難問
        </div>
      </details>

      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/50">
              <th className="px-3 py-2 text-left text-zinc-400 w-10">#</th>
              <th className="px-3 py-2 text-left text-zinc-400">問題文</th>
              <th className="px-3 py-2 text-left text-zinc-400 w-40">答え</th>
              <th className="px-3 py-2 text-left text-zinc-400 w-24">ジャンル</th>
              <th className="px-3 py-2 text-center text-zinc-400 w-16">難度</th>
              <th className="px-3 py-2 text-center text-zinc-400 w-16">使用済</th>
              <th className="px-3 py-2 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {questions.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">
                  問題がありません。「問題を追加」またはCSVをインポートしてください。
                </td>
              </tr>
            )}
            {questions.map((q, i) => (
              <tr key={q.id} className={cn(
                'border-b border-zinc-800/50 hover:bg-zinc-900/30 transition-colors',
                q.used && 'opacity-50'
              )}>
                <td className="px-3 py-1.5 text-zinc-500">{i + 1}</td>
                <td className="px-3 py-1.5">
                  <input
                    value={q.body}
                    onChange={e => update(q.id, 'body', e.target.value)}
                    placeholder="問題文を入力"
                    className="w-full bg-transparent text-white placeholder-zinc-600 focus:outline-none focus:bg-zinc-800/50 rounded px-1 py-0.5"
                  />
                </td>
                <td className="px-3 py-1.5">
                  <input
                    value={q.answer}
                    onChange={e => update(q.id, 'answer', e.target.value)}
                    placeholder="答え"
                    className="w-full bg-transparent text-emerald-400 placeholder-zinc-600 focus:outline-none focus:bg-zinc-800/50 rounded px-1 py-0.5"
                  />
                </td>
                <td className="px-3 py-1.5">
                  <input
                    value={q.genre ?? ''}
                    onChange={e => update(q.id, 'genre', e.target.value)}
                    placeholder="ジャンル"
                    className="w-full bg-transparent text-zinc-300 placeholder-zinc-600 focus:outline-none focus:bg-zinc-800/50 rounded px-1 py-0.5"
                  />
                </td>
                <td className="px-3 py-1.5 text-center">
                  <select
                    value={q.difficulty ?? 1}
                    onChange={e => update(q.id, 'difficulty', parseInt(e.target.value))}
                    className="bg-zinc-800 text-zinc-300 rounded px-1 py-0.5 text-xs">
                    {[1,2,3,4,5].map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </td>
                <td className="px-3 py-1.5 text-center">
                  <button onClick={() => update(q.id, 'used', !q.used)}
                    className={cn('p-1 rounded', q.used ? 'text-emerald-400' : 'text-zinc-600')}>
                    {q.used ? <Check size={14} /> : <XIcon size={14} />}
                  </button>
                </td>
                <td className="px-3 py-1.5 text-center">
                  <button onClick={() => remove(q)}
                    className="p-1 text-zinc-600 hover:text-red-400 transition-colors rounded">
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
