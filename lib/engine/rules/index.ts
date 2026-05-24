import type { QuizRule } from '../types'
import { MonMaruNBatsuRule } from './MonMaruNBatsu'
import { MonMaruNYasumiRule } from './MonMaruNYasumi'
import { UpDownRule } from './UpDown'
import { RensotoTsukiRule } from './RensotoTsuki'
import { ByRule } from './By'
import { FreezeRule } from './Freeze'
import { SwedishRule } from './Swedish'

const RULE_INSTANCES: QuizRule[] = [
  new MonMaruNBatsuRule(),
  new MonMaruNYasumiRule(),
  new UpDownRule(),
  new RensotoTsukiRule(),
  new ByRule(),
  new FreezeRule(),
  new SwedishRule(),
]

export const RuleRegistry = {
  getAll(): QuizRule[] { return RULE_INSTANCES },
  get(ruleId: string): QuizRule {
    const rule = RULE_INSTANCES.find(r => r.id === ruleId)
    if (!rule) throw new Error(`Unknown rule: "${ruleId}"`)
    return rule
  },
  find(ruleId: string): QuizRule | null {
    return RULE_INSTANCES.find(r => r.id === ruleId) ?? null
  },
  register(rule: QuizRule): void {
    if (RULE_INSTANCES.find(r => r.id === rule.id)) {
      console.warn(`Rule "${rule.id}" is already registered. Skipping.`)
      return
    }
    RULE_INSTANCES.push(rule)
  },
}

export const RULE_CATEGORIES = [
  { label: 'Basic', description: '基本的な正解/誤答カウントルール',
    ruleIds: ['mon_maru_n_batsu', 'mon_maru_n_yasumi'] },
  { label: 'abc / EQIDEN', description: 'abc形式・駅伝形式のルール',
    ruleIds: ['up_down', 'rensoto_tsuki'] },
  { label: 'STU', description: 'ポイント制ルール',
    ruleIds: ['by', 'swedish'] },
  { label: 'Penalty', description: 'ペナルティ・フリーズ系ルール',
    ruleIds: ['freeze'] },
] as const

export type { QuizRule }
