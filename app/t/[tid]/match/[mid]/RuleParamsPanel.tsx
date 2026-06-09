// @ts-nocheck
'use client'

import { useState } from 'react'
import type { RuleParamDef } from '@/lib/engine/types'
import { SWEDISH_DEFAULT_TABLE } from '@/lib/engine/rules/Swedish'
import { Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface Props {
  paramDefs: RuleParamDef[]
  values: Record<string, number | string | boolean>
  onChange: (key: string, value: number | string | boolean) => void
  disabled?: boolean
}

export default function RuleParamsPanel({ paramDefs, values, onChange, disabled }: Props) {
  return (
    <div className="space-y-3">
      {paramDefs.map(def => (
        <ParamField key={def.key} def={def} value={values[def.key] ?? def.defaultValue} onChange={v => onChange(def.key, v)} disabled={disabled} />
      ))}
    </div>
  )
}

function ParamField({ def, value, onChange, disabled }: {
  def: RuleParamDef
  value: number | string | boolean
  onChange: (v: number | string | boolean) => void
  disabled?: boolean
}) {
  if (def.type === 'swedish_table') {
    return <SwedishTableEditor value={String(value)} onChange={onChange} disabled={disabled} />
  }

  if (def.type === 'boolean') {
    return (
      <label className="flex items-center gap-3 cursor-pointer">
        <div
          onClick={() => !disabled && onChange(!value)}
          className={cn('w-10 h-6 rounded-full transition-colors relative',
            value ? 'bg-blue-600' : 'bg-zinc-700')}>
          <div className={cn('absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
            value ? 'translate-x-5' : 'translate-x-1')} />
        </div>
        <span className="text-zinc-300 text-sm">{def.label}</span>
        {def.description && <span className="text-zinc-600 text-xs">{def.description}</span>}
      </label>
    )
  }

  // number / string
  return (
    <div className="flex items-center gap-3">
      <label className="text-zinc-400 text-sm w-44 flex-shrink-0">{def.label}</label>
      <div className="flex items-center gap-2">
        {def.type === 'number' && (
          <>
            <button
              onClick={() => !disabled && onChange(Math.max(def.min ?? 0, Number(value) - 1))}
              disabled={disabled || Number(value) <= (def.min ?? 0)}
              className="w-7 h-7 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700 disabled:opacity-30 text-lg leading-none transition-colors">
              −
            </button>
            <input
              type="number"
              value={String(value)}
              min={def.min}
              max={def.max}
              disabled={disabled}
              onChange={e => onChange(e.target.value === '' ? def.defaultValue : Number(e.target.value))}
              className="w-16 bg-zinc-800 text-white text-center rounded-lg px-2 py-1.5 text-sm font-bold focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
            />
            <button
              onClick={() => !disabled && onChange(Math.min(def.max ?? 999, Number(value) + 1))}
              disabled={disabled || (def.max != null && Number(value) >= def.max)}
              className="w-7 h-7 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700 disabled:opacity-30 text-lg leading-none transition-colors">
              ＋
            </button>
          </>
        )}
        {def.type === 'string' && (
          <input
            type="text"
            value={String(value)}
            disabled={disabled}
            onChange={e => onChange(e.target.value)}
            className="w-48 bg-zinc-800 text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
          />
        )}
        {def.description && <span className="text-zinc-600 text-xs">{def.description}</span>}
      </div>
    </div>
  )
}

// ─── Swedish テーブルエディタ ──────────────────────────────────────────────
function SwedishTableEditor({ value, onChange, disabled }: {
  value: string
  onChange: (v: string) => void
  disabled?: boolean
}) {
  let parsed: { minCorrect: number; wrongCount: number }[] = SWEDISH_DEFAULT_TABLE
  try { parsed = JSON.parse(value) } catch { /* use default */ }

  const update = (index: number, field: 'minCorrect' | 'wrongCount', val: number) => {
    const next = parsed.map((row, i) => i === index ? { ...row, [field]: val } : row)
    onChange(JSON.stringify(next))
  }

  const addRow = () => {
    const last = parsed[parsed.length - 1] ?? { minCorrect: 0, wrongCount: 1 }
    const next = [...parsed, { minCorrect: last.minCorrect + 3, wrongCount: last.wrongCount + 1 }]
    onChange(JSON.stringify(next))
  }

  const removeRow = (index: number) => {
    if (parsed.length <= 1) return
    const next = parsed.filter((_, i) => i !== index)
    onChange(JSON.stringify(next))
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-zinc-400 text-sm">正解数 → ×数テーブル</span>
        <button onClick={addRow} disabled={disabled}
          className="flex items-center gap-1 px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white text-xs transition-colors disabled:opacity-30">
          <Plus size={12} /> 行追加
        </button>
      </div>
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-500 text-xs">
              <th className="px-3 py-2 text-left">正解数 ≥</th>
              <th className="px-3 py-2 text-left">つく×の数</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {parsed.map((row, i) => (
              <tr key={i} className="border-b border-zinc-800/50 last:border-0">
                <td className="px-3 py-1.5">
                  <input
                    type="number" value={row.minCorrect} min={0}
                    disabled={disabled}
                    onChange={e => update(i, 'minCorrect', Number(e.target.value))}
                    className="w-16 bg-zinc-800 text-white text-center rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                  />
                </td>
                <td className="px-3 py-1.5">
                  <input
                    type="number" value={row.wrongCount} min={1}
                    disabled={disabled}
                    onChange={e => update(i, 'wrongCount', Math.max(1, Number(e.target.value)))}
                    className="w-16 bg-zinc-800 text-white text-center rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <button onClick={() => removeRow(i)} disabled={disabled || parsed.length <= 1}
                    className="text-zinc-700 hover:text-red-400 transition-colors disabled:opacity-20">
                    <Trash2 size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-zinc-600 text-xs">例: 正解数6以上のとき誤答すると×3本つく</p>
    </div>
  )
}
