
"use client";
import React, { useState } from 'react';
import Image from 'next/image';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { NotificationCenter } from '@/components/notifications/notification-center';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { 
  BarChart3, CreditCard, DollarSign, Tag, User, LogOut, Wallet, 
  LucideLayoutDashboard, Table2Icon, Target, FileText, Settings,
  TrendingUp, TrendingDown, Upload, ChevronDown, ChevronRight,
  FolderOpen, Users, Bell, Menu, X
} from 'lucide-react';

// Estrutura hierárquica para o módulo financeiro
const navigationFinanceiro = {
  dashboard: {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LucideLayoutDashboard,
    standalone: true
  },
  financeiro: {
    name: 'Financeiro',
    icon: DollarSign,
    items: [
      { name: 'Ganhos', href: '/rendas', icon: TrendingUp },
      { name: 'Gastos', href: '/despesas', icon: TrendingDown },
      { name: 'Importar Extrato', href: '/importar-extrato', icon: Upload },
    ]
  },
  planejamento: {
    name: 'Planejamento',
    icon: Target,
    items: [
      { name: 'Metas', href: '/metas', icon: Target },
      { name: 'Relatórios', href: '/reports', icon: FileText },
    ]
  },
  configuracao: {
    name: 'Configuração',
    icon: Settings,
    items: [
      { name: 'Carteiras', href: '/wallets', icon: Wallet },
      { name: 'Categorias', href: '/categorias', icon: FolderOpen },
      { name: 'Tags', href: '/tags', icon: Tag },
      { name: 'Notificações', href: '/notifications/settings', icon: Bell },
    ]
  }
};

// Estrutura hierárquica para o módulo de contas
const navigationAccounts = {
  dashboard: {
    name: 'Dashboard',
    href: '/controle-contas',
    icon: LucideLayoutDashboard,
    standalone: true
  },
  gestao: {
    name: 'Gestão',
    icon: Users,
    items: [
      { name: 'Contas', href: '/controle-contas/contas', icon: CreditCard },
      { name: 'Grupos', href: '/controle-contas/grupos', icon: Users },
    ]
  }
};

type ModuleKey = 'financeiro' | 'accounts';

// Item de navegação com visual melhorado
interface NavEntry {
  name: string;
  href: string;
  icon: any;
}

// Seção da navegação hierárquica
interface NavSection {
  name: string;
  icon: any;
  items?: NavEntry[];
  standalone?: boolean;
  href?: string;
}

const NavItem = ({ item, active, onClick, isSubItem = false }: { item: NavEntry; active: boolean; onClick?: () => void; isSubItem?: boolean }) => {
  const isMobile = useIsMobile();
  
  return (
    <Link
      href={item.href}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'relative group flex items-center gap-3 rounded-xl text-sm font-medium outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary/60',
        // Mobile-optimized spacing and touch targets
        isMobile ? 'py-3 px-4 min-h-[48px]' : 'py-2',
        isSubItem && !isMobile ? 'px-4 ml-6' : !isSubItem ? 'px-3' : 'px-4 ml-4',
        active
          ? 'bg-gradient-to-r from-primary/90 to-primary text-primary-foreground shadow-md transform scale-[1.02]'
          : isSubItem 
            ? 'text-white/65 hover:text-white/90 hover:bg-white/8 hover:ml-7 hover:shadow-sm'
            : 'text-white/70 hover:text-white/90 hover:bg-white/5'
      )}
    >
      <span className={cn(
        'relative flex items-center justify-center rounded-md transition-all duration-200',
        // Mobile-optimized icon container
        isMobile ? (isSubItem ? 'h-7 w-7' : 'h-8 w-8') : (isSubItem ? 'h-6 w-6' : 'h-7 w-7'),
        active
          ? 'bg-white/20 ring-1 ring-white/30 scale-105'
          : 'bg-transparent group-hover:bg-white/10 group-hover:ring-1 group-hover:ring-white/20'
      )}>
        <item.icon className={cn(
          'transition-colors', 
          // Mobile-optimized icon size
          isMobile ? (isSubItem ? 'h-4 w-4' : 'h-5 w-5') : (isSubItem ? 'h-3.5 w-3.5' : 'h-4 w-4'), 
          active ? 'text-white' : 'text-white/70 group-hover:text-white'
        )} />
        {/* Glow sutil ativo */}
        {active && <span className="pointer-events-none absolute inset-0 rounded-md bg-primary/40 mix-blend-overlay blur-[6px]" aria-hidden="true" />}
      </span>
      <span className={cn(
        'truncate',
        // Larger font for mobile
        isMobile ? 'text-base font-medium' : ''
      )}>
        {item.name}
      </span>
    </Link>
  );
};

