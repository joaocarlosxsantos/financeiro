import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import AuthProvider from '@/components/providers/session-provider';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { MonthProvider } from '@/components/providers/month-provider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Controle Financeiro',
  description: 'Aplicação para controle de despesas e rendas pessoais',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={inter.className + ' bg-background text-foreground min-h-screen'}>
        {/* Skip link for keyboard users */}
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-white focus:text-black focus:p-2 focus:rounded">Pular para o conteúdo</a>
        <ThemeProvider>
          <MonthProvider>
            <AuthProvider>
              <main id="main">{children}</main>
            </AuthProvider>
          </MonthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
