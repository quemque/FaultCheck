import type { ModeKey, ModelKind, RiskLevel } from '@/types'
import type { Values } from '../types/index'

export const LEVELS: RiskLevel[] = [
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

export const FIELDS = [
   {
      name: 'air_temperature_k',
      label: 'Температура воздуха',
      en: 'Air temperature',
      unit: 'K',
      step: 'any',
   },
   {
      name: 'process_temperature_k',
      label: 'Температура процесса',
      en: 'Process temperature',
      unit: 'K',
      step: 'any',
   },
   {
      name: 'rotational_speed_rpm',
      label: 'Скорость вращения',
      en: 'Rotational speed',
      unit: 'об./мин.',
      step: '1',
   },
   {
      name: 'torque_nm',
      label: 'Крутящий момент',
      en: 'Torque',
      unit: 'Н·м',
      step: 'any',
   },
   {
      name: 'tool_wear_min',
      label: 'Износ инструмента',
      en: 'Tool wear',
      unit: 'мин.',
      step: '1',
      full: true,
   },
] as const

/** Типы отказов, которые возвращает бэкенд (поле modes) */
export const MODES: {
   key: ModeKey
   label: string
   en: string
   hint: string
}[] = [
   {
      key: 'twf',
      label: 'Износ инструмента',
      en: 'Tool wear',
      hint: 'Инструмент достиг критического износа.',
   },
   {
      key: 'hdf',
      label: 'Отвод тепла',
      en: 'Heat dissipation',
      hint: 'Малая разница температур при низкой скорости вращения.',
   },
   {
      key: 'pwf',
      label: 'Мощность',
      en: 'Power',
      hint: 'Мощность вне рабочего диапазона 3500–9000 Вт.',
   },
   {
      key: 'osf',
      label: 'Перенапряжение',
      en: 'Overstrain',
      hint: 'Износ × момент превышает допустимый предел для этого качества.',
   },
]

export const MODEL_OPTIONS: { value: ModelKind; label: string }[] = [
   { value: 'xgb', label: 'XGBoost — плавная вероятность' },
   { value: 'tree', label: 'Дерево решений / Decision tree' },
]

export const QUALITY_OPTIONS = [
   { value: '0', label: 'L — низкое / low' },
   { value: '1', label: 'M — среднее / medium' },
   { value: '2', label: 'H — высокое / high' },
]

export const INITIAL_VALUES: Values = {
   type: '0',
   air_temperature_k: '298.1',
   process_temperature_k: '308.6',
   rotational_speed_rpm: '1551',
   torque_nm: '42.8',
   tool_wear_min: '0',
}