// Componente para seção expansível
const NavSection = ({ 
  section, 
  isExpanded, 
  onToggle, 
  pathname, 
  onItemClick 
}: { 
  section: NavSection; 
  isExpanded: boolean; 
  onToggle: () => void; 
  pathname: string;
  onItemClick?: () => void;
}) => {
  const isMobile = useIsMobile();
  
  // Se for standalone (como Dashboard), renderiza como item normal
  if (section.standalone) {
    return (
      <NavItem 
        item={section as NavEntry} 
        active={pathname === section.href} 
        onClick={onItemClick}
      />
    );
  }

  return (
    <div className="space-y-1">
      <button
        onClick={onToggle}
        className={cn(
          "w-full flex items-center gap-3 rounded-xl text-sm font-medium text-white/90 hover:text-white hover:bg-white/8 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 group",
          // Mobile: Larger touch target
          isMobile ? "px-4 py-3 min-h-[48px]" : "px-3 py-2"
        )}
      >
        <span className={cn(
          "flex items-center justify-center rounded-md bg-white/5 group-hover:bg-white/15 transition-colors duration-200",
          // Mobile: Larger icon container
          isMobile ? "h-8 w-8" : "h-7 w-7"
        )}>
          <section.icon className={cn(isMobile ? "h-5 w-5" : "h-4 w-4")} />
        </span>
        <span className={cn(
          "flex-1 truncate text-left font-semibold tracking-wide",
          // Mobile: Larger text
          isMobile ? "text-base" : ""
        )}>
          {section.name}
        </span>
        <span className="transition-transform duration-200 text-white/50 group-hover:text-white/70">
          {isExpanded ? (
            <ChevronDown className={cn(isMobile ? "h-5 w-5" : "h-4 w-4")} />
          ) : (
            <ChevronRight className={cn(isMobile ? "h-5 w-5" : "h-4 w-4")} />
          )}
        </span>
      </button>
      
      {/* Itens da seção com animação */}
      <div 
        className={cn(
          "overflow-hidden transition-all duration-300 ease-in-out",
          isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="space-y-1 pl-1 mt-1 relative">
          {/* Linha de conexão sutil */}
          <div className="absolute left-6 top-0 bottom-0 w-px bg-white/10" />
          {section.items?.map((item) => (
            <NavItem 
              key={item.href} 
              item={item} 
              active={pathname === item.href} 
              onClick={onItemClick}
              isSubItem
            />
          ))}
        </div>
      </div>
    </div>
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
        className="inline-flex items-center gap-2 text-sm font-semibold tracking-wide select-none text-white hover:text-white/80 transition-colors"
      >
        <span>{module === 'financeiro' ? 'Controle Financeiro' : 'Controle de Contas'}</span>
        <svg className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="none" stroke="currentColor">
          <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M6 8l4 4 4-4" />
        </svg>
      </button>
      {open && (
        <div role="menu" className="absolute left-0 mt-2 w-56 rounded-md bg-background border shadow-lg z-50">
          <button
            role="menuitem"
            className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground flex items-center gap-2 text-foreground transition-colors"
            onClick={() => { onSelect('financeiro'); setOpen(false); }}
          >
            <LucideLayoutDashboard className="h-4 w-4 text-muted-foreground" />
            <span>Controle Financeiro</span>
          </button>
          <button
            role="menuitem"
            className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground flex items-center gap-2 text-foreground transition-colors"
            onClick={() => { onSelect('accounts'); setOpen(false); }}
          >
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            <span>Controle de Contas</span>
          </button>
        </div>
      )}
    </div>
  );
}

// Função para detectar qual seção deve estar expandida baseado na página atual
const getSectionFromPathname = (pathname: string, navigation: Record<string, NavSection>): string | null => {
  for (const [sectionKey, section] of Object.entries(navigation)) {
    if (section.items && Array.isArray(section.items)) {
      const hasActiveItem = section.items.some((item) => pathname === item.href);
      if (hasActiveItem) {
        return sectionKey;
      }
    }
  }
  return null;
};

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const isMobile = useIsMobile();

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
  
  // Estado para controlar seções expandidas
  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(`sidebar-expanded-${module}`);
        if (stored) {
          return new Set(JSON.parse(stored));
        }
      } catch {
        // Ignorar erros de localStorage
      }
    }
    
    // Se não há estado salvo, detectar automaticamente qual seção expandir baseado na página atual
    const activeSection = getSectionFromPathname(pathname, currentNavigation);
    if (activeSection) {
      return new Set([activeSection]);
    }
    
    // Se não conseguir detectar, usar seções padrão baseado no módulo
    return new Set(module === 'financeiro' ? ['financeiro'] : ['gestao']);
  });
  
  // Salvar estado das seções no localStorage
  const saveExpandedState = React.useCallback((sections: Set<string>) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`sidebar-expanded-${module}`, JSON.stringify(Array.from(sections)));
      } catch {
        // Ignorar erros de localStorage
      }
    }
  }, [module]);
  
  // Toggle seção
  const toggleSection = (sectionKey: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionKey)) {
      newExpanded.delete(sectionKey);
    } else {
      newExpanded.add(sectionKey);
    }
    setExpandedSections(newExpanded);
    saveExpandedState(newExpanded);
  };

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

  // Atualizar seções expandidas quando a página mudar
  React.useEffect(() => {
    const activeSection = getSectionFromPathname(pathname, currentNavigation);
    if (activeSection && !expandedSections.has(activeSection)) {
      const newExpanded = new Set(expandedSections);
      newExpanded.add(activeSection);
      setExpandedSections(newExpanded);
      saveExpandedState(newExpanded);
    }
  }, [pathname, currentNavigation, expandedSections, saveExpandedState]);

  return (
    <div className={cn(
      "flex h-full flex-col sidebar-bg text-white border-r border-white/10 backdrop-blur-sm",
      // Mobile: Full width, Desktop: Fixed width
      isMobile ? "w-full" : "w-72"
    )}>
      {/* Cabeçalho */}
      <div className={cn(
        "flex items-center justify-between border-b border-white/10",
        // Mobile: Larger header, Desktop: Standard size
        isMobile ? "h-20 px-6" : "h-16 px-4"
      )}>
        <div className="flex items-center gap-3">
          <Image 
            src="/financeiro.png" 
            alt="Logo" 
            width={isMobile ? 28 : 24} 
            height={isMobile ? 28 : 24} 
            className={cn(isMobile ? "h-7 w-7" : "h-6 w-6")} 
          />
          <div className="relative">
            <div data-tour="sidebar-module">
              <ModuleSelector
                module={module}
                onSelect={(m) => switchModule(m)}
              />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <NotificationCenter className="text-white hover:text-white/80" />
          {onClose && (
            <button
              aria-label="Fechar menu"
              className={cn(
                "rounded-md hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors",
                // Mobile: Larger touch target
                isMobile ? "p-3" : "p-2 md:hidden"
              )}
              onClick={onClose}
            >
              <span className="sr-only">Fechar menu</span>
              <X className={cn(isMobile ? "h-6 w-6" : "h-5 w-5")} />
            </button>
          )}
        </div>
      </div>

      {/* Navegação */}
      <nav className={cn(
        "flex-1 overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent",
        // Mobile: More padding for easier touch navigation
        isMobile ? "px-4 py-6" : "px-3 py-4"
      )}>
        {Object.entries(currentNavigation).map(([sectionKey, section]) => {
          // Adiciona atributos data-tour para o tour guiado
          let tourAttr = {};
          if ('href' in section && section.href === '/dashboard') tourAttr = { 'data-tour': 'sidebar-dashboard' };
          else if (sectionKey === 'financeiro') tourAttr = { 'data-tour': 'sidebar-incomes' };
          
          return (
            <div key={sectionKey} {...tourAttr}>
              <NavSection
                section={section}
                isExpanded={expandedSections.has(sectionKey)}
                onToggle={() => toggleSection(sectionKey)}
                pathname={pathname}
                onItemClick={onClose}
              />
            </div>
          );
        })}
      </nav>

      {/* Usuário / Ações */}
      <div className={cn(
        "border-t border-white/10 mt-auto",
        // Mobile: More padding and larger touch targets
        isMobile ? "p-6" : "p-4"
      )}>
        <div className="flex items-center gap-3">
          <Link
            href="/user"
            onClick={() => {
              try {
                if (typeof window !== 'undefined') window.localStorage.setItem('activeModule', module);
              } catch {}
              if (onClose) onClose();
            }}
            className={cn(
              "group flex items-center gap-3 flex-1 min-w-0 rounded-xl transition-colors",
              // Mobile: Add padding for better touch target
              isMobile ? "p-2 hover:bg-white/5" : ""
            )}
          >
            <div className="relative">
              {user?.image ? (
                <Image
                  src={user.image}
                  alt={user.name || 'User'}
                  width={isMobile ? 48 : 40}
                  height={isMobile ? 48 : 40}
                  className={cn(
                    "rounded-xl object-cover ring-2 ring-white/20 group-hover:ring-primary/50 transition",
                    isMobile ? "h-12 w-12" : "h-10 w-10"
                  )}
                />
              ) : (
                <div className={cn(
                  "rounded-xl bg-white/10 flex items-center justify-center ring-2 ring-white/10 group-hover:ring-primary/50 transition",
                  isMobile ? "h-12 w-12" : "h-10 w-10"
                )}>
                  <User className={cn(isMobile ? "h-6 w-6" : "h-5 w-5", "text-white/70")} />
                </div>
              )}
              <span className={cn(
                "absolute -bottom-1 -right-1 rounded-full bg-emerald-500 ring-2 ring-slate-900 animate-pulse",
                isMobile ? "h-5 w-5" : "h-4 w-4"
              )} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className={cn(
                "font-medium truncate group-hover:text-white",
                isMobile ? "text-base" : "text-sm"
              )}>{user?.name || 'Usuário'}</p>
              <p className={cn(
                "text-white/60 truncate",
                isMobile ? "text-sm" : "text-[11px]"
              )}>{user?.email || 'usuario@email.com'}</p>
            </div>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={logout}
            className={cn(
              "rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition",
              // Mobile: Larger touch target
              isMobile ? "h-12 w-12" : "h-10 w-10"
            )}
            aria-label="Sair"
          >
            <LogOut className={cn(isMobile ? "h-6 w-6" : "h-5 w-5")} />
          </Button>
        </div>
      </div>
    </div>
  );
}
