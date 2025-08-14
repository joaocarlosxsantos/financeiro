import { Sidebar } from '@/components/layout/sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 flex flex-col min-h-screen overflow-auto">
        {/* Dashboard ocupa toda a largura e altura, sem max-width */}
        <div className="flex-1 w-full p-6 sm:p-8 flex flex-col">
          {children}
        </div>
      </main>
    </div>
  )
}
