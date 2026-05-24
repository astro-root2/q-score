import type { MatchState } from '@/lib/engine/types'
import { RuleRegistry } from '@/lib/engine/rules'
import type { MatchMeta } from '../types'

export function CompletedScreen({ state, meta }: { state: MatchState; meta: MatchMeta | null }) {
  const rule    = RuleRegistry.find(state.ruleId)
  const winners = state.players.filter(p => p.status === 'winner')
  const ranked  = [...state.players]
    .filter(p => p.status !== 'winner')
    .sort((a, b) => (Number(rule?.getScoreDisplay(b, state.ruleParams)?.primary) || 0) - (Number(rule?.getScoreDisplay(a, state.ruleParams)?.primary) || 0))

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', backgroundImage: 'radial-gradient(circle at 50% 10%, #1e293b 0%, #0f172a 100%)', color: '#f1f5f9', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 32, fontFamily: "'Hiragino Sans', sans-serif" }}>
      {meta?.tournamentName && <div style={{ color: '#94a3b8', fontSize: 14, letterSpacing: '0.2em' }}>{meta.tournamentName}</div>}
      <div style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 22 }}>{meta?.matchName ?? state.matchName}</div>
      <div style={{ color: '#64748b', fontSize: 12, letterSpacing: '0.3em' }}>RESULT</div>

      {winners.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{ color: '#64748b', fontSize: 11, letterSpacing: '0.3em' }}>WINNER</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'center' }}>
            {winners.map(p => (
              <div key={p.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 20, padding: '20px 32px' }}>
                <span style={{ fontSize: 40 }}>🏆</span>
                <span style={{ color: '#f59e0b', fontWeight: 900, fontSize: 28 }}>{p.name}</span>
                {p.affiliation && <span style={{ color: '#64748b', fontSize: 13 }}>{p.affiliation}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: 700 }}>
        {ranked.map((p, i) => (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 12, background: 'rgba(30,41,59,0.6)', border: `1px solid rgba(255,255,255,${p.status === 'eliminated' ? 0.04 : 0.08})`, opacity: p.status === 'eliminated' ? 0.45 : 1 }}>
            <span style={{ color: '#475569', fontSize: 12 }}>{i + 1}</span>
            <span style={{ color: '#cbd5e1', textDecoration: p.status === 'eliminated' ? 'line-through' : 'none', fontSize: 14 }}>{p.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
