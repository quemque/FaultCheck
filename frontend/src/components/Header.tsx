import { NavLink } from 'react-router'
import { cn } from '@/lib/utils'
import { LINKS } from '../consts/links'

export function Header() {
   return (
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
         <div className="mx-auto flex min-h-14 max-w-[1200px] flex-wrap items-center justify-center gap-x-6 gap-y-1 px-3 py-2">
            <nav className="flex items-center gap-6">
               {LINKS.map(({ to, label, end }) => (
                  <NavLink
                     key={to}
                     to={to}
                     end={end}
                     className={({ isActive }) =>
                        cn(
                           'text-base font-medium transition-colors',
                           isActive
                              ? 'text-foreground'
                              : 'text-muted-foreground hover:text-foreground',
                        )
                     }
                  >
                     {label}
                  </NavLink>
               ))}
            </nav>
         </div>
      </header>
   )
}
