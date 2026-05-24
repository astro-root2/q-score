'use client'

import { useMatchStore } from '@/store/matchStore'
import { cn } from '@/lib/utils/cn'
import { RuleRegistry } from '@/lib/engine/rules'
import type { PlayerState } from '@/lib/engine/types'

interface Props {
  ruleId: string
  onSelect: (id: string) => void
}

export default function PlayerGrid({ ruleId, onSelect }: Props) {
  const { matchState, selectedPlayerId } = useMatchStore()
  const rule = RuleRegistry.find(ruleId)

  if (!matchState || !rule) return null

  const active     = matchState.players.filter(p => p.status === 'active')
  const resting    = matchState.players.filter(p => p.status === 'resting')
  const winners    = matchState.players.filter(p => p.status === 'winner')
  const eliminated = matchState.players.filter(p => p.status === 'eliminated')

  const cols =
    active.length <= 4 ? 2 :
    active.length <= 9 ? 3 : 4

  return (
    <div className="space-y-4">
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {active.map(p => (
          <PlayerCard
            key={p.id}
            player={p}
            rule={rule}
            selected={selectedPlayerId === p.id}
            onSelect={onSelect}
          />
        ))}
      </div>

      {resting.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs text-zinc-600 font-semibold uppercase tracking-wider px-1">休み</div>
          <div className="grid grid-cols-4 gap-1.5">
            {resting.map(p => (
              <PlayerCard key={p.id} player={p} rule={rule} selected={false} onSelect={() => {}} compact />
            ))}
          </div>
        </div>
      )}

      {(winners.length > 0 || eliminated.length > 0) && (
        <div className="flex flex-wrap gap-2 pt-1 border-t border-zinc-800">
          {winners.map(p => (
            <span key={p.id} className="text-xs text-emerald-500 bg-emerald-950/50 border border-emerald-800/50 px-2.5 py-1 rounded-full">
              ✓ {p.name}
            </span>
          ))}
          {eliminated.map(p => (
            <span key={p.id} className="text-xs text-zinc-600 line-through px-2.5 py-1">
              {p.name}
            </span>
          ))}
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
  const isSelectable = player.status === 'active'

  const towerPct = display.towerMax && display.towerMax > 0
    ? Math.min((display.towerValue ?? 0) / display.towerMax * 100, 100) : 0

  if (compact) {
    return (
      <div className={cn(
        'rounded-xl border px-2 py-2 transition-all',
        player.status === 'resting' ? 'border-yellow-800/60 bg-yellow-950/20' : 'border-zinc-800 bg-zinc-900/60 opacity-60',
      )}>
        <div className="text-xs text-white font-semibold truncate">{player.name}</div>
        <div className="text-xs font-bold text-zinc-300">{display.primary}</div>
        {player.status === 'resting' && player.restRemaining > 0 && (
          <div className="text-xs text-yellow-500">休{player.restRemaining}</div>
        )}
      </div>
    )
  }

  return (
    <div
      onClick={() => isSelectable && onSelect(player.id)}
      className={cn(
        'relative rounded-2xl border-2 overflow-hidden transition-all select-none',
        isSelectable ? 'cursor-pointer' : 'cursor-default',
        !selected && 'border-zinc-700 bg-zinc-900 hover:border-zinc-500',
        selected && 'border-blue-400 bg-blue-950/30 shadow-lg shadow-blue-900/30 scale-[1.02]',
        !selected && player.lastAnswered === 'correct' && 'border-emerald-500/60',
        !selected && player.lastAnswered === 'wrong' && 'border-red-500/40',
      )}>
      <div className="px-3 pt-3 pb-1">
        <div className={cn('font-bold truncate leading-tight text-sm', selected ? 'text-blue-200' : 'text-white')}>
          {player.name}
        </div>
        {player.affiliation && (
          <div className="text-zinc-500 text-xs truncate">{player.affiliation}</div>
        )}
      </div>

      <div className="relative mx-3 mb-3 h-16 rounded-xl overflow-hidden bg-zinc-800">
        {towerPct > 0 && (
          <div
            className={cn('absolute bottom-0 inset-x-0 transition-all duration-500', selected ? 'bg-blue-700' : 'bg-zinc-600')}
            style={{ height: `${towerPct}%` }}
          />
        )}
        <div className="relative z-10 h-full flex items-center justify-center gap-2">
          <span className={cn(
            'font-black tabular-nums text-3xl leading-none',
            selected ? 'text-blue-200' : 'text-white',
            player.lastAnswered === 'correct' && 'text-emerald-300',
            player.lastAnswered === 'wrong' && 'text-red-300',
          )}>
            {display.primary}
          </span>
          {display.detail && <span className="text-yellow-400 text-xs">{display.detail}</span>}
        </div>
      </div>

      {(player.correct > 0 || player.wrong > 0) && (
        <div className="flex justify-center gap-3 pb-2.5 text-xs">
          {player.correct > 0 && <span className="text-emerald-400">{player.correct}○</span>}
          {player.wrong > 0 && <span className="text-red-400">{player.wrong}✕</span>}
          {display.secondary && <span className="text-zinc-500">{display.secondary}</span>}
        </div>
      )}

      {selected && (
        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
      )}
    </div>
  )
}
