export type AnalyzeParams = Record<string, string>

export async function analyze(params: AnalyzeParams): Promise<number> {
   const res = await fetch(`/api/analyze?${new URLSearchParams(params)}`)
   if (!res.ok) throw new Error('Не удалось получить ответ от сервиса.')

   const data = await res.json()
   const num = typeof data === 'number' ? data : parseFloat(data)
   if (Number.isNaN(num)) throw new Error('Некорректный ответ сервиса.')
   return num
}
