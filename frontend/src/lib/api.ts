import type { AnalysisResponse, MetricsResponse } from '@/types'

export type AnalyzeParams = Record<string, string>

const MODE_KEYS = ['twf', 'hdf', 'pwf', 'osf'] as const

function isAnalysisResponse(data: unknown): data is AnalysisResponse {
   if (typeof data !== 'object' || data === null) return false
   const r = data as Partial<AnalysisResponse>

   return (
      typeof r.failure_probability === 'number' &&
      !Number.isNaN(r.failure_probability) &&
      typeof r.is_failure === 'boolean' &&
      Array.isArray(r.highlighted_sensors) &&
      typeof r.modes === 'object' &&
      r.modes !== null &&
      MODE_KEYS.every((key) => typeof r.modes?.[key]?.probability === 'number')
   )
}

export async function analyze(
   params: AnalyzeParams,
): Promise<AnalysisResponse> {
   const res = await fetch(`/api/analyze?${new URLSearchParams(params)}`)
   if (!res.ok) throw new Error('Не удалось получить ответ от сервиса.')

   const data: unknown = await res.json()
   if (!isAnalysisResponse(data)) throw new Error('Некорректный ответ сервиса.')
   return data
}

function isMetricsResponse(data: unknown): data is MetricsResponse {
   if (typeof data !== 'object' || data === null) return false
   const r = data as Partial<MetricsResponse>
   return Array.isArray(r.holdout) && Array.isArray(r.cv)
}

export async function fetchMetrics(
   signal?: AbortSignal,
): Promise<MetricsResponse> {
   const res = await fetch('/api/metrics', { signal })
   if (!res.ok) throw new Error('Не удалось загрузить метрики.')

   const data: unknown = await res.json()
   if (!isMetricsResponse(data))
      throw new Error('Некорректный ответ сервиса. Обновите бэкенд.')
   return data
}
