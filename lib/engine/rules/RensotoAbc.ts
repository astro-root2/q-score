// @ts-nocheck
import type { QuizRule, MatchState, PlayerState, StateTransition, ValidationResult, ScoreDisplay, RuleParamDef, ParticipantInit, PlayerOpts } from '../types'
import { cloneState, makePlayerState, makeMatchState, applyWin, applyEliminate, decrementRests, statusReason, breakChainForOthers } from './utils'

// 連答付きm◯n× 等速ver（新型abc）: 自分の正解でも連答権消失
export class RensotoAbcRule implements QuizRule {
  readonly id = 'rensoto_abc'
  readonly name = '連答付きm◯n×（等速）'
  readonly shortName = 'abc新'
  readonly description = '正解+1pt、連答権あり正解+2pt。連答権は自分の正解/誤答、他人の正解で消失。m点勝ち抜け、n誤答失格。'
  readonly paramDefs: RuleParamDef[] = [
    { key: 'win', label: '勝ち抜けポイント (m)', type: 'number', defaultValue: 5, min: 1, max: 50 },
    { key: 'lose', label: '失格誤答数 (n)', type: 'number', defaultValue: 2, min: 0, max: 20, description: '0=無制限' },
  ]
  initPlayerState(id: string, name: string, ruby: string, position: number, opts: PlayerOpts = {}): PlayerState {
    return makePlayerState(id, name, ruby, position, opts)
  }
  initMatchState(matchId: string, matchName: string, participants: ParticipantInit[], params: Record<string, number | string | boolean>): MatchState {
    return makeMatchState(matchId, matchName, participants, params, this.id, p => this.initPlayerState(p.id, p.name, p.ruby, p.position, p))
  }
  canAnswer(state: MatchState, playerId: string): ValidationResult {
    const p = state.players.find(pl => pl.id === playerId)
    if (!p) return { valid: false, reason: 'Player not found' }
    if (p.status !== 'active') return { valid: false, reason: statusReason(p.status, p.restRemaining) }
    return { valid: true }
  }
  onCorrect(state: MatchState, playerId: string): StateTransition {
    const next = cloneState(state)
    breakChainForOthers(next, playerId)
    const p = next.players.find(pl => pl.id === playerId)!
    if (p.hasChain) {
      p.points += 2; p.correct++; p.hasChain = false; p.chainCount = 0 // 等速: 使ったら消失
    } else {
      p.points++; p.correct++; p.hasChain = true; p.chainCount = 1
    }
    p.lastAnswered = 'correct'
    if (p.points >= Number(state.ruleParams.win)) return applyWin(next, playerId)
    return { nextState: next, sideEffects: [] }
  }
  onWrong(state: MatchState, playerId: string): StateTransition {
    const next = cloneState(state)
    const p = next.players.find(pl => pl.id === playerId)!
    p.wrong++; p.hasChain = false; p.chainCount = 0; p.lastAnswered = 'wrong'
    const lose = Number(state.ruleParams.lose)
    if (lose > 0 && p.wrong >= lose) return applyEliminate(next, playerId)
    return { nextState: next, sideEffects: [] }
  }
  onPass(state: MatchState, playerId: string): StateTransition {
    const next = cloneState(state)
    next.players.find(pl => pl.id === playerId)!.lastAnswered = null
    return { nextState: next, sideEffects: [] }
  }
  onQuestionNext(state: MatchState): StateTransition {
    const next = cloneState(state)
    next.questionNumber++; next.questionText = null; decrementRests(next)
    return { nextState: next, sideEffects: [] }
  }
  getScoreDisplay(player: PlayerState, params?: Record<string, number | string | boolean>): ScoreDisplay {
    const win = params ? Number(params.win) : 10
    return {
      primary: `${player.points}pt`, secondary: `${player.correct}○${player.wrong}✕`,
      detail: player.hasChain ? '🔗連答権' : undefined, towerValue: player.points, towerMax: win,
    }
  }
  getRuleSummary(params: Record<string, number | string | boolean>): string {
    return `${params.win}pt勝ち抜け${params.lose}✕失格（等速）`
  }
}

