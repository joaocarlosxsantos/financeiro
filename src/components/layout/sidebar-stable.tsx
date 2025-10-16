'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { NotificationCenter } from '@/components/notifications/notification-center';
import { 
  BarChart3, CreditCard, DollarSign, Tag, User, LogOut, Wallet, 
  LucideLayoutDashboard, Table2Icon, Target, FileText, Settings,
  TrendingUp, TrendingDown, Upload, ChevronRight, ArrowUpDown,
  FolderOpen, Users, Bell, Menu, X, PieChart, Activity
} from 'lucide-react';
import './sidebar-stable.css';

// Componente para ícone de expansão - sem estado para evitar re-renders
const ExpandIcon = React.memo(({ isExpanded }: { isExpanded: boolean }) => (
  <ChevronRight 
    className={cn(
      "h-4 w-4",
      isExpanded && "rotate-90"
    )} 
  />
));
ExpandIcon.displayName = 'ExpandIcon';

// Componente para conteúdo expansível - sem animações
const ExpandedContent = React.memo(({ 
  isExpanded, 
  children 
}: { 
  isExpanded: boolean; 
  children: React.ReactNode;
}) => (
  <div className={cn("overflow-hidden", isExpanded ? "block" : "hidden")}>
    {children}
  </div>
));
ExpandedContent.displayName = 'ExpandedContent';

// Estrutura de navegação
const navigationFinanceiro = {
  visaoGeral: {
    name: 'Visão Geral',
    icon: PieChart,
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LucideLayoutDashboard },
      { name: 'Relatórios', href: '/reports', icon: BarChart3 },
      { name: 'Relatório Inteligente', href: '/smart-report', icon: Activity },
    ]
  },
  movimentacoes: {
    name: 'Movimentações',
    icon: Activity,
    items: [
      { name: 'Transações', href: '/transacoes', icon: ArrowUpDown },
      { name: 'Cartão de Crédito', href: '/credit-management', icon: CreditCard },
      { name: 'Importar Extrato', href: '/importar-extrato', icon: Upload },
    ]
  },
  planejamento: {
    name: 'Planejamento',
    icon: Target,
    items: [
      { name: 'Metas Financeiras', href: '/metas', icon: Target },
    ]
  },
  contasCartoes: {
    name: 'Contas & Cartões',
    icon: Wallet,
    items: [
      { name: 'Carteiras', href: '/wallets', icon: Wallet },
      { name: 'Cartões de Crédito', href: '/credit-cards', icon: CreditCard },
    ]
  },
  organizacao: {
    name: 'Organização',
    icon: FolderOpen,
    items: [
      { name: 'Categorias', href: '/categorias', icon: FolderOpen },
      { name: 'Tags', href: '/tags', icon: Tag },
    ]
  },
  sistema: {
    name: 'Sistema',
    icon: Settings,
    items: [
      { name: 'Notificações', href: '/notifications/settings', icon: Bell },
    ]
  }
};

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

interface NavEntry {
  name: string;
  href: string;
  icon: any;
}

interface NavSection {
  name: string;
  icon: any;
  items?: NavEntry[];
  standalone?: boolean;
  href?: string;
}

