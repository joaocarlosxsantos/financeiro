"use client";
import { useTheme } from '@/components/providers/theme-provider';
import { useEffect, useState, useRef } from 'react';

const options: { value: 'light' | 'dark' | 'system'; label: string }[] = [
  { value: 'light', label: 'Claro' },
  { value: 'system', label: 'Automático' },
  { value: 'dark', label: 'Escuro' },
];

export function ThemeSelector() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const liveRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (mounted && liveRef.current) {
      liveRef.current.textContent = `Tema ativo: ${theme === 'system' ? `Automático (${resolvedTheme === 'dark' ? 'Escuro' : 'Claro'})` : (theme === 'dark' ? 'Escuro' : 'Claro')}`;
    }
  }, [theme, resolvedTheme, mounted]);
  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">Tema</div>
      <div className="flex flex-col sm:flex-row gap-2">
        {options.map(o => {
          const active = theme === o.value;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => setTheme(o.value)}
              className={
                `px-3 py-2 rounded-md border text-sm transition ${(active ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted border-border')}`
              }
              aria-pressed={active}
            >
              {o.label}
              {mounted && o.value === 'system' && ` (${resolvedTheme === 'dark' ? 'escuro' : 'claro'})`}
            </button>
          );
        })}
      </div>
      {mounted && (
        <>
          <p className="text-xs text-muted-foreground">Automático segue a preferência do sistema.</p>
          <div aria-live="polite" aria-atomic="true" className="sr-only" ref={liveRef} />
        </>
      )}
    </div>
  );
}
export default ThemeSelector;