// 連答付きm◯n× 加速ver（旧型abc）: 自分の正解では連答権消失しない
export class RensotoAbcKasoRule implements QuizRule {
  readonly id = 'rensoto_abc_kaso'
  readonly name = '連答付きm◯n×（加速）'
  readonly shortName = 'abc旧'
  readonly description = '正解+1pt、連答権あり正解+2pt。連答権は自分の誤答、他人の正解でのみ消失（加速継続）。'
  readonly paramDefs: RuleParamDef[] = [
    { key: 'win', label: '勝ち抜けポイント (m)', type: 'number', defaultValue: 5, min: 1, max: 50 },
    { key: 'lose', label: '失格誤答数 (n)', type: 'number', defaultValue: 2, min: 0, max: 20, description: '0=無制限' },
  ]
  initPlayerState(id: string, name: string, ruby: string, position: number, opts: PlayerOpts = {}): PlayerState {
    return makePlayerState(id, name, ruby, position, opts)
  }
  initMatchState(matchId: string, matchName: string, participants: ParticipantInit[], params: Record<string, number | string | boolean>): MatchState {
    return makeMatchState(matchId, matchName, participants, params, this.id, p => this.initPlayerState(p.id, p.name, p.ruby, p.position, p))
  }
  canAnswer(state: MatchState, playerId: string): ValidationResult {
    const p = state.players.find(pl => pl.id === playerId)
    if (!p) return { valid: false, reason: 'Player not found' }
    if (p.status !== 'active') return { valid: false, reason: statusReason(p.status, p.restRemaining) }
    return { valid: true }
  }
  onCorrect(state: MatchState, playerId: string): StateTransition {
    const next = cloneState(state)
    breakChainForOthers(next, playerId)
    const p = next.players.find(pl => pl.id === playerId)!
    if (p.hasChain) {
      p.points += 2; p.correct++; p.chainCount++
      // 加速: 連答権は消失しない
    } else {
      p.points++; p.correct++; p.hasChain = true; p.chainCount = 1
    }
    p.lastAnswered = 'correct'
    if (p.points >= Number(state.ruleParams.win)) return applyWin(next, playerId)
    return { nextState: next, sideEffects: [] }
  }
  onWrong(state: MatchState, playerId: string): StateTransition {
    const next = cloneState(state)
    const p = next.players.find(pl => pl.id === playerId)!
    p.wrong++; p.hasChain = false; p.chainCount = 0; p.lastAnswered = 'wrong'
    const lose = Number(state.ruleParams.lose)
    if (lose > 0 && p.wrong >= lose) return applyEliminate(next, playerId)
    return { nextState: next, sideEffects: [] }
  }
  onPass(state: MatchState, playerId: string): StateTransition {
    const next = cloneState(state)
    next.players.find(pl => pl.id === playerId)!.lastAnswered = null
    return { nextState: next, sideEffects: [] }
  }
  onQuestionNext(state: MatchState): StateTransition {
    const next = cloneState(state)
    next.questionNumber++; next.questionText = null; decrementRests(next)
    return { nextState: next, sideEffects: [] }
  }
  getScoreDisplay(player: PlayerState, params?: Record<string, number | string | boolean>): ScoreDisplay {
    const win = params ? Number(params.win) : 10
    return {
      primary: `${player.points}pt`, secondary: `${player.correct}○${player.wrong}✕`,
      detail: player.hasChain ? `🔗×${player.chainCount}` : undefined,
      towerValue: player.points, towerMax: win,
    }
  }
  getRuleSummary(params: Record<string, number | string | boolean>): string {
    return `${params.win}pt勝ち抜け${params.lose}✕失格（加速）`
  }
}
