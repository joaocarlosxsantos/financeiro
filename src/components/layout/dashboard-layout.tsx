'use client';
import { SidebarStable as Sidebar } from './sidebar-stable';
import { useState, useEffect } from 'react';
import { Menu, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NotificationCenter } from '@/components/notifications/notification-center';

interface DashboardLayoutProps {
  children: React.ReactNode;
  maxWidth?: string;
}

export function DashboardLayout({ children, maxWidth = "max-w-5xl" }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Abrir sidebar em mobile quando um evento customizado for disparado (ex: pelo tour)
  useEffect(() => {
    function handleOpen() {
      setSidebarOpen(true);
    }
    window.addEventListener('openSidebar', handleOpen as EventListener);
    return () => window.removeEventListener('openSidebar', handleOpen as EventListener);
  }, []);

  // Trava o scroll do body apenas enquanto o drawer mobile está aberto.
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar desktop */}
      <aside className="hidden md:block h-full flex-none">
        <Sidebar />
      </aside>

      {/* Sidebar mobile drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Overlay com animação suave */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative h-full w-full max-w-[19rem] bg-sidebar border-r border-sidebar-border shadow-2xl animate-slide-in-mobile z-50">
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      <main className="flex-1 flex flex-col overflow-hidden w-full min-w-0">
        {/* Topbar mobile */}
        <div className="md:hidden flex items-center justify-between border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-30 h-16 px-4 flex-none">
          <div className="flex items-center min-w-0">
            <button
              aria-label="Abrir menu"
              className="mr-2 -ml-2 h-10 w-10 flex items-center justify-center rounded-lg hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors flex-none"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="text-base font-semibold truncate">Controle Financeiro</span>
          </div>

          {/* Notificações no header mobile */}
          <div className="flex items-center flex-none">
            <NotificationCenter className="text-muted-foreground hover:text-foreground" />
          </div>
        </div>
        <div className={`w-full ${maxWidth} mx-auto p-4 sm:p-6 lg:p-8 overflow-auto flex-1`}>{children}</div>
      </main>
    </div>
  );
}
