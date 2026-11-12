import { useState, type FormEvent, type MouseEvent } from 'react'
import { Loader2, Shuffle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
   Card,
   CardContent,
   CardDescription,
   CardHeader,
   CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from '@/components/ui/select'
import { RiskResult } from '@/components/RiskResult'
import { cn } from '@/lib/utils'
import { randomSample } from '@/lib/samples'
import { ErrorResult } from './components/ui/Error'
import { MetricsPage } from './pages/MetricsPage'
import { NavLink } from './components/NavLink'
import { usePath } from './hooks/usePath'

import { FIELDS, MODEL_OPTIONS, QUALITY_OPTIONS } from './consts/const'
import { useAnalysis } from './hooks/useAnalysis'
import type { ModelKind, Values } from './types'
import { INITIAL_VALUES } from './consts/const'

const Hint = ({ children }: { children: string }) => (
   <p className="-mt-1 text-sm text-muted-foreground">{children}</p>
)

function AnalysisPage() {
   const [values, setValues] = useState<Values>(INITIAL_VALUES)
   const [model, setModel] = useState<ModelKind>('xgb')
   const { loading, result, resultRef, run } = useAnalysis()

   const highlighted = new Set(
      result?.kind === 'ok' ? result.data.highlighted_sensors : [],
   )

   const setValue = (name: string, value: string) =>
      setValues((prev) => ({ ...prev, [name]: value }))

   const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      run(values, model)
   }

   const handleModelChange = (value: string) => {
      const next = value as ModelKind
      setModel(next)
      if (result?.kind === 'ok') run(values, next)
   }

   const handleRandom = (event: MouseEvent<HTMLButtonElement>) => {
      event.currentTarget.blur()
      const sample = randomSample()
      setValues(sample)
      run(sample, model)
   }

   return (
      <main className="flex min-h-screen items-center justify-center px-2 py-3 sm:px-3">
         <Card className="w-full max-w-[1200px] rounded-2xl shadow-sm">
            <CardHeader className="border-b">
               <CardTitle className="text-3xl font-bold tracking-tight">
                  Анализ оборудования
                  <span className="ml-3 text-lg font-normal text-muted-foreground">
                     Equipment analysis
                  </span>
               </CardTitle>
               <CardDescription className="text-base leading-normal">
                  Заполните данные, полученные от датчика оборудования, чтобы
                  оценить вероятность отказа.
               </CardDescription>
               <NavLink
                  to="/metrics"
                  className="mt-1 w-fit text-base text-muted-foreground underline-offset-4 hover:underline"
               >
                  Метрики моделей →
               </NavLink>
            </CardHeader>

            <CardContent className="space-y-8 pt-8">
               <form onSubmit={handleSubmit} className="space-y-8">
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                     <div className="flex flex-col gap-2 sm:col-span-2">
                        <Label htmlFor="type" className="text-base">
                           Качество продукта
                        </Label>
                        <Hint>Product quality</Hint>
                        <Select
                           value={values.type}
                           onValueChange={(value) => setValue('type', value)}
                        >
                           <SelectTrigger
                              id="type"
                              className="h-12 w-full text-base data-[size=default]:h-12"
                           >
                              <SelectValue />
                           </SelectTrigger>
                           <SelectContent position="popper" sideOffset={4}>
                              {QUALITY_OPTIONS.map(({ value, label }) => (
                                 <SelectItem
                                    key={value}
                                    value={value}
                                    className="text-base"
                                 >
                                    {label}
                                 </SelectItem>
                              ))}
                           </SelectContent>
                        </Select>
                     </div>

                     <div className="flex flex-col gap-2 sm:col-span-2">
                        <Label htmlFor="model" className="text-base">
                           Модель прогноза
                        </Label>
                        <Hint>Prediction model</Hint>
                        <Select value={model} onValueChange={handleModelChange}>
                           <SelectTrigger
                              id="model"
                              className="h-12 w-full text-base data-[size=default]:h-12"
                           >
                              <SelectValue />
                           </SelectTrigger>
                           <SelectContent position="popper" sideOffset={4}>
                              {MODEL_OPTIONS.map(({ value, label }) => (
                                 <SelectItem
                                    key={value}
                                    value={value}
                                    className="text-base"
                                 >
                                    {label}
                                 </SelectItem>
                              ))}
                           </SelectContent>
                        </Select>
                     </div>

                     {FIELDS.map((field) => {
                        const isHot = highlighted.has(field.name)

                        return (
                           <div
                              key={field.name}
                              className={`flex flex-col gap-2 ${'full' in field ? 'sm:col-span-2' : ''}`}
                           >
                              <Label
                                 htmlFor={field.name}
                                 className={cn(
                                    'text-base',
                                    isHot && 'text-red-400',
                                 )}
                              >
                                 {field.label}{' '}
                                 <span className="text-sm font-medium text-muted-foreground">
                                    ({field.unit})
                                 </span>
                              </Label>
                              <Hint>{field.en}</Hint>
                              <Input
                                 id={field.name}
                                 name={field.name}
                                 type="number"
                                 step={field.step}
                                 required
                                 value={values[field.name]}
                                 aria-invalid={isHot || undefined}
                                 className={cn(
                                    'h-12 text-base md:text-base',
                                    isHot &&
                                       'border-red-500 ring-2 ring-red-500/30 focus-visible:ring-red-500/40',
                                 )}
                                 onChange={(event) =>
                                    setValue(field.name, event.target.value)
                                 }
                              />
                           </div>
                        )
                     })}
                  </div>

                  <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                     <Button
                        type="submit"
                        size="lg"
                        disabled={loading}
                        className="h-12 flex-1 text-base"
                     >
                        {loading && (
                           <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        )}
                        {loading
                           ? 'Расчёт...'
                           : 'Рассчитать вероятность отказа'}
                     </Button>

                     <Button
                        type="button"
                        variant="outline"
                        size="lg"
                        disabled={loading}
                        onClick={handleRandom}
                        className="h-12 shrink-0 text-base"
                     >
                        <Shuffle className="mr-2 h-5 w-5" />
                        Случайный пример
                     </Button>
                  </div>
               </form>

               <div ref={resultRef} className="scroll-mt-6">
                  {result?.kind === 'ok' && <RiskResult data={result.data} />}
                  {result?.kind === 'error' && (
                     <ErrorResult message={result.message} />
                  )}
               </div>
            </CardContent>
         </Card>
      </main>
   )
}

export default function App() {
   const path = usePath().replace(/\/+$/, '')
   return path === '/metrics' ? <MetricsPage /> : <AnalysisPage />
}
