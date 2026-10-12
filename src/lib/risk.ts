export type RiskLevel = {
   key: 'low' | 'medium' | 'high' | 'critical'
   hint: string
   box: string
   text: string
}

const LEVELS: RiskLevel[] = [
   {
      key: 'low',
      hint: 'Оборудование работает в штатном режиме.',
      box: 'bg-emerald-500/10 border-emerald-500/30',
      text: 'text-emerald-400',
   },
   {
      key: 'medium',
      hint: 'Незначительные отклонения. Рекомендуется наблюдение.',
      box: 'bg-yellow-500/10 border-yellow-500/30',
      text: 'text-yellow-400',
   },
   {
      key: 'high',
      hint: 'Повышенный износ. Стоит запланировать обслуживание.',
      box: 'bg-orange-500/10 border-orange-500/30',
      text: 'text-orange-400',
   },
   {
      key: 'critical',
      hint: 'Высокая вероятность отказа. Требуется срочное обслуживание.',
      box: 'bg-red-500/10 border-red-500/30',
      text: 'text-red-400',
   },
]

export function getRisk(percent: number): { index: number; level: RiskLevel } {
   const index = percent < 25 ? 0 : percent < 50 ? 1 : percent < 75 ? 2 : 3
   return { index, level: LEVELS[index]! }
}
