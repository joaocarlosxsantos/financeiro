import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import AuthProvider from '@/components/providers/session-provider';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { MonthProvider } from '@/components/providers/month-provider';
import { DisableNavigationLoading } from '@/components/providers/disable-navigation-loading';
import PageTitle from '@/components/PageTitle';
import AIAssistantButton from '@/components/ai-assistant/ai-assistant-button';

// componente dev para suprimir logs do hot-reloader
let SuppressHotLogs: any = () => null;
try {
  // import dinamicamente apenas em ambiente suportado (evita erro em produção)
  SuppressHotLogs = require('@/components/dev/suppress-hot-logs').default;
} catch (e) {
  // noop
}

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Controle Financeiro',
  description: 'Aplicação para controle de gastos e ganhos pessoais',
  icons: {
    icon: '/financeiro.png',
    shortcut: '/financeiro.png',
    apple: '/financeiro.png',
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
              <DisableNavigationLoading />
              {process.env.NODE_ENV === 'development' && <SuppressHotLogs />}
              {/* Páginas devem exportar `metadata` via `getMetadata` ou usar `PageTitle` localmente quando necessário. */}
              <main id="main">{children}</main>
              {/* Assistente de IA - Botão flutuante */}
              <AIAssistantButton />
            </AuthProvider>
          </MonthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
