
"use client";
import Image from 'next/image';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { BarChart3, CreditCard, DollarSign, Home, Tag, User, LogOut, Wallet } from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Entradas', href: '/rendas', icon: DollarSign },
  { name: 'Saídas', href: '/despesas', icon: CreditCard },
  { name: 'Carteiras', href: '/wallets', icon: Wallet },
  { name: 'Categorias', href: '/categorias', icon: Tag },
  { name: 'Tags', href: '/tags', icon: BarChart3 },
  { name: 'Importar Extrato', href: '/importar-extrato', icon: CreditCard },
];

// Item de navegação com visual melhorado
const NavItem = ({ item, active, onClick }: { item: typeof navigation[number]; active: boolean; onClick?: () => void }) => {
  return (
    <Link
      href={item.href}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'relative group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/60',
        active
          ? 'bg-gradient-to-r from-primary/90 to-primary text-primary-foreground shadow'
          : 'text-white/70 hover:text-white/90 hover:bg-white/5'
      )}
    >
      <span className={cn(
        'relative flex h-7 w-7 items-center justify-center rounded-md transition-all duration-200',
        active
          ? 'bg-white/20 ring-1 ring-white/30 scale-105'
          : 'bg-transparent group-hover:bg-white/10 group-hover:ring-1 group-hover:ring-white/20'
      )}>
        <item.icon className={cn('h-4 w-4 transition-colors', active ? 'text-white' : 'text-white/70 group-hover:text-white')} />
        {/* Glow sutil ativo */}
        {active && <span className="pointer-events-none absolute inset-0 rounded-md bg-primary/40 mix-blend-overlay blur-[6px]" aria-hidden="true" />}
      </span>
      <span className="truncate">{item.name}</span>
  {/* Indicador lateral removido conforme solicitação */}
    </Link>
  );
};

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <div className="flex h-full w-64 flex-col bg-[radial-gradient(circle_at_30%_20%,#1e293b_0%,#0f172a_60%)] dark:bg-[radial-gradient(circle_at_30%_20%,#0f172a_0%,#020617_65%)] text-white border-r border-white/10 backdrop-blur-sm">
      {/* Cabeçalho */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Image src="/financeiro.png" alt="Logo" width={24} height={24} className="h-6 w-6" />
          <h1 className="text-base font-semibold tracking-wide select-none">Controle Financeiro</h1>
        </div>
        {onClose && (
          <button
            aria-label="Fechar menu"
            className="md:hidden p-2 rounded-md hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            onClick={onClose}
          >
            <span className="sr-only">Fechar menu</span>
            <svg width="22" height="22" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Navegação */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        {navigation.map(item => (
          <NavItem key={item.href} item={item} active={pathname === item.href} onClick={onClose} />
        ))}
      </nav>

      {/* Usuário / Ações */}
      <div className="border-t border-white/10 p-4 mt-auto">
        <div className="flex items-center gap-3">
          <Link href="/user" onClick={onClose} className="group flex items-center gap-3 flex-1 min-w-0">
            <div className="relative">
              {user?.image ? (
                <Image
                  src={user.image}
                  alt={user.name || 'User'}
                  width={40}
                  height={40}
                  className="h-10 w-10 rounded-xl object-cover ring-2 ring-white/20 group-hover:ring-primary/50 transition"
                />
              ) : (
                <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center ring-2 ring-white/10 group-hover:ring-primary/50 transition">
                  <User className="h-5 w-5 text-white/70" />
                </div>
              )}
              <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-emerald-500 ring-2 ring-slate-900 animate-pulse" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate group-hover:text-white">{user?.name || 'Usuário'}</p>
              <p className="text-[11px] text-white/60 truncate">{user?.email || 'usuario@email.com'}</p>
            </div>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={logout}
            className="rounded-lg h-10 w-10 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition"
            aria-label="Sair"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
