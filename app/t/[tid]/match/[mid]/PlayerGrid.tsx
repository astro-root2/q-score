'use client'

import { useMatchStore } from '@/store/matchStore'
import { cn } from '@/lib/utils/cn'
import { RuleRegistry } from '@/lib/engine/rules'
import type { PlayerState } from '@/lib/engine/types'

interface Props {
  ruleId: string
  onSelect: (id: string) => void
}

const STATUS_STYLE: Record<string, string> = {
  active:    'border-zinc-700 bg-zinc-900 hover:border-zinc-500 cursor-pointer',
  winner:    'border-emerald-600 bg-emerald-900/20 opacity-80',
  eliminated:'border-red-900 bg-red-900/10 opacity-50',
  resting:   'border-yellow-700 bg-yellow-900/10',
  withdrawn: 'border-zinc-800 bg-zinc-900/50 opacity-40',
}

export default function PlayerGrid({ ruleId, onSelect }: Props) {
  const { matchState, selectedPlayerId } = useMatchStore()
  const rule = RuleRegistry.find(ruleId)

  if (!matchState || !rule) return null

  const active = matchState.players.filter(p => p.status === 'active')
  const others = matchState.players.filter(p => p.status !== 'active')

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {active.map(p => <PlayerCard key={p.id} player={p} rule={rule} selected={selectedPlayerId === p.id} onSelect={onSelect} />)}
      </div>
      {others.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1.5 opacity-60">
          {others.map(p => <PlayerCard key={p.id} player={p} rule={rule} selected={false} onSelect={() => {}} compact />)}
        </div>
      )}
    </div>
  )
}

function PlayerCard({ player, rule, selected, onSelect, compact }: {
  player: PlayerState
  rule: ReturnType<typeof RuleRegistry.find>
  selected: boolean
  onSelect: (id: string) => void
  compact?: boolean
}) {
  if (!rule) return null
  const display = rule.getScoreDisplay(player)
  const style = STATUS_STYLE[player.status] ?? STATUS_STYLE.active

  return (
    <div
      onClick={() => player.status === 'active' && onSelect(player.id)}
      className={cn(
        'rounded-xl border-2 transition-all select-none',
        compact ? 'px-2 py-1.5' : 'px-3 py-3',
        style,
        selected && 'border-blue-400 bg-blue-900/20 ring-2 ring-blue-400/30',
        player.lastAnswered === 'correct' && 'ring-2 ring-emerald-400/50',
        player.lastAnswered === 'wrong' && 'ring-2 ring-red-400/50',
      )}>
      <div className={cn('font-semibold text-white truncate', compact ? 'text-xs' : 'text-sm')}>
        {player.name}
      </div>
      {!compact && (
        <>
          <div className="text-2xl font-black text-white mt-1">{display.primary}</div>
          <div className="text-xs text-zinc-400">{display.secondary}</div>
          {display.detail && <div className="text-xs text-yellow-400 mt-0.5">{display.detail}</div>}
        </>
      )}
      {compact && <div className="text-xs font-bold text-zinc-300">{display.primary}</div>}
    </div>
  )
}
