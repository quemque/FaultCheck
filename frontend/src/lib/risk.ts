import type { RiskLevel } from '@/types/index'
import { LEVELS } from '@/consts/const'

/**
 * Уровень риска по вероятности, но решение модели приоритетнее:
 * если модель признала отказ — всегда critical, если нет — не выше high.
 * (Вероятности не откалиброваны из-за весов классов, поэтому
 * одни проценты без порога дают вводящий в заблуждение цвет.)
 */
export function getRisk(
   percent: number,
   isFailure?: boolean,
): { index: number; level: RiskLevel } {
   let index = percent < 25 ? 0 : percent < 50 ? 1 : percent < 75 ? 2 : 3
   if (isFailure === true) index = 3
   else if (isFailure === false) index = Math.min(index, 2)
   return { index, level: LEVELS[index]! }
}
