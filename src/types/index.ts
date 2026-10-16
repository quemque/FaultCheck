export type RiskLevel = {
   key: 'low' | 'medium' | 'high' | 'critical'
   hint: string
   box: string
   text: string
}
export type Values = Record<string, string>

export type Result =
   | { kind: 'ok'; probability: number }
   | { kind: 'error'; message: string }
   | null
