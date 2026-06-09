// @ts-nocheck
export interface MatchMeta {
  matchName: string
  tournamentName: string
  roundName: string
  ruleName: string
  totalQuestions: number | null
}

export interface RankColorTier {
  maxRank: number
  bg: string
  bar: string
}

export const DEFAULT_RANK_TIERS: RankColorTier[] = [
  { maxRank: 1,    bg: '#2D0505', bar: '#CC2200' },
  { maxRank: 3,    bg: '#030D2D', bar: '#1155BB' },
  { maxRank: 6,    bg: '#1E1900', bar: '#887700' },
  { maxRank: 9999, bg: '#071507', bar: '#226622' },
]
