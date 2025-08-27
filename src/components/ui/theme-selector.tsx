"use client";
import { useTheme } from '@/components/providers/theme-provider';
import { useEffect, useState, useRef } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';

export function ThemeSelector() {
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

  const baseBtn = 'relative inline-flex items-center justify-center rounded-md p-2 transition text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50';
  const inactive = 'bg-transparent hover:bg-muted text-muted-foreground border border-transparent';
  const active = 'bg-primary text-primary-foreground shadow border border-primary';

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium">Tema</div>
      <div role="group" aria-label="Selecionar tema" className="inline-flex gap-2">
        <button
          type="button"
          onClick={() => setTheme('light')}
          className={`${baseBtn} ${theme === 'light' ? active : inactive}`}
          aria-pressed={theme === 'light'}
          aria-label="Tema claro"
        >
          <Sun className="h-6 w-6" />
        </button>
        <button
          type="button"
          onClick={() => setTheme('dark')}
          className={`${baseBtn} ${theme === 'dark' ? active : inactive}`}
          aria-pressed={theme === 'dark'}
          aria-label="Tema escuro"
        >
          <Moon className="h-6 w-6" />
        </button>
        <button
          type="button"
          onClick={() => setTheme('system')}
          className={`${baseBtn} ${theme === 'system' ? active : inactive}`}
          aria-pressed={theme === 'system'}
          aria-label="Tema automático"
        >
          <Monitor className="h-6 w-6" />
          {mounted && (
            <span className="absolute -bottom-1 text-[10px] font-medium tracking-wide text-muted-foreground w-max left-1/2 -translate-x-1/2">
              {resolvedTheme === 'dark' ? 'escuro' : 'claro'}
            </span>
          )}
        </button>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="inline-block h-2 w-2 rounded-full bg-primary animate-pulse" />
        {theme === 'system' ? 'Automático segue o sistema.' : theme === 'dark' ? 'Modo escuro ativo.' : 'Modo claro ativo.'}
        {theme === 'system' && mounted && <span className="italic">({resolvedTheme === 'dark' ? 'escuro' : 'claro'})</span>}
      </div>
      <div aria-live="polite" aria-atomic="true" className="sr-only" ref={liveRef} />
    </div>
  );
}
export default ThemeSelector;
