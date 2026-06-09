'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Users, Trash2, UserPlus, Download } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { EntryForm, EntryResponse } from '@/types/entry'
import Papa from 'papaparse'

interface Props {
  tournamentId: string
  form: EntryForm | null
  responses: EntryResponse[]
  onResponsesChange: (r: EntryResponse[]) => void
}

export function ResponseList({ tournamentId, form, responses, onResponsesChange }: Props) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createClient() as any
  const [importing, setImporting] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  if (!form) return (
    <div className="text-center py-16 border-2 border-dashed border-zinc-800 rounded-xl">
      <p className="text-zinc-500 text-sm">先にフォームを作成・保存してください</p>
    </div>
  )

  const formFields = form.fields

  const deleteResponse = async (id: string) => {
    await db.from('entry_responses').delete().eq('id', id)
    onResponsesChange(responses.filter(r => r.id !== id))
  }

  const importOne = async (resp: EntryResponse): Promise<boolean> => {
    const nameField = formFields.find(f => f.label.includes('名前') || f.label.toLowerCase().includes('name'))
    const rubyField = formFields.find(f => f.label.includes('読み') || f.label.toLowerCase().includes('ruby') || f.label.includes('ふりがな'))
    const affField  = formFields.find(f => f.label.includes('所属') || f.label.toLowerCase().includes('affiliation'))
    const gradeField = formFields.find(f => f.label.includes('学年') || f.label.toLowerCase().includes('grade'))
    const name = nameField ? String(resp.data[nameField.id] ?? '') : ''
    if (!name) return false
    const { data: p } = await db.from('participants').insert({
      tournament_id: tournamentId, name,
      ruby: rubyField ? String(resp.data[rubyField.id] ?? '') || null : null,
      affiliation: affField ? String(resp.data[affField.id] ?? '') || null : null,
      grade: gradeField ? String(resp.data[gradeField.id] ?? '') || null : null,
      status: 'active',
    }).select().single()
    if (p) {
      await db.from('entry_responses').update({ participant_id: p.id }).eq('id', resp.id)
      onResponsesChange(responses.map(r => r.id === resp.id ? { ...r, participant_id: p.id } : r))
      return true
    }
    return false
  }

  const importSingle = async (resp: EntryResponse) => {
    const ok = await importOne(resp)
    setMsg(ok ? '参加者に追加しました' : '名前フィールドが見つかりません')
    setTimeout(() => setMsg(null), 3000)
  }

  const importAll = async () => {
    setImporting(true)
    let count = 0
    for (const r of responses.filter(r => !r.participant_id)) {
      if (await importOne(r)) count++
    }
    setMsg(`${count}件を参加者に追加しました`)
    setImporting(false)
    setTimeout(() => setMsg(null), 4000)
  }

  const exportCSV = () => {
    const rows = responses.map(r => {
      const row: Record<string, string> = { id: r.id, created_at: r.created_at, imported: r.participant_id ? '済' : '' }
      formFields.forEach(f => { row[f.label] = String(r.data[f.id] ?? '') })
      return row
    })
    const csv = Papa.unparse(rows)
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `entry_responses_${form.id}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const pending = responses.filter(r => !r.participant_id)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-zinc-300 text-sm">
          <Users size={16} />
          <span>回答 {responses.length}件（未インポート {pending.length}件）</span>
        </div>
        <button onClick={exportCSV}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded-lg transition-colors">
          <Download size={14} /> CSV出力
        </button>
        {pending.length > 0 && (
          <button onClick={importAll} disabled={importing}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-sm rounded-lg font-bold disabled:opacity-50 transition-colors">
            <UserPlus size={14} /> 全件を参加者に追加
          </button>
        )}
      </div>
      {msg && <div className="px-4 py-2 bg-emerald-900/50 text-emerald-300 text-sm rounded-lg">{msg}</div>}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        {responses.length === 0
          ? <div className="text-center py-12 text-zinc-500 text-sm">回答がまだありません</div>
          : <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-500 text-xs">
                    <th className="px-3 py-2 text-left w-28">日時</th>
                    {formFields.map(f => <th key={f.id} className="px-3 py-2 text-left">{f.label}</th>)}
                    <th className="px-3 py-2 text-center w-24">状態</th>
                    <th className="px-3 py-2 w-12" />
                  </tr>
                </thead>
                <tbody>
                  {responses.map(r => (
                    <tr key={r.id} className={cn('border-b border-zinc-800/50',
                      r.participant_id ? 'opacity-50' : 'hover:bg-zinc-800/30')}>
                      <td className="px-3 py-2 text-zinc-500 text-xs">
                        {new Date(r.created_at).toLocaleString('ja-JP', { month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' })}
                      </td>
                      {formFields.map(f => (
                        <td key={f.id} className="px-3 py-2 text-white">{String(r.data[f.id] ?? '—')}</td>
                      ))}
                      <td className="px-3 py-2 text-center">
                        {r.participant_id
                          ? <span className="text-xs text-emerald-500">参加者済</span>
                          : <button onClick={() => importSingle(r)}
                              className="flex items-center gap-1 px-2 py-1 bg-blue-700 hover:bg-blue-600 text-white text-xs rounded transition-colors mx-auto">
                              <UserPlus size={12} /> 追加
                            </button>
                        }
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button onClick={() => deleteResponse(r.id)} className="text-zinc-600 hover:text-red-400">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        }
      </div>
    </div>
  )
}
