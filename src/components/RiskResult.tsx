import { cn } from '@/lib/utils'
import { getRisk } from '@/lib/risk'

export function RiskResult({ probability }: { probability: number }) {
   const percent = probability * 100
   const { index, level } = getRisk(percent)

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
      </div>
   )
}
