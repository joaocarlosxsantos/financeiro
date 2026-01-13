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

  // Previne scroll do body quando sidebar mobile está aberta
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'hidden'; // Sempre hidden
    }
    
    return () => {
      document.body.style.overflow = 'hidden'; // Sempre hidden
    };
  }, [sidebarOpen]);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar desktop */}
      <aside className="hidden md:block h-full">
        <Sidebar />
      </aside>

      {/* Sidebar mobile drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Overlay com animação suave */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300" 
            onClick={() => setSidebarOpen(false)} 
          />
          <div className="absolute left-0 top-0 h-full w-full max-w-sm bg-gray-900 dark:bg-slate-900 shadow-2xl animate-slide-in-mobile z-50">
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      <main className="flex-1 flex flex-col overflow-hidden w-full">
        {/* Topbar mobile otimizada */}
        <div className="md:hidden flex items-center justify-between border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-30 shadow-sm h-16 px-4 flex-none">
          <div className="flex items-center">
            <button
              aria-label="Abrir menu"
              className="mr-3 p-2 rounded-lg hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/60 transition-colors"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </button>
            <span className="text-lg font-bold truncate">Controle Financeiro</span>
          </div>
          
          {/* Notificações no header mobile */}
          <div className="flex items-center">
            <NotificationCenter className="text-muted-foreground hover:text-foreground" />
          </div>
        </div>
        <div className={`w-full ${maxWidth} mx-auto p-4 sm:p-8 overflow-auto flex-1`}>{children}</div>
      </main>
    </div>
  );
}