// NavItem sem mobile detection
const NavItem = React.memo(({ item, active, onClick, isSubItem = false }: { 
  item: NavEntry; 
  active: boolean; 
  onClick?: () => void; 
  isSubItem?: boolean 
}) => {
  const getDataTour = React.useCallback((href: string) => {
    const tourMap: Record<string, string> = {
      '/dashboard': 'sidebar-dashboard',
      '/transacoes': 'sidebar-transactions',
      '/rendas': 'sidebar-incomes',
      '/despesas': 'sidebar-expenses',
      '/credit-management': 'sidebar-credit-management',
      '/wallets': 'sidebar-wallets',
      '/credit-cards': 'sidebar-credit-cards',
      '/categorias': 'sidebar-categories',
      '/tags': 'sidebar-tags',
      '/reports': 'sidebar-reports',
      '/importar-extrato': 'sidebar-import',
      '/metas': 'sidebar-goals',
      '/notifications/settings': 'sidebar-notifications'
    };
    return tourMap[href] || '';
  }, []);

  return (
    <Link
      href={item.href}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      data-tour={getDataTour(item.href)}
      className={cn(
        'relative group flex items-center gap-3 rounded-xl text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-primary/60',
        'sidebar-desktop-layout', // CSS responsivo
        isSubItem ? 'px-4 ml-6' : 'px-3',
        active
          ? 'bg-gradient-to-r from-primary/90 to-primary text-primary-foreground shadow-md transform scale-[1.02]'
          : isSubItem 
            ? 'text-white/65 hover:text-white/90 hover:bg-white/8'
            : 'text-white/70 hover:text-white/90 hover:bg-white/5'
      )}
    >
      <span className={cn(
        'relative flex items-center justify-center rounded-md',
        'h-7 w-7', // Tamanho fixo
        active
          ? 'bg-white/20 ring-1 ring-white/30 scale-105'
          : 'group-hover:bg-white/10'
      )}>
        <item.icon className="h-4 w-4" />
      </span>
      <span className="truncate">
        {item.name}
      </span>
    </Link>
  );
});
NavItem.displayName = 'NavItem';

// NavSection sem mobile detection
const NavSection = React.memo(({ 
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
          "w-full flex items-center gap-3 rounded-xl text-sm font-medium text-white/90 hover:text-white hover:bg-white/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 group",
          "px-3 py-2" // Tamanho fixo
        )}
      >
        <span className="flex items-center justify-center rounded-md bg-white/5 group-hover:bg-white/15 h-7 w-7">
          <section.icon className="h-4 w-4" />
        </span>
        <span className="flex-1 truncate text-left font-semibold tracking-wide">
          {section.name}
        </span>
        <span className="text-white/50 group-hover:text-white/70">
          <ExpandIcon isExpanded={isExpanded} />
        </span>
      </button>
      
      <ExpandedContent isExpanded={isExpanded}>
        <div className="space-y-1 pl-1 mt-1 relative">
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
      </ExpandedContent>
    </div>
  );
});
NavSection.displayName = 'NavSection';

const NavigationItem = React.memo(({ 
  sectionKey, 
  section, 
  isExpanded, 
  toggleSection, 
  pathname, 
  onItemClick 
}: {
  sectionKey: string;
  section: NavSection;
  isExpanded: boolean;
  toggleSection: (key: string) => void;
  pathname: string;
  onItemClick?: () => void;
}) => {
  const handleToggle = React.useCallback(() => {
    toggleSection(sectionKey);
  }, [toggleSection, sectionKey]);

  let tourAttr = {};
  if ('href' in section && section.href === '/dashboard') tourAttr = { 'data-tour': 'sidebar-dashboard' };
  else if (sectionKey === 'financeiro') tourAttr = { 'data-tour': 'sidebar-incomes' };

  return (
    <div {...tourAttr}>
      <NavSection
        section={section}
        isExpanded={isExpanded}
        onToggle={handleToggle}
        pathname={pathname}
        onItemClick={onItemClick}
      />
    </div>
  );
});
NavigationItem.displayName = 'NavigationItem';

function getSectionFromPathname(pathname: string, navigation: Record<string, NavSection>): string | null {
  for (const [sectionKey, section] of Object.entries(navigation)) {
    if (section.standalone && section.href === pathname) {
      return sectionKey;
    }
    if (section.items?.some(item => item.href === pathname)) {
      return sectionKey;
    }
  }
  return null;
}

