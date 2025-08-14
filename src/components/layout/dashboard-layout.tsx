import { Sidebar } from './sidebar'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="w-full max-w-5xl mx-auto p-6 sm:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
