import { useEffect, useState } from 'react'
import { ArrowLeft, Loader2 } from 'lucide-react'

import {
   Card,
   CardContent,
   CardDescription,
   CardHeader,
   CardTitle,
} from '@/components/ui/card'
import { ErrorResult } from '@/components/ui/Error'
import { NavLink } from '@/components/NavLink'
import { METRICS, MODEL_LABELS, TARGETS } from '@/consts/metrics'
import { fetchMetrics } from '@/lib/api'
import { cn } from '@/lib/utils'
import type {
   CvRow,
   HoldoutRow,
   MetricKey,
   MetricsResponse,
   ModelKind,
   TargetKey,
} from '@/types'

type Cell = { value: number; std?: number }

type ViewRow = {
   target: TargetKey
   model: ModelKind
   cells: Record<MetricKey, Cell>
   counts?: { tp: number; fp: number; fn: number }
}

const holdoutView = (r: HoldoutRow): ViewRow => ({
   target: r.target,
   model: r.model,
   cells: Object.fromEntries(
      METRICS.map(({ key }) => [key, { value: r[key] }]),
   ) as Record<MetricKey, Cell>,
   counts: { tp: r.tp, fp: r.fp, fn: r.fn },
})

const cvView = (r: CvRow): ViewRow => ({
   target: r.target,
   model: r.model,
   cells: Object.fromEntries(
      METRICS.map(({ key }) => [
         key,
         { value: r[`${key}_mean` as const], std: r[`${key}_std` as const] },
      ]),
   ) as Record<MetricKey, Cell>,
})

const fmt = (v: number) => (Number.isFinite(v) ? v.toFixed(3) : '—')

/** Лучшая модель по метрике — только если отрыв больше разброса по фолдам */
function isBest(rows: ViewRow[], row: ViewRow, key: MetricKey): boolean {
   const mine = row.cells[key]
   return rows
      .filter((other) => other.target === row.target && other !== row)
      .every((other) => {
         const theirs = other.cells[key]
         const tolerance = Math.max(mine.std ?? 0, theirs.std ?? 0)
         return mine.value - theirs.value > tolerance
      })
}

function MetricsTable({ rows }: { rows: ViewRow[] }) {
   const withCounts = rows.some((row) => row.counts)

   return (
      <div className="overflow-x-auto rounded-lg border">
         <table className="w-full min-w-[900px] border-collapse text-[13px]">
            <thead>
               <tr className="bg-muted/40 text-left text-[11.5px] text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Тип отказа</th>
                  <th className="px-3 py-2 font-medium">Модель</th>
                  {METRICS.map((m) => (
                     <th
                        key={m.key}
                        title={m.hint}
                        className="cursor-help px-3 py-2 text-right font-medium"
                     >
                        {m.label}
                     </th>
                  ))}
                  {withCounts && (
                     <th
                        title="Верно найденные отказы / ложные тревоги / пропущенные отказы"
                        className="cursor-help px-3 py-2 text-right font-medium"
                     >
                        TP / FP / FN
                     </th>
                  )}
               </tr>
            </thead>

            {TARGETS.map((target) => {
               const group = rows.filter((row) => row.target === target.key)
               if (group.length === 0) return null

               return (
                  <tbody key={target.key} className="border-t">
                     {group.map((row, i) => (
                        <tr key={row.model}>
                           <td className="px-3 py-2 align-top">
                              {i === 0 && (
                                 <>
                                    <div className="font-medium">
                                       {target.label}
                                    </div>
                                    <div className="text-[11px] text-muted-foreground">
                                       {target.en}
                                    </div>
                                 </>
                              )}
                           </td>
                           <td className="px-3 py-2">
                              {MODEL_LABELS[row.model]}
                           </td>
                           {METRICS.map(({ key }) => {
                              const cell = row.cells[key]
                              const best = isBest(rows, row, key)
                              return (
                                 <td
                                    key={key}
                                    className={cn(
                                       'px-3 py-2 text-right tabular-nums',
                                       best
                                          ? 'font-semibold text-emerald-400'
                                          : 'text-muted-foreground',
                                    )}
                                 >
                                    {fmt(cell.value)}
                                    {cell.std !== undefined && (
                                       <span className="ml-1 text-[11px] font-normal opacity-60">
                                          ±{fmt(cell.std)}
                                       </span>
                                    )}
                                 </td>
                              )
                           })}
                           {withCounts && (
                              <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                                 {row.counts
                                    ? `${row.counts.tp} / ${row.counts.fp} / ${row.counts.fn}`
                                    : '—'}
                              </td>
                           )}
                        </tr>
                     ))}
                  </tbody>
               )
            })}
         </table>
      </div>
   )
}

