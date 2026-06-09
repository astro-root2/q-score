// @ts-nocheck
'use client'
import { useState } from 'react'
import { cn } from '@/lib/utils/cn'
import type { EntryForm, EntryResponse } from '@/types/entry'
import { FormBuilder } from './components/FormBuilder'
import { ResponseList } from './components/ResponseList'

type Tab = 'builder' | 'responses'

interface Props {
  tournamentId: string
  initialForms: EntryForm[]
  initialResponses: EntryResponse[]
}

export default function EntryClient({ tournamentId, initialForms, initialResponses }: Props) {
  const [tab, setTab] = useState<Tab>('builder')
  const [forms, setForms] = useState<EntryForm[]>(initialForms)
  const [responses, setResponses] = useState<EntryResponse[]>(initialResponses)

  const activeForm = forms[0] ?? null

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-white">エントリー管理</h1>
        <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1">
          {(['builder', 'responses'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={cn('px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors',
                tab === t ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white')}>
              {t === 'builder' ? 'フォーム設定' : `回答一覧 (${responses.length})`}
            </button>
          ))}
        </div>
      </div>

      {tab === 'builder'
        ? <FormBuilder
            tournamentId={tournamentId}
            form={activeForm}
            onFormChange={f => {
              if (!f) { setForms([]); return }
              setForms(prev => prev.some(x => x.id === f.id) ? prev.map(x => x.id === f.id ? f : x) : [f, ...prev])
            }}
          />
        : <ResponseList
            tournamentId={tournamentId}
            form={activeForm}
            responses={responses}
            onResponsesChange={setResponses}
          />
      }
    </div>
  )
}
