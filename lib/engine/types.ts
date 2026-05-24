export type PlayerStatus = 'active' | 'winner' | 'eliminated' | 'resting' | 'withdrawn'
export type MatchStatus = 'pending' | 'active' | 'paused' | 'completed'
export type EventType =
  | 'MATCH_START' | 'MATCH_PAUSE' | 'MATCH_RESUME' | 'MATCH_END'
  | 'CORRECT' | 'WRONG' | 'PASS' | 'QUESTION_NEXT' | 'QUESTION_SLASH'
  | 'FORCE_WIN' | 'FORCE_ELIMINATE' | 'UNDO'

export interface PlayerOpts {
  nickname?: string | null
  affiliation?: string | null
  grade?: string | null
  paperRank?: number | null
}

export interface PlayerState {
  id: string
  name: string
  ruby: string
  nickname: string | null
  affiliation: string | null
  grade: string | null
  paperRank: number | null
  position: number
  status: PlayerStatus
  correct: number
  wrong: number
  points: number
  restRemaining: number
  hasChain: boolean
  chainCount: number
  lastAnswered: 'correct' | 'wrong' | null
  extra: Record<string, unknown>
}

export interface MatchState {
  matchId: string
  matchName: string
  status: MatchStatus
  ruleId: string
  ruleParams: Record<string, number | string | boolean>
  questionNumber: number
  questionText: string | null
  players: PlayerState[]
  eventSeq: number
  updatedAt: string
}

export interface RuleParamDef {
  key: string
  label: string
  type: 'number' | 'boolean' | 'string' | 'swedish_table'
  defaultValue: number | string | boolean
  min?: number
  max?: number
  description?: string
}

export interface ScoreDisplay {
  primary: string
  secondary?: string
  detail?: string
  towerValue?: number
  towerMax?: number
}

export interface ValidationResult { valid: boolean; reason?: string }

export interface StateTransition {
  nextState: MatchState
  sideEffects: Array<{ type: string; payload: Record<string, unknown> }>
}

export interface GameEvent {
  id: string
  matchId: string
  seq: number
  eventType: EventType
  actorId: string | null
  operatorId: string | null
  payload: Record<string, unknown>
  undone: boolean
  createdAt: string
}

export type ParticipantInit = { id: string; name: string; ruby: string; position: number } & PlayerOpts

export interface QuizRule {
  readonly id: string
  readonly name: string
  readonly shortName: string
  readonly description: string
  readonly paramDefs: RuleParamDef[]
  initPlayerState(id: string, name: string, ruby: string, position: number, opts?: PlayerOpts): PlayerState
  initMatchState(matchId: string, matchName: string, participants: ParticipantInit[], params: Record<string, number | string | boolean>): MatchState
  canAnswer(state: MatchState, playerId: string): ValidationResult
  onCorrect(state: MatchState, playerId: string): StateTransition
  onWrong(state: MatchState, playerId: string): StateTransition
  onPass(state: MatchState, playerId: string): StateTransition
  onQuestionNext(state: MatchState): StateTransition
  getScoreDisplay(player: PlayerState, params?: Record<string, number | string | boolean>): ScoreDisplay
  getRuleSummary(params: Record<string, number | string | boolean>): string
}
