import type { RiskLevel } from '@/types/index'
import { LEVELS } from '@/consts/const'

export function getRisk(percent: number): { index: number; level: RiskLevel } {
   const index = percent < 25 ? 0 : percent < 50 ? 1 : percent < 75 ? 2 : 3
   return { index, level: LEVELS[index]! }
}
