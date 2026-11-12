import { useCallback, useRef, useState } from 'react'

import { analyze } from '@/lib/api'
import type { ModelKind, Result, Values } from '../types'

const SCROLL_DELAY_MS = 50
const UNKNOWN_ERROR = 'Неизвестная ошибка.'

export function useAnalysis() {
   const [loading, setLoading] = useState(false)
   const [result, setResult] = useState<Result>(null)
   const resultRef = useRef<HTMLDivElement>(null)

   const scrollToResult = useCallback(() => {
      setTimeout(() => {
         resultRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
         })
      }, SCROLL_DELAY_MS)
   }, [])

   const run = useCallback(
      async (values: Values, model: ModelKind) => {
         setLoading(true)
         try {
            const data = await analyze({ ...values, model })
            setResult({ kind: 'ok', data })
            scrollToResult()
         } catch (error) {
            setResult({
               kind: 'error',
               message: error instanceof Error ? error.message : UNKNOWN_ERROR,
            })
         } finally {
            setLoading(false)
         }
      },
      [scrollToResult],
   )

   return { loading, result, resultRef, run }
}
