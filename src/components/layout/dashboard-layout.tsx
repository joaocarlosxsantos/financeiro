"use client"
import { Sidebar } from './sidebar'
import { useState } from 'react'
import { Menu } from 'lucide-react'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar desktop */}
      <aside className="hidden md:block h-full">
        <Sidebar />
      </aside>

      {/* Sidebar mobile drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-64 bg-gray-900 dark:bg-slate-900 shadow-xl animate-slide-in-mobile z-50">
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      <main className="flex-1 overflow-auto w-full">
        {/* Topbar mobile */}
        <div className="md:hidden flex items-center h-14 px-4 border-b border-border bg-background sticky top-0 z-30">
          <button
            aria-label="Abrir menu"
            className="mr-2 p-2 rounded-md hover:bg-gray-200 dark:hover:bg-slate-800 focus:outline-none"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
          <span className="text-lg font-bold">Controle Financeiro</span>
        </div>
        <div className="w-full max-w-5xl mx-auto p-4 sm:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
