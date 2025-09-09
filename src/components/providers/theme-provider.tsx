'use client';
import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';

interface ThemeContextProps {
  theme: 'light' | 'dark' | 'system';
  resolvedTheme: 'light' | 'dark';
  setTheme: (t: 'light' | 'dark' | 'system') => void;
}

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setThemeState] = useState<'light' | 'dark' | 'system'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('theme') as 'light' | 'dark' | 'system') || 'system';
    }
    return 'system';
  });
  const [resolved, setResolved] = useState<'light' | 'dark'>(() => 'light');
  const mounted = useRef(false); // indica se já montou para decidir persistência
  const userChanged = useRef(false); // evita override do fetch inicial após interação
  const serverThemeRef = useRef<'light' | 'dark' | 'system' | null>(null);
  const hydratedInitial = useRef(false); // impedir PUT logo após hidratação inicial

  // Carrega preferência do backend na primeira montagem (sem sobrescrever escolha manual rápida)
  useEffect(() => {
    mounted.current = true;
    let cancelled = false;
    (async () => {
      try {
        // Primeiro ver se existe sessão ativa para evitar 401 na tela de login
        const sessionRes = await fetch('/api/auth/session', { credentials: 'same-origin' });
        if (!sessionRes.ok) {
          // sem sessão: usar preferência do sistema e evitar chamada ao backend
          hydratedInitial.current = true;
          return;
        }
        const sessionJson = await sessionRes.json().catch(() => null);
        if (!sessionJson || !sessionJson.user || !sessionJson.user.email) {
          hydratedInitial.current = true;
          return;
        }
  const res = await fetch('/api/user/theme', { credentials: 'same-origin' });
        if (!cancelled && res.ok) {
          const data = await res.json();
          if (data?.theme && !userChanged.current) {
            setThemeState(data.theme);
            localStorage.setItem('theme', data.theme);
            serverThemeRef.current = data.theme;
          }
        }
      } catch {
        // silencioso
      } finally {
        hydratedInitial.current = true;
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const calc = () => {
      const val = theme === 'system' ? (mql.matches ? 'dark' : 'light') : theme;
      setResolved(val);
      // debug: verificar aplicação de classe
      try {
        document.documentElement.classList.remove('light', 'dark');
        document.documentElement.classList.add(val);
      } catch (err) {
        // ignore
      }
    };
    calc();
    mql.addEventListener('change', calc);
    localStorage.setItem('theme', theme);
    // Persistir no backend somente quando o usuário mudou explicitamente e o valor difere do servidor
    if (mounted.current && hydratedInitial.current && userChanged.current && serverThemeRef.current !== theme) {
      (async () => {
        try {
          const res = await fetch('/api/user/theme', { method: 'PUT', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ theme }) });
          if (res.ok) {
            serverThemeRef.current = theme;
            userChanged.current = false;
          }
        } catch {
          // ignore
        }
      })();
    }
    return () => mql.removeEventListener('change', calc);
  }, [theme]);

  const setTheme = useCallback((t: 'light' | 'dark' | 'system') => {
    userChanged.current = true;
    setThemeState(t);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme: resolved, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme deve ser usado dentro de ThemeProvider');
  return context;
};
