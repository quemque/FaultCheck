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
import { randomSample } from '@/lib/samples'
import { ErrorResult } from './components/ui/Error'

import { FIELDS, QUALITY_OPTIONS } from './consts/const'
import { useAnalysis } from './hooks/useAnalysis'
import type { Values } from './types'
import { INITIAL_VALUES } from './consts/const'

const Hint = ({ children }: { children: string }) => (
   <p className="-mt-1 text-xs text-muted-foreground">{children}</p>
)

export default function App() {
   const [values, setValues] = useState<Values>(INITIAL_VALUES)
   const { loading, result, resultRef, run } = useAnalysis()

   const setValue = (name: string, value: string) =>
      setValues((prev) => ({ ...prev, [name]: value }))

   const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      run(values)
   }

   const handleRandom = (event: MouseEvent<HTMLButtonElement>) => {
      event.currentTarget.blur()
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
               <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2">
                     <div className="flex flex-col gap-2 sm:col-span-2">
                        <Label htmlFor="type">Качество продукта</Label>
                        <Hint>Product quality</Hint>
                        <Select
                           value={values.type}
                           onValueChange={(value) => setValue('type', value)}
                        >
                           <SelectTrigger id="type" className="w-full">
                              <SelectValue />
                           </SelectTrigger>
                           <SelectContent position="popper" sideOffset={4}>
                              {QUALITY_OPTIONS.map(({ value, label }) => (
                                 <SelectItem key={value} value={value}>
                                    {label}
                                 </SelectItem>
                              ))}
                           </SelectContent>
                        </Select>
                     </div>

                     {FIELDS.map((field) => (
                        <div
                           key={field.name}
                           className={`flex flex-col gap-2 ${'full' in field ? 'sm:col-span-2' : ''}`}
                        >
                           <Label htmlFor={field.name}>
                              {field.label}{' '}
                              <span className="text-[11.5px] font-medium text-muted-foreground">
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
                              onChange={(event) =>
                                 setValue(field.name, event.target.value)
                              }
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
                        onClick={handleRandom}
                        className="shrink-0"
                     >
                        <Shuffle className="mr-2 h-4 w-4" />
                        Случайный пример
                     </Button>
                  </div>
               </form>

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
