export function ErrorResult({ message }: { message: string }) {
   return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center animate-in fade-in duration-300">
         <div className="mb-2 text-[13px] font-semibold text-muted-foreground">
            Ошибка <span className="font-normal opacity-70">Error</span>
         </div>
         <div className="text-sm font-medium leading-normal text-red-400">
            {message}
         </div>
      </div>
   )
}
