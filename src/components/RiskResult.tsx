import { cn } from '@/lib/utils'
import { getRisk } from '@/lib/risk'
import { FIELDS, MODES } from '@/consts/const'
import type { AnalysisResponse } from '@/types'

const sensorLabel = (name: string) =>
   FIELDS.find((field) => field.name === name)?.label ?? name

const source = (predicted: boolean, rule: boolean) =>
   predicted && rule ? 'модель и правило' : rule ? 'по правилу' : 'по модели'

export function RiskResult({ data }: { data: AnalysisResponse }) {
   const percent = data.failure_probability * 100
   const { index, level } = getRisk(percent, data.is_failure)

   const modes = MODES.map((mode) => ({
      ...mode,
      ...data.modes[mode.key],
   })).sort(
      (a, b) =>
         Number(b.active) - Number(a.active) || b.probability - a.probability,
   )

   return (
      <div
         className={cn(
            'rounded-xl border p-6 text-center animate-in fade-in slide-in-from-bottom-1 duration-300',
            level.box,
            level.text,
         )}
      >
         <div className="mb-2 text-[13px] font-semibold text-muted-foreground">
            Вероятность отказа
            <span className="ml-1.5 font-normal opacity-70">
               Failure probability
            </span>
         </div>
         <div className="mb-2 text-[44px] font-bold leading-none tracking-tighter max-sm:text-4xl">
            {percent.toFixed(1)}%
         </div>
         <div className="text-[13px] leading-normal text-muted-foreground">
            {level.hint}
         </div>

         <div className="mt-[18px] flex gap-1 overflow-hidden rounded-md">
            {[0, 1, 2, 3].map((i) => (
               <div
                  key={i}
                  className={cn(
                     'h-1.5 flex-1 transition-colors duration-300',
                     i === index ? 'bg-current' : 'bg-muted',
                  )}
               />
            ))}
         </div>
         <div className="mt-2.5 flex justify-between text-[10.5px] font-medium text-muted-foreground">
            {['0%', '25%', '50%', '75%', '100%'].map((t) => (
               <span key={t}>{t}</span>
            ))}
         </div>

         <div className="mt-5 border-t border-border pt-4 text-left text-foreground">
            <div className="mb-3 text-[12px] font-semibold text-muted-foreground">
               Типы отказов
               <span className="ml-1.5 font-normal opacity-70">
                  Failure modes
               </span>
            </div>

            {data.unexplained && (
               <p className="mb-3 rounded-md bg-muted/50 px-3 py-2 text-[12.5px] leading-normal text-muted-foreground">
                  Модель прогнозирует отказ, но конкретную причину определить не
                  удалось — вероятно, это случайный сбой.
               </p>
            )}

            <ul className="space-y-3">
               {modes.map((mode) => (
                  <li key={mode.key}>
                     <div className="flex items-baseline justify-between gap-3">
                        <span
                           className={cn(
                              'text-[13.5px] font-medium',
                              mode.active
                                 ? 'text-red-400'
                                 : 'text-muted-foreground',
                           )}
                        >
                           {mode.label}
                           <span className="ml-1.5 text-[11px] font-normal opacity-70">
                              {mode.en}
                           </span>
                        </span>
                        <span className="text-[12.5px] tabular-nums text-muted-foreground">
                           {(mode.probability * 100).toFixed(1)}%
                        </span>
                     </div>

                     <div className="mt-1 h-1 overflow-hidden rounded bg-muted">
                        <div
                           className={cn(
                              'h-full transition-all duration-300',
                              mode.active
                                 ? 'bg-red-400'
                                 : 'bg-muted-foreground/40',
                           )}
                           style={{
                              width: `${Math.min(100, mode.probability * 100)}%`,
                           }}
                        />
                     </div>

                     {mode.active && (
                        <div className="mt-1.5 space-y-1.5">
                           <p className="text-[11.5px] leading-normal text-muted-foreground">
                              {mode.hint}{' '}
                              <span className="opacity-70">
                                 ({source(mode.predicted, mode.rule_triggered)})
                              </span>
                           </p>
                           <div className="flex flex-wrap gap-1.5">
                              {mode.sensors.map((sensor) => (
                                 <span
                                    key={sensor}
                                    className="rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[11px] text-red-400"
                                 >
                                    {sensorLabel(sensor)}
                                 </span>
                              ))}
                           </div>
                        </div>
                     )}
                  </li>
               ))}
            </ul>
         </div>
      </div>
   )
}
