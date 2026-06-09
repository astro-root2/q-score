// @ts-nocheck
export interface MatchMeta {
  matchName: string
  tournamentName: string
  roundName: string
  ruleName: string
  ruleSummary: string
  totalQuestions: number | null
  logoUrl: string | null
}

export interface RankColorTier {
  maxRank: number
  bg: string
  bar: string
}

export const DEFAULT_RANK_TIERS: RankColorTier[] = [
  { maxRank: 1,    bg: '#1a0202', bar: '#FF3311' },
  { maxRank: 3,    bg: '#010a1f', bar: '#2277FF' },
  { maxRank: 6,    bg: '#141000', bar: '#AAAA00' },
  { maxRank: 9999, bg: '#020d02', bar: '#33AA33' },
]

export interface ScreenSettings {
  showRoundName: boolean
  showRuleName: boolean
  showQNumber: boolean
  showPlayerCount: boolean
  showLogo: boolean
  showGroupName: boolean
  showTournamentName: boolean
  showQAArea: boolean
  showQuestion: boolean
  questionPlaceholder: string
  showAnswer: boolean
  answerPlaceholder: string
}

export const DEFAULT_SCREEN_SETTINGS: ScreenSettings = {
  showRoundName: true,
  showRuleName: true,
  showQNumber: true,
  showPlayerCount: true,
  showLogo: true,
  showGroupName: true,
  showTournamentName: true,
  showQAArea: true,
  showQuestion: true,
  questionPlaceholder: 'ここに問題が表示されます',
  showAnswer: false,
  answerPlaceholder: 'ここに解答が表示されます',
}
