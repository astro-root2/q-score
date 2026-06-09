'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Send, CheckCircle } from 'lucide-react'
import type { EntryForm, FormField } from '@/types/entry'

export default function PublicEntryForm() {
  const { formId } = useParams<{ formId: string }>()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createClient() as any
  const [form, setForm] = useState<EntryForm | null>(null)
  const [values, setValues] = useState<Record<string, string | number | boolean>>({})
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    db.from('entry_forms').select('*').eq('id', formId).single()
      .then(({ data }: { data: EntryForm | null }) => { if (data) setForm(data) })
  }, [formId])

  const validate = () => {
    const errs: Record<string, string> = {}
    for (const f of (form?.fields ?? [])) {
      if (f.required && !values[f.id]) errs[f.id] = `${f.label}は必須です`
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const submit = async () => {
    if (!form || !validate()) return
    setSubmitting(true)
    await db.from('entry_responses').insert({ form_id: form.id, tournament_id: form.tournament_id, data: values })
    setSubmitted(true)
    setSubmitting(false)
  }

  if (!form) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="text-zinc-500 text-sm">読み込み中...</div>
    </div>
  )
  if (!form.is_open) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="text-center space-y-2">
        <div className="text-zinc-300 font-bold text-lg">{form.title}</div>
        <div className="text-zinc-500 text-sm">現在このフォームは受付停止中です</div>
      </div>
    </div>
  )
  if (submitted) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="text-center space-y-3">
        <CheckCircle size={48} className="text-emerald-400 mx-auto" />
        <div className="text-white font-bold text-lg">エントリー完了</div>
        <div className="text-zinc-400 text-sm">ご回答ありがとうございました</div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-zinc-950 p-4 flex items-start justify-center">
      <div className="w-full max-w-lg space-y-5 py-10">
        <div className="space-y-1">
          <h1 className="text-2xl font-black text-white">{form.title}</h1>
          {form.description && <p className="text-zinc-400 text-sm">{form.description}</p>}
        </div>
        <div className="space-y-4">
          {form.fields.map(field => (
            <FieldInput key={field.id} field={field} value={values[field.id]} error={errors[field.id]}
              onChange={v => setValues(prev => ({ ...prev, [field.id]: v }))} />
          ))}
        </div>
        <button onClick={submit} disabled={submitting}
          className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl disabled:opacity-50 transition-colors">
          <Send size={16} /> {submitting ? '送信中...' : '送信する'}
        </button>
      </div>
    </div>
  )
}

function FieldInput({ field, value, error, onChange }: {
  field: FormField; value: string | number | boolean | undefined
  error?: string; onChange: (v: string | number | boolean) => void
}) {
  const base = "w-full bg-zinc-800 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 border border-zinc-700"
  return (
    <div className="space-y-1">
      <label className="block text-sm font-semibold text-zinc-200">
        {field.label}{field.required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {field.type === 'textarea'
        ? <textarea rows={3} className={base + ' resize-none'} value={String(value ?? '')} onChange={e => onChange(e.target.value)} />
        : field.type === 'select'
        ? <select className={base} value={String(value ?? '')} onChange={e => onChange(e.target.value)}>
            <option value="">選択してください</option>
            {field.options.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        : field.type === 'checkbox'
        ? <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={Boolean(value)} onChange={e => onChange(e.target.checked)} className="w-4 h-4 accent-blue-500" />
            <span className="text-sm text-zinc-300">{field.label}</span>
          </label>
        : <input type={field.type} className={base} value={String(value ?? '')} placeholder={field.placeholder}
            onChange={e => onChange(field.type === 'number' ? Number(e.target.value) : e.target.value)} />
      }
      {error && <p className="text-red-400 text-xs">{error}</p>}
    </div>
  )
}
