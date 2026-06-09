// @ts-nocheck
'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2, GripVertical, ExternalLink, Copy, Check, ToggleLeft, ToggleRight } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { EntryForm, FormField, FieldType } from '@/types/entry'

interface Props {
  tournamentId: string
  form: EntryForm | null
  onFormChange: (form: EntryForm | null) => void
}

const FIELD_TYPES: { type: FieldType; label: string }[] = [
  { type: 'text',     label: 'テキスト' },
  { type: 'number',   label: '数値' },
  { type: 'select',   label: '選択肢' },
  { type: 'textarea', label: '長文' },
  { type: 'checkbox', label: 'チェック' },
]

function newField(): FormField {
  return { id: crypto.randomUUID(), label: '', type: 'text', required: false, options: [], placeholder: '' }
}

export function FormBuilder({ tournamentId, form, onFormChange }: Props) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createClient() as any
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [title, setTitle] = useState(form?.title ?? 'エントリーフォーム')
  const [desc, setDesc] = useState(form?.description ?? '')
  const [fields, setFields] = useState<FormField[]>(form?.fields ?? [])
  const [isOpen, setIsOpen] = useState(form?.is_open ?? false)

  const publicUrl = form
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/entry/${form.id}`
    : null

  const addField = () => setFields(f => [...f, newField()])
  const updateField = (id: string, patch: Partial<FormField>) =>
    setFields(f => f.map(x => x.id === id ? { ...x, ...patch } : x))
  const removeField = (id: string) => setFields(f => f.filter(x => x.id !== id))

  const save = async () => {
    setSaving(true)
    const payload = { tournament_id: tournamentId, title, description: desc || null, fields, is_open: isOpen }
    let saved: EntryForm | null = null
    if (form) {
      const { data } = await db.from('entry_forms').update(payload).eq('id', form.id).select().single()
      saved = data
    } else {
      const { data } = await db.from('entry_forms').insert(payload).select().single()
      saved = data
    }
    if (saved) onFormChange(saved)
    setSaving(false)
  }

  const toggleOpen = async () => {
    const next = !isOpen
    setIsOpen(next)
    if (form) {
      await db.from('entry_forms').update({ is_open: next }).eq('id', form.id)
      onFormChange({ ...form, is_open: next })
    }
  }

  const copyUrl = () => {
    if (!publicUrl) return
    navigator.clipboard.writeText(publicUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3">
        <h2 className="text-sm font-semibold text-zinc-300">フォーム基本設定</h2>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="フォームタイトル"
          className="w-full bg-zinc-800 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
        <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="説明文（任意）" rows={2}
          className="w-full bg-zinc-800 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none" />
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={save} disabled={saving}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg font-bold disabled:opacity-50">
            {saving ? '保存中...' : '保存'}
          </button>
          {form && (
            <button onClick={toggleOpen}
              className={cn('flex items-center gap-2 px-4 py-1.5 text-sm rounded-lg font-bold transition-colors',
                isOpen ? 'bg-emerald-700 text-white' : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600')}>
              {isOpen ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
              {isOpen ? '受付中' : '受付停止'}
            </button>
          )}
          {publicUrl && (
            <>
              <button onClick={copyUrl}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded-lg transition-colors">
                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                {copied ? 'コピーしました' : 'URLコピー'}
              </button>
              <a href={publicUrl} target="_blank"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded-lg transition-colors">
                <ExternalLink size={14} /> フォームを開く
              </a>
            </>
          )}
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-300">入力項目</h2>
          <button onClick={addField}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg">
            <Plus size={14} /> 項目追加
          </button>
        </div>
        {fields.length === 0 && <p className="text-zinc-600 text-sm text-center py-4">項目を追加してください</p>}
        <div className="space-y-2">
          {fields.map((f, i) => (
            <FieldRow key={f.id} field={f} index={i}
              onChange={patch => updateField(f.id, patch)}
              onRemove={() => removeField(f.id)} />
          ))}
        </div>
      </div>
    </div>
  )
}

function FieldRow({ field, index, onChange, onRemove }: {
  field: FormField; index: number
  onChange: (patch: Partial<FormField>) => void; onRemove: () => void
}) {
  return (
    <div className="flex items-start gap-2 bg-zinc-800 rounded-lg px-3 py-2">
      <GripVertical size={16} className="text-zinc-600 mt-2 shrink-0" />
      <span className="text-zinc-500 text-xs mt-2 w-4 shrink-0">{index + 1}</span>
      <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
        <input value={field.label} onChange={e => onChange({ label: e.target.value })} placeholder="項目名（例：名前）"
          className="bg-zinc-700 text-white text-sm rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 col-span-1 sm:col-span-2" />
        <select value={field.type} onChange={e => onChange({ type: e.target.value as FieldType })}
          className="bg-zinc-700 text-white text-sm rounded px-2 py-1.5 focus:outline-none">
          {FIELD_TYPES.map(t => <option key={t.type} value={t.type}>{t.label}</option>)}
        </select>
        {field.type === 'select' && (
          <input
            value={field.options.join(',')}
            onChange={e => onChange({ options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
            placeholder="選択肢（カンマ区切り）"
            className="bg-zinc-700 text-white text-sm rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 col-span-1 sm:col-span-3" />
        )}
      </div>
      <label className="flex items-center gap-1 mt-2 shrink-0">
        <input type="checkbox" checked={field.required} onChange={e => onChange({ required: e.target.checked })}
          className="accent-blue-500 w-3.5 h-3.5" />
        <span className="text-zinc-400 text-xs">必須</span>
      </label>
      <button onClick={onRemove} className="text-zinc-600 hover:text-red-400 mt-1.5 shrink-0">
        <Trash2 size={14} />
      </button>
    </div>
  )
}
