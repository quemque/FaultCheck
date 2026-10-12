import { useState, useRef, type FormEvent, type MouseEvent } from 'react'
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
import { ErrorResult, RiskResult } from '@/components/RiskResult'
import { analyze } from '@/lib/api'
import { randomSample } from './lib/samples'

const FIELDS = [
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

const INITIAL: Record<string, string> = {
   type: '0',
   air_temperature_k: '298.1',
   process_temperature_k: '308.6',
   rotational_speed_rpm: '1551',
   torque_nm: '42.8',
   tool_wear_min: '0',
}

type Result =
   | { kind: 'ok'; probability: number }
   | { kind: 'error'; message: string }
   | null

const En = ({ children }: { children: string }) => (
   <p className="-mt-1 text-xs text-muted-foreground">{children}</p>
)

export default function App() {
   const [values, setValues] = useState(INITIAL)
   const [loading, setLoading] = useState(false)
   const [result, setResult] = useState<Result>(null)

   // Реф на блок с результатом, чтобы скроллить к нему, а не наверх
   const resultRef = useRef<HTMLDivElement>(null)

   const set = (name: string, value: string) =>
      setValues((v) => ({ ...v, [name]: value }))

   async function run(v: Record<string, string>) {
      setLoading(true)
      // ВАЖНО: не вызываем setResult(null), чтобы блок не схлопывался
      // и страница не подпрыгивала вверх из-за изменения высоты
      try {
         const probability = await analyze(v)
         setResult({ kind: 'ok', probability })

         // Мягко показываем результат в зоне видимости, если он ниже экрана
         setTimeout(() => {
            resultRef.current?.scrollIntoView({
               behavior: 'smooth',
               block: 'nearest',
            })
         }, 50)
      } catch (err) {
         setResult({
            kind: 'error',
            message: err instanceof Error ? err.message : 'Неизвестная ошибка.',
         })
      } finally {
         setLoading(false)
      }
   }

   function onSubmit(e: FormEvent) {
      e.preventDefault()
      run(values)
   }

   function onRandom(e: MouseEvent<HTMLButtonElement>) {
      e.preventDefault() // предотвращаем скачок фокуса браузера

      // Снимаем фокус с текущих элементов, чтобы браузер не пытался проскроллить к ним
      if (document.activeElement instanceof HTMLElement) {
         document.activeElement.blur()
      }

      const sample = randomSample()
      setValues(sample)
      run(sample)
   }

   return (
      <main className="flex min-h-screen items-center justify-center px-5 py-8">
         <Card className="w-full max-w-[620px] rounded-2xl shadow-sm">
            <CardHeader className="border-b">
               <CardTitle className="text-[19px] font-bold tracking-tight">
                  Анализ оборудования
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                     Equipment analysis
                  </span>
               </CardTitle>
               <CardDescription className="text-[13.5px] leading-normal">
                  Заполните данные, полученные от датчика оборудования, чтобы
                  оценить вероятность отказа.
               </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6 pt-6">
               <form onSubmit={onSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2">
                     <div className="flex flex-col gap-2 sm:col-span-2">
                        <Label htmlFor="type">Качество продукта</Label>
                        <En>Product quality</En>
                        <Select
                           value={values.type}
                           onValueChange={(v) => set('type', v)}
                        >
                           <SelectTrigger id="type" className="w-full">
                              <SelectValue />
                           </SelectTrigger>
                           <SelectContent position="popper" sideOffset={4}>
                              <SelectItem value="0">
                                 L — низкое / low
                              </SelectItem>
                              <SelectItem value="1">
                                 M — среднее / medium
                              </SelectItem>
                              <SelectItem value="2">
                                 H — высокое / high
                              </SelectItem>
                           </SelectContent>
                        </Select>
                     </div>

                     {FIELDS.map((f) => (
                        <div
                           key={f.name}
                           className={`flex flex-col gap-2 ${'full' in f ? 'sm:col-span-2' : ''}`}
                        >
                           <Label htmlFor={f.name}>
                              {f.label}{' '}
                              <span className="text-[11.5px] font-medium text-muted-foreground">
                                 ({f.unit})
                              </span>
                           </Label>
                           <En>{f.en}</En>
                           <Input
                              id={f.name}
                              name={f.name}
                              type="number"
                              step={f.step}
                              required
                              value={values[f.name]}
                              onChange={(e) => set(f.name, e.target.value)}
                           />
                        </div>
                     ))}
                  </div>

                  <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                     <Button
                        type="submit"
                        size="lg"
                        disabled={loading}
                        className="flex-1"
                     >
                        {loading && (
                           <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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
                        onClick={onRandom}
                        className="shrink-0"
                     >
                        <Shuffle className="mr-2 h-4 w-4" />
                        Случайный пример
                     </Button>
                  </div>
               </form>

               {/* Контейнер результата с ref для удержания позиции */}
               <div ref={resultRef} className="scroll-mt-6">
                  {result?.kind === 'ok' && (
                     <RiskResult probability={result.probability} />
                  )}
                  {result?.kind === 'error' && (
                     <ErrorResult message={result.message} />
                  )}
               </div>
            </CardContent>
         </Card>
      </main>
   )
}
