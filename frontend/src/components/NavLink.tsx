import type { MouseEvent, ReactNode } from 'react'

import { navigate } from '@/hooks/usePath'

type Props = { to: string; className?: string; children: ReactNode }

export function NavLink({ to, className, children }: Props) {
   const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
      if (
         event.metaKey ||
         event.ctrlKey ||
         event.shiftKey ||
         event.button !== 0
      )
         return
      event.preventDefault()
      navigate(to)
   }

   return (
      <a href={to} onClick={onClick} className={className}>
         {children}
      </a>
   )
}
