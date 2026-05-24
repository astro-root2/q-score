export type PlayerStatus =
  | 'active'
  | 'winner'
  | 'eliminated'
  | 'resting'
  | 'withdrawn'

export type MatchStatus = 'pending' | 'active' | 'paused' | 'completed'

export type EventType =
  | 'MATCH_START'
  | 'MATCH_PAUSE'
  | 'MATCH_RESUME'
  | 'MATCH_END'
  | 'QUESTION_NEXT'
  | 'QUESTION_SKIP'
  | 'CORRECT'
  | 'WRONG'
  | 'PASS'
  | 'REST_START'
  | 'REST_END'
  | 'WIN'
  | 'ELIMINATE'
  | 'UNDO'
  | 'OVERRIDE'

export interface PlayerState {
  id: string
  name: string
  ruby: string
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
  players: PlayerState[]
  eventSeq: number
  updatedAt: string
}

export interface ScoreDisplay {
  primary: string
  secondary: string
  detail?: string
}

export interface RuleParamDef {
  key: string
  label: string
  type: 'number' | 'boolean'
  defaultValue: number | boolean
  min?: number
  max?: number
  description?: string
}

export interface ValidationResult {
  valid: boolean
  reason?: string
}

export interface StateTransition {
  nextState: MatchState
  sideEffects: SideEffect[]
}

export interface SideEffect {
  type: 'WIN' | 'ELIMINATE' | 'REST_START' | 'REST_END' | 'CHAIN_RESET'
  playerId: string
  data?: Record<string, unknown>
}

export interface QuizRule {
  readonly id: string
  readonly name: string
  readonly shortName: string
  readonly description: string
  readonly paramDefs: RuleParamDef[]

  initPlayerState(
    participantId: string,
    name: string,
    ruby: string,
    position: number,
    params: Record<string, number | string | boolean>
  ): PlayerState

  initMatchState(
    matchId: string,
    matchName: string,
    participants: Array<{ id: string; name: string; ruby: string; position: number }>,
    params: Record<string, number | string | boolean>
  ): MatchState

  onCorrect(state: MatchState, playerId: string): StateTransition
  onWrong(state: MatchState, playerId: string): StateTransition
  onPass(state: MatchState, playerId: string): StateTransition
  onQuestionNext(state: MatchState): StateTransition
  canAnswer(state: MatchState, playerId: string): ValidationResult
  getScoreDisplay(player: PlayerState): ScoreDisplay
  getRuleSummary(params: Record<string, number | string | boolean>): string
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

export interface BroadcastMessage {
  type: 'STATE_UPDATE' | 'EVENT' | 'SYNC_REQUEST' | 'SYNC_RESPONSE'
  matchId: string
  state?: MatchState
  event?: GameEvent
  requestId?: string
}
