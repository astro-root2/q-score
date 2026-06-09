'use client'
import { useState } from 'react'
import { cn } from '@/lib/utils/cn'
import Link from 'next/link'
import { Play } from 'lucide-react'
import type { Participant, PaperRound, PaperQuestion, PaperSubmission } from './types'
import { CsvMode } from './components/CsvMode'
import { SystemMode } from './components/SystemMode'

type Mode = 'csv' | 'system'

interface Props {
  tournamentId: string
  participants: Participant[]
  paperRounds: PaperRound[]
  paperQuestions: PaperQuestion[]
  paperSubmissions: PaperSubmission[]
}

export default function PaperClient({ tournamentId, participants, paperRounds, paperQuestions, paperSubmissions }: Props) {
  const [mode, setMode] = useState<Mode>('csv')

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-white">ペーパークイズ</h1>
        <div className="flex items-center gap-2">
          <Link href={`/t/${tournamentId}/paper/turnover`}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-yellow-600 hover:bg-yellow-500 text-white text-sm font-bold transition-colors">
            <Play size={14} /> ターンオーバー
          </Link>
          <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1">
            {(['csv', 'system'] as Mode[]).map(m => (
              <button key={m} onClick={() => setMode(m)}
                className={cn('px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors',
                  mode === m ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white')}>
                {m === 'csv' ? 'CSVインポート' : 'システム採点'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {mode === 'csv'
        ? <CsvMode participants={participants} />
        : <SystemMode
            tournamentId={tournamentId}
            participants={participants}
            initRounds={paperRounds}
            initQuestions={paperQuestions}
            initSubs={paperSubmissions}
          />
      }
    </div>
  )
}
