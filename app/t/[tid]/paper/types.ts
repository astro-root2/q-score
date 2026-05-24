export interface Participant {
  id: string
  name: string
  ruby: string | null
  affiliation: string | null
  paper_rank: number | null
}

export interface PaperRound {
  id: string
  name: string
  order_index: number
  ranking_priority: string[]
}

export interface PaperQuestion {
  id: string
  paper_round_id: string
  order_index: number
  question_text: string
  correct_answer: string
  question_type: string
}

export interface PaperSubmission {
  id: string
  paper_round_id: string
  participant_id: string
  raw_score: number
  proximity_error: number | null
  chain1: number
  chain2: number
  chain3: number
}

export interface CsvRow {
  no: number
  name: string
  ruby: string
  affiliation: string
  grade: string
  raw_score: number
  proximity_error: number | null
  chain1: number
  chain2: number
  chain3: number
}

export const SORT_KEYS = [
  { key: 'raw_score',       label: '素点',       asc: false },
  { key: 'proximity_error', label: '近似値誤差', asc: true  },
  { key: 'chain1',          label: '第1連答',    asc: false },
  { key: 'chain2',          label: '第2連答',    asc: false },
  { key: 'chain3',          label: '第3連答',    asc: false },
] as const
