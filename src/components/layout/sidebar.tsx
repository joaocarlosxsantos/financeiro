
"use client";
import React, { useState } from 'react';
import Image from 'next/image';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { BarChart3, CreditCard, DollarSign, Tag, User, LogOut, Wallet, LucideLayoutDashboard, Table2Icon} from 'lucide-react';

const navigationFinanceiro = [
  { name: 'Dashboard', href: '/dashboard', icon: LucideLayoutDashboard },
  { name: 'Ganhos', href: '/rendas', icon: DollarSign },
  { name: 'Gastos', href: '/despesas', icon: CreditCard },
  { name: 'Carteiras', href: '/wallets', icon: Wallet },
  { name: 'Categorias', href: '/categorias', icon: BarChart3 },
  { name: 'Tags', href: '/tags', icon: Tag },
  { name: 'Relatórios', href: '/reports', icon: Table2Icon },
  { name: 'Metas', href: '/metas', icon: BarChart3 },
  { name: 'Importar Extrato', href: '/importar-extrato', icon: CreditCard },
];

const navigationAccounts = [
  { name: 'Dashboard', href: '/controle-contas', icon: LucideLayoutDashboard },
  { name: 'Contas', href: '/controle-contas/contas', icon: CreditCard },
  { name: 'Grupos', href: '/controle-contas/grupos', icon: BarChart3 },
];

type ModuleKey = 'financeiro' | 'accounts';

// Item de navegação com visual melhorado
interface NavEntry {
  name: string;
  href: string;
  icon: any;
}

const NavItem = ({ item, active, onClick }: { item: NavEntry; active: boolean; onClick?: () => void }) => {
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

// Small module selector dropdown
function ModuleSelector({ module, onSelect }: { module: ModuleKey; onSelect: (m: ModuleKey) => void }) {
  const [open, setOpen] = useState(false);
  const ref = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    function handleDoc(e: MouseEvent) {
      if (!ref.current) return;
      if (e.target instanceof Node && !ref.current.contains(e.target)) setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handleDoc);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleDoc);
      document.removeEventListener('keydown', handleKey);
    };
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 text-sm font-semibold tracking-wide select-none"
      >
        <span>{module === 'financeiro' ? 'Controle Financeiro' : 'Controle de Contas'}</span>
        <svg className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="none" stroke="currentColor">
          <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M6 8l4 4 4-4" />
        </svg>
      </button>
      {open && (
        <div role="menu" className="absolute left-0 mt-2 w-56 rounded-md bg-background border border-white/10 shadow-lg z-50">
          <button
            role="menuitem"
            className="w-full text-left px-3 py-2 text-sm hover:bg-white/5 flex items-center gap-2"
            onClick={() => { onSelect('financeiro'); setOpen(false); }}
          >
            <LucideLayoutDashboard className="h-4 w-4 text-white/70" />
            <span>Controle Financeiro</span>
          </button>
          <button
            role="menuitem"
            className="w-full text-left px-3 py-2 text-sm hover:bg-white/5 flex items-center gap-2"
            onClick={() => { onSelect('accounts'); setOpen(false); }}
          >
            <CreditCard className="h-4 w-4 text-white/70" />
            <span>Controle de Contas</span>
          </button>
        </div>
      )}
    </div>
  );
}

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  // initialize module: prefer localStorage, else derive from pathname
  const readStored = () => {
    try {
      const v = typeof window !== 'undefined' ? window.localStorage.getItem('activeModule') : null;
      if (v === 'accounts' || v === 'financeiro') return v as ModuleKey;
    } catch {
      /* noop */
    }
    return pathname?.startsWith('/controle-contas') ? 'accounts' : 'financeiro';
  };
  const [module, setModule] = useState<ModuleKey>(readStored);

  const currentNavigation = module === 'financeiro' ? navigationFinanceiro : navigationAccounts;

  // when module changes, redirect to the module dashboard
  const switchModule = (m: ModuleKey) => {
    if (m === module) return;
    setModule(m);
    try {
      if (typeof window !== 'undefined') window.localStorage.setItem('activeModule', m);
    } catch {}
  if (m === 'financeiro') router.push('/dashboard');
  else if (m === 'accounts') router.push('/controle-contas');
    if (onClose) onClose();
  };

  // sync module when pathname changes (e.g., user navigates via links)
  React.useEffect(() => {
    // If navigating to the user page, preserve the module stored in localStorage (origin of the click)
    if (pathname.startsWith('/user')) {
      try {
        const stored = typeof window !== 'undefined' ? window.localStorage.getItem('activeModule') : null;
        if (stored === 'accounts' || stored === 'financeiro') {
          if (module !== stored) setModule(stored as ModuleKey);
          return;
        }
      } catch {}
    }

    if (pathname.startsWith('/controle-contas') && module !== 'accounts') {
      setModule('accounts');
      try { if (typeof window !== 'undefined') window.localStorage.setItem('activeModule', 'accounts'); } catch {}
    } else if (!pathname.startsWith('/controle-contas') && module !== 'financeiro') {
      setModule('financeiro');
      try { if (typeof window !== 'undefined') window.localStorage.setItem('activeModule', 'financeiro'); } catch {}
    }
  }, [pathname, module]);

  return (
    <div className="flex h-full w-64 flex-col sidebar-bg text-white border-r border-white/10 backdrop-blur-sm">
      {/* Cabeçalho */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Image src="/financeiro.png" alt="Logo" width={24} height={24} className="h-6 w-6" />
          <div className="relative">
            <div data-tour="sidebar-module">
              <ModuleSelector
                module={module}
                onSelect={(m) => switchModule(m)}
              />
            </div>
          </div>
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
        {currentNavigation.map((item) => {
          // map href to a tour id-friendly key
          const mapHrefToTour = (href: string) => {
            switch (href) {
              case '/dashboard':
                return 'sidebar-dashboard';
              case '/rendas':
                return 'sidebar-incomes';
              case '/despesas':
                return 'sidebar-expenses';
              case '/wallets':
                return 'sidebar-wallets';
              case '/categorias':
                return 'sidebar-categories';
              case '/tags':
                return 'sidebar-tags';
              case '/reports':
                return 'sidebar-reports';
              case '/importar-extrato':
                return 'sidebar-import';
              default:
                return `sidebar-item-${href.replace(/[^a-zA-Z0-9]/g, '-')}`;
            }
          };
          const tourId = mapHrefToTour(item.href);
          return (
            <div key={item.href} data-tour={tourId}>
              <NavItem item={item} active={pathname === item.href} onClick={onClose} />
            </div>
          );
        })}
      </nav>

      {/* Usuário / Ações */}
      <div className="border-t border-white/10 p-4 mt-auto">
        <div className="flex items-center gap-3">
          <Link
            href="/user"
            onClick={() => {
              try {
                if (typeof window !== 'undefined') window.localStorage.setItem('activeModule', module);
              } catch {}
              if (onClose) onClose();
            }}
            className="group flex items-center gap-3 flex-1 min-w-0"
          >
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
