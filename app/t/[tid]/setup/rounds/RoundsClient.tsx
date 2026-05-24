'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils/cn'
import { Plus, Trash2, Layers, ChevronDown, ChevronUp } from 'lucide-react'
import type { RuleParamDef } from '@/lib/engine/types'

interface Rule {
  id: string; name: string; shortName: string
  description: string; paramDefs: RuleParamDef[]
}
interface Round {
  id: string; tournament_id: string; name: string
  order_index: number; rule_id: string; rule_params: Record<string, number | string | boolean>
}
interface Props {
  tournament: { id: string; name: string }
  initialRounds: Round[]
  rules: Rule[]
}

export default function RoundsClient({ tournament, initialRounds, rules }: Props) {
  const supabase = createClient()
  const [rounds, setRounds] = useState<Round[]>(initialRounds)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  const defaultParams = (rule: Rule) =>
    Object.fromEntries(rule.paramDefs.map(p => [p.key, p.defaultValue]))

  const addRound = () => {
    const defaultRule = rules[0]
    const temp: Round = {
      id: `new-${Date.now()}`,
      tournament_id: tournament.id,
      name: `ラウンド ${rounds.length + 1}`,
      order_index: rounds.length + 1,
      rule_id: defaultRule.id,
      rule_params: defaultParams(defaultRule),
    }
    setRounds(prev => [...prev, temp])
    setExpanded(temp.id)
  }

  const update = (id: string, field: keyof Round, value: unknown) => {
    setRounds(prev => prev.map(r => {
      if (r.id !== id) return r
      if (field === 'rule_id') {
        const rule = rules.find(ru => ru.id === value)!
        return { ...r, rule_id: rule.id, rule_params: defaultParams(rule) }
      }
      return { ...r, [field]: value }
    }))
  }

  const updateParam = (id: string, key: string, value: number | string | boolean) => {
    setRounds(prev => prev.map(r =>
      r.id === id ? { ...r, rule_params: { ...r.rule_params, [key]: value } } : r
    ))
  }

  const remove = async (r: Round) => {
    if (!r.id.startsWith('new-')) {
      await supabase.from('rounds').delete().eq('id', r.id)
    }
    setRounds(prev => prev.filter(x => x.id !== r.id))
  }

  const save = async () => {
    setSaving(true); setMsg(null)
    try {
      for (const [i, r] of rounds.entries()) {
        const payload = {
          tournament_id: tournament.id,
          name: r.name,
          order_index: i + 1,
          rule_id: r.rule_id,
          rule_params: r.rule_params,
        }
        if (r.id.startsWith('new-')) {
          const { data, error } = await supabase.from('rounds').insert(payload).select().single()
          if (error) throw error
          setRounds(prev => prev.map(x => x.id === r.id ? data : x))
        } else {
          const { error } = await supabase.from('rounds').update(payload).eq('id', r.id)
          if (error) throw error
        }
      }
      setMsg('保存しました ✓')
    } catch (e) {
      setMsg(`エラー: ${(e as Error).message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Layers size={20} className="text-purple-400" />
          <h1 className="text-xl font-bold text-white">ラウンド管理</h1>
          <span className="text-sm text-zinc-400">{rounds.length} ラウンド</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={addRound}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors">
            <Plus size={14} /> ラウンド追加
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

      {rounds.length === 0 && (
        <div className="text-center py-16 border-2 border-dashed border-zinc-800 rounded-xl">
          <p className="text-zinc-500 text-sm mb-3">ラウンドがありません</p>
          <button onClick={addRound} className="text-purple-400 hover:text-purple-300 text-sm underline">
            ラウンドを追加する
          </button>
        </div>
      )}

      <div className="space-y-3">
        {rounds.map((r, i) => {
          const rule = rules.find(ru => ru.id === r.rule_id) ?? rules[0]
          const isOpen = expanded === r.id
          return (
            <div key={r.id} className="bg-zinc-900 rounded-xl border border-zinc-800">
              <div className="flex items-center gap-3 px-4 py-3">
                <span className="text-zinc-500 text-sm w-5 text-right">{i + 1}</span>
                <input
                  value={r.name}
                  onChange={e => update(r.id, 'name', e.target.value)}
                  className="flex-1 bg-transparent text-white font-semibold focus:outline-none focus:bg-zinc-800/50 rounded px-2 py-1"
                />
                <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded">
                  {rule.shortName}
                </span>
                <button onClick={() => setExpanded(isOpen ? null : r.id)}
                  className="p-1 text-zinc-500 hover:text-white transition-colors">
                  {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                <button onClick={() => remove(r)}
                  className="p-1 text-zinc-600 hover:text-red-400 transition-colors">
                  <Trash2 size={15} />
                </button>
              </div>

              {isOpen && (
                <div className="px-4 pb-4 border-t border-zinc-800 space-y-4 pt-4">
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">ルール</label>
                    <select
                      value={r.rule_id}
                      onChange={e => update(r.id, 'rule_id', e.target.value)}
                      className="w-full bg-zinc-800 text-white rounded-lg px-3 py-2 text-sm border border-zinc-700 focus:outline-none focus:border-purple-500">
                      {rules.map(ru => (
                        <option key={ru.id} value={ru.id}>{ru.name} ({ru.shortName})</option>
                      ))}
                    </select>
                    <p className="text-xs text-zinc-500 mt-1">{rule.description}</p>
                  </div>

                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">開始問題番号</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={Number(r.rule_params['_startQ'] ?? 1)}
                        min={1}
                        onChange={e => updateParam(r.id, '_startQ', Math.max(1, Number(e.target.value)))}
                        className="w-24 bg-zinc-800 text-white rounded px-2 py-1 text-sm border border-zinc-700 focus:outline-none focus:border-purple-500"
                      />
                      <span className="text-xs text-zinc-500">問目から開始（前の試合の続きに使用）</span>
                    </div>
                  </div>

                  {rule.paramDefs.length > 0 && (
                    <div>
                      <label className="text-xs text-zinc-400 block mb-2">ルールパラメータ</label>
                      <div className="grid grid-cols-2 gap-3">
                        {rule.paramDefs.map(pd => (
                          <div key={pd.key}>
                            <label className="text-xs text-zinc-500 block mb-1">{pd.label}</label>
                            {pd.type === 'boolean' ? (
                              <input
                                type="checkbox"
                                checked={Boolean(r.rule_params[pd.key] ?? pd.defaultValue)}
                                onChange={e => updateParam(r.id, pd.key, e.target.checked)}
                                className="w-4 h-4 accent-purple-500"
                              />
                            ) : (
                              <input
                                type="number"
                                value={Number(r.rule_params[pd.key] ?? pd.defaultValue)}
                                min={pd.min}
                                max={pd.max}
                                onChange={e => updateParam(r.id, pd.key, Number(e.target.value))}
                                className="w-full bg-zinc-800 text-white rounded px-2 py-1 text-sm border border-zinc-700 focus:outline-none focus:border-purple-500"
                              />
                            )}
                            {pd.description && (
                              <p className="text-xs text-zinc-600 mt-0.5">{pd.description}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