function Section({
   title,
   subtitle,
   children,
}: {
   title: string
   subtitle: string
   children: React.ReactNode
}) {
   return (
      <section className="space-y-3">
         <div>
            <h2 className="text-[15px] font-semibold">{title}</h2>
            <p className="text-[12.5px] leading-normal text-muted-foreground">
               {subtitle}
            </p>
         </div>
         {children}
      </section>
   )
}

type State =
   | { status: 'loading' }
   | { status: 'error'; message: string }
   | { status: 'ok'; data: MetricsResponse }

export function MetricsPage() {
   const [state, setState] = useState<State>({ status: 'loading' })

   useEffect(() => {
      const controller = new AbortController()
      fetchMetrics(controller.signal)
         .then((data) => setState({ status: 'ok', data }))
         .catch((error: unknown) => {
            if (controller.signal.aborted) return
            setState({
               status: 'error',
               message:
                  error instanceof Error
                     ? error.message
                     : 'Неизвестная ошибка.',
            })
         })
      return () => controller.abort()
   }, [])

   return (
      <main className="flex min-h-screen justify-center px-5 py-8">
         <Card className="h-fit w-full max-w-[1100px] rounded-2xl shadow-sm">
            <CardHeader className="border-b">
               <CardTitle className="text-[19px] font-bold tracking-tight">
                  Метрики моделей
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                     Model metrics
                  </span>
               </CardTitle>
               <CardDescription className="text-[13.5px] leading-normal">
                  Сравнение XGBoost и дерева решений для каждого типа отказа.
                  Accuracy не показываем: при ~3% отказов она не информативна.
               </CardDescription>
               <NavLink
                  to="/"
                  className="mt-1 inline-flex w-fit items-center gap-1.5 text-[12.5px] text-muted-foreground underline-offset-4 hover:underline"
               >
                  <ArrowLeft className="h-3.5 w-3.5" />К анализу оборудования
               </NavLink>
            </CardHeader>

            <CardContent className="space-y-8 pt-6">
               {state.status === 'loading' && (
                  <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                     <Loader2 className="h-4 w-4 animate-spin" />
                     Загрузка метрик...
                  </div>
               )}

               {state.status === 'error' && (
                  <ErrorResult message={state.message} />
               )}

               {state.status === 'ok' && (
                  <>
                     <Section
                        title="Кросс-валидация"
                        subtitle="Среднее ± разброс по 5 фолдам — самое надёжное сравнение. Зелёным отмечена модель, которая лучше с отрывом больше разброса; если отрыва нет, это ничья."
                     >
                        {state.data.cv.length > 0 ? (
                           <MetricsTable rows={state.data.cv.map(cvView)} />
                        ) : (
                           <p className="rounded-lg border px-4 py-3 text-[13px] text-muted-foreground">
                              Результатов кросс-валидации нет. Переобучите
                              модели: <code>uv run train</code>.
                           </p>
                        )}
                     </Section>

                     <Section
                        title="Отложенная выборка (20%)"
                        subtitle="Метрики тех моделей, которые используются в API. Зелёным отмечено лучшее значение (при равенстве — не отмечается)."
                     >
                        <MetricsTable
                           rows={state.data.holdout.map(holdoutView)}
                        />
                     </Section>

                     <details className="rounded-lg border px-4 py-3 text-[13px]">
                        <summary className="cursor-pointer font-medium">
                           Что означают метрики
                        </summary>
                        <dl className="mt-3 space-y-2.5">
                           {METRICS.map((m) => (
                              <div key={m.key}>
                                 <dt className="font-medium">{m.label}</dt>
                                 <dd className="text-muted-foreground">
                                    {m.hint}
                                 </dd>
                              </div>
                           ))}
                        </dl>
                        <p className="mt-3 text-muted-foreground">
                           Учтите: у износа инструмента (TWF) очень мало
                           положительных примеров, а часть отказов (случайные,
                           RNF) предсказать принципиально нельзя, поэтому у
                           общего отказа есть потолок по recall.
                        </p>
                     </details>
                  </>
               )}
            </CardContent>
         </Card>
      </main>
   )
}