export const SidebarStable = React.memo(({ onClose }: { onClose?: () => void }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, user } = useAuth();

  // Module state sem localStorage para evitar hydration issues
  const [module, setModule] = useState<ModuleKey>('financeiro');

  const currentNavigation = React.useMemo(
    () => module === 'financeiro' ? navigationFinanceiro : navigationAccounts,
    [module]
  );
  
  // Estado para controlar seções expandidas - simplificado
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  
  const toggleSection = React.useCallback((sectionKey: string) => {
    setExpandedSections(current => {
      const newExpanded = new Set(current);
      if (newExpanded.has(sectionKey)) {
        newExpanded.delete(sectionKey);
      } else {
        newExpanded.add(sectionKey);
      }
      return newExpanded;
    });
  }, []);

  const switchModule = React.useCallback((m: ModuleKey) => {
    if (m === module) return;
    setModule(m);
    if (m === 'financeiro') router.push('/dashboard');
    else if (m === 'accounts') router.push('/controle-contas');
    if (onClose) onClose();
  }, [module, router, onClose]);

  // Auto-expand active section sem localStorage
  React.useEffect(() => {
    const activeSection = getSectionFromPathname(pathname, currentNavigation);
    if (activeSection) {
      setExpandedSections(current => {
        if (!current.has(activeSection)) {
          const newExpanded = new Set(current);
          newExpanded.add(activeSection);
          return newExpanded;
        }
        return current;
      });
    }
  }, [pathname, currentNavigation]);

  // Sync module baseado na URL
  React.useEffect(() => {
    const shouldBeAccounts = pathname.startsWith('/controle-contas');
    if (shouldBeAccounts && module !== 'accounts') {
      setModule('accounts');
    } else if (!shouldBeAccounts && module !== 'financeiro') {
      setModule('financeiro');
    }
  }, [pathname, module]);

  return (
    <div className="sidebar-stable-layout flex flex-col sidebar-bg text-white border-r border-white/10 backdrop-blur-sm sidebar-no-transitions">
      {/* Cabeçalho fixo */}
      <div className="flex items-center justify-between border-b border-white/10 h-16 px-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <DollarSign className="h-5 w-5 text-primary" />
          </div>
          <span className="font-bold text-lg truncate">Financeiro</span>
        </div>
        {onClose && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-white/70 hover:text-white hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Module Selector */}
      <div className="p-4 border-b border-white/10">
        <div className="flex rounded-lg bg-white/5 p-1">
          <button
            onClick={() => switchModule('financeiro')}
            className={cn(
              "flex-1 text-sm font-medium px-3 py-2 rounded-md",
              module === 'financeiro' 
                ? 'bg-primary text-primary-foreground shadow-sm' 
                : 'text-white/70 hover:text-white hover:bg-white/10'
            )}
          >
            Financeiro
          </button>
          <button
            onClick={() => switchModule('accounts')}
            className={cn(
              "flex-1 text-sm font-medium px-3 py-2 rounded-md",
              module === 'accounts' 
                ? 'bg-primary text-primary-foreground shadow-sm' 
                : 'text-white/70 hover:text-white hover:bg-white/10'
            )}
          >
            Contas
          </button>
        </div>
      </div>

      {/* Navegação */}
      <nav className="flex-1 overflow-y-auto space-y-2 px-3 py-4">
        {Object.entries(currentNavigation).map(([sectionKey, section]) => (
          <NavigationItem
            key={sectionKey}
            sectionKey={sectionKey}
            section={section}
            isExpanded={expandedSections.has(sectionKey)}
            toggleSection={toggleSection}
            pathname={pathname}
            onItemClick={onClose}
          />
        ))}
      </nav>

      {/* Footer - Usuário */}
      <div className="border-t border-white/10 mt-auto p-4">
        <div className="flex items-center justify-between">
          <Link
            href="/user"
            onClick={onClose}
            className="group flex items-center gap-3 flex-1 min-w-0 rounded-xl"
          >
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white truncate">{user?.name || user?.email || 'Usuário'}</p>
              <p className="text-xs text-white/60 truncate">Configurações</p>
            </div>
          </Link>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="ml-3 text-white/70 hover:text-white hover:bg-white/10"
            aria-label="Sair"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
});

SidebarStable.displayName = 'SidebarStable';