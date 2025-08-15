'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { ThemeSwitch } from '@/components/ui/theme-switch'
import { 
  BarChart3, 
  CreditCard, 
  DollarSign, 
  Home, 
  Tag,
  User,
  LogOut,
  Wallet
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Despesas', href: '/despesas', icon: CreditCard },
  { name: 'Rendas', href: '/rendas', icon: DollarSign },
  { name: 'Carteiras', href: '/wallets', icon: Wallet },
  { name: 'Categorias', href: '/categorias', icon: Tag },
  { name: 'Tags', href: '/tags', icon: BarChart3 },
  { name: 'Importar Extrato', href: '/importar-extrato', icon: CreditCard },
]

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  return (
    <div className="flex h-full w-64 flex-col bg-gray-900 dark:bg-slate-900 text-white">
      <div className="flex h-16 items-center justify-between border-b border-border px-4">
        <h1 className="text-xl font-bold">Controle Financeiro</h1>
        {/* Botão de fechar no mobile */}
        {onClose && (
          <button
            aria-label="Fechar menu"
            className="md:hidden p-2 rounded-md hover:bg-gray-800 focus:outline-none"
            onClick={onClose}
          >
            <span className="sr-only">Fechar menu</span>
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        )}
      </div>
      <nav className="flex-1 space-y-1 px-2 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors',
                isActive
                  ? 'bg-white text-gray-900 dark:bg-white dark:text-blue-900'
                  : 'text-white/80 hover:bg-white hover:text-gray-900 dark:hover:bg-white dark:hover:text-blue-900 dark:text-white/80'
              )}
              onClick={onClose}
            >
              <item.icon
                className={cn(
                  'mr-3 h-5 w-5 flex-shrink-0',
                  isActive ? 'text-gray-900 dark:text-blue-900' : 'text-white/80 group-hover:text-gray-900 group-hover:bg-white dark:text-white/80 dark:group-hover:text-blue-900 dark:group-hover:bg-white'
                )}
              />
              {item.name}
            </Link>
          )
        })}
      </nav>
      <div className="border-t border-border p-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <Link href="/user" className="flex items-center group cursor-pointer" onClick={onClose}>
              <div className="flex-shrink-0">
                {user?.image ? (
                  <img 
                    src={user.image} 
                    alt={user.name || 'User'} 
                    className="h-8 w-8 rounded-full"
                  />
                ) : (
                  <User className="h-8 w-8 text-white/80 dark:text-white/80 group-hover:text-blue-500" />
                )}
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium group-hover:text-blue-500">
                  {user?.name || 'Usuário'}
                </p>
                <p className="text-xs text-white/80 dark:text-white/80 group-hover:text-blue-400">
                  {user?.email || 'usuario@email.com'}
                </p>
              </div>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="text-white/80 hover:text-white dark:text-white/80 dark:hover:text-white"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
          <ThemeSwitch />
        </div>
      </div>
    </div>
  )
}
