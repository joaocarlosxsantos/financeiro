"use client";
import { useTheme } from '@/components/providers/theme-provider';
import { useEffect, useState, useRef } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';

/**
 * Seletor de temas inteligente que se adapta ao contexto.
 * Detecta se está na sidebar escura ou em outras áreas e ajusta as cores automaticamente
 * para garantir máxima visibilidade em qualquer situação.
 */
export function ThemeSelector({ context = 'sidebar' }: { context?: 'sidebar' | 'profile' }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const liveRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (mounted && liveRef.current) {
      const label = theme === 'system'
        ? `Automático (${resolvedTheme === 'dark' ? 'Escuro' : 'Claro'})`
        : (theme === 'dark' ? 'Escuro' : 'Claro');
      liveRef.current.textContent = `Tema ativo: ${label}`;
    }
  }, [theme, resolvedTheme, mounted]);

  const baseBtn = 'relative inline-flex items-center justify-center rounded-lg p-3 transition-all duration-200 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 group';
  
  // Cores adaptáveis ao contexto
  const getInactiveClasses = () => {
    if (context === 'sidebar') {
      return 'bg-white/5 hover:bg-white/15 text-white/70 hover:text-white/90 border border-white/10 hover:border-white/25 shadow-sm hover:shadow-md backdrop-blur-sm';
    }
    return 'bg-muted/50 dark:bg-white/5 hover:bg-muted dark:hover:bg-white/10 text-muted-foreground hover:text-foreground border border-border dark:border-white/15 hover:border-primary/30 shadow-sm hover:shadow-md';
  };
  
  const getActiveClasses = () => {
    if (context === 'sidebar') {
      return 'bg-primary/90 hover:bg-primary text-primary-foreground shadow-lg border border-primary/50 scale-105 ring-2 ring-primary/20';
    }
    return 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg border border-primary scale-105 ring-2 ring-primary/20';
  };
  
  const inactive = getInactiveClasses();
  const active = getActiveClasses();

  return (
    <div className="space-y-4">
      <div className={`text-sm font-semibold tracking-wide ${
        context === 'sidebar' ? 'text-white/90' : 'text-foreground/90 dark:text-white/90'
      }`}>Tema</div>
      <div role="group" aria-label="Selecionar tema" className="flex gap-3">
        <button
          type="button"
          onClick={() => setTheme('light')}
          // manter aria-pressed falso no SSR; só refletir estado após mount para evitar mismatch
          className={`${baseBtn} ${mounted ? (theme === 'light' ? active : inactive) : inactive}`}
          aria-pressed={mounted ? theme === 'light' : false}
          aria-label="Tema claro"
        >
          <Sun className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" />
        </button>
        <button
          type="button"
          onClick={() => setTheme('dark')}
          className={`${baseBtn} ${mounted ? (theme === 'dark' ? active : inactive) : inactive}`}
          aria-pressed={mounted ? theme === 'dark' : false}
          aria-label="Tema escuro"
        >
          <Moon className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" />
        </button>
        <button
          type="button"
          onClick={() => setTheme('system')}
          className={`${baseBtn} ${mounted ? (theme === 'system' ? active : inactive) : inactive}`}
          aria-pressed={mounted ? theme === 'system' : false}
          aria-label="Tema automático"
        >
          <Monitor className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" />
          {mounted ? (
            <span className={`absolute -bottom-1 text-[9px] font-semibold tracking-wider w-max left-1/2 -translate-x-1/2 ${
              context === 'sidebar' ? 'text-white/60' : 'text-muted-foreground/80'
            }`}>
              {resolvedTheme === 'dark' ? 'escuro' : 'claro'}
            </span>
          ) : null}
        </button>
      </div>
        <div className={`flex items-center gap-2 text-xs ${
          context === 'sidebar' ? 'text-white/70' : 'text-muted-foreground dark:text-white/70'
        }`}>
        <span className="inline-block h-2 w-2 rounded-full bg-primary animate-pulse shadow-sm" />
        {mounted ? (
          <>
            <span className="font-medium">
              {theme === 'system' ? 'Automático segue o sistema.' : theme === 'dark' ? 'Modo escuro ativo.' : 'Modo claro ativo.'}
            </span>
            {theme === 'system' && <span className="italic opacity-75">({resolvedTheme === 'dark' ? 'escuro' : 'claro'})</span>}
          </>
        ) : (
          // Texto neutro no SSR para evitar mismatch
          <span className="animate-pulse">Carregando preferência de tema...</span>
        )}
      </div>
      <div aria-live="polite" aria-atomic="true" className="sr-only" ref={liveRef} />
    </div>
  );
}
export default ThemeSelector;
