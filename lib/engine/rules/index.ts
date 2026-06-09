// @ts-nocheck
import type { QuizRule } from '../types'
import { MonMaruNBatsuRule } from './MonMaruNBatsu'
import { RensotoAbcRule, RensotoAbcKasoRule } from './RensotoAbc'
import { UpDownRule } from './UpDown'
import { ByMRule } from './ByM'
import { FreezeRule } from './Freeze'
import { SwedishRule } from './Swedish'
import { RensotoDisadvantageRule } from './RensotoDisadvantage'
import { DivideMRule } from './DivideM'
import { AttackSurvivalRule } from './AttackSurvival'
import { NewYorkRule } from './NewYork'

const RULES: QuizRule[] = [
  new MonMaruNBatsuRule(),
  new RensotoAbcRule(),
  new RensotoAbcKasoRule(),
  new UpDownRule(),
  new ByMRule(),
  new FreezeRule(),
  new SwedishRule(),
  new RensotoDisadvantageRule(),
  new DivideMRule(),
  new AttackSurvivalRule(),
  new NewYorkRule(),
]

export const RuleRegistry = {
  getAll: (): QuizRule[] => RULES,
  get: (id: string): QuizRule => {
    const r = RULES.find(r => r.id === id)
    if (!r) throw new Error(`Unknown rule: "${id}"`)
    return r
  },
  find: (id: string): QuizRule | null => RULES.find(r => r.id === id) ?? null,
}

export type { QuizRule }
export { SWEDISH_DEFAULT_TABLE } from './Swedish'
