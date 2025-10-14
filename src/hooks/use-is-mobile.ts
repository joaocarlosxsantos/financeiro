/**
 * Hook otimizado para detectar mobile usando CSS media queries
 * Evita re-renders desnecessários que causam "loading" na sidebar
 */

import { useState, useEffect, useCallback } from 'react';

// Cache global para evitar recalcular em cada componente
let globalIsMobile: boolean | null = null;
let globalIsHydrated = false;
const listeners = new Set<(isMobile: boolean) => void>();

// Função para verificar se é mobile usando CSS media query
function checkIsMobile(breakpoint = 768): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(`(max-width: ${breakpoint - 1}px)`).matches;
}

// Inicializar estado global quando possível
if (typeof window !== 'undefined') {
  globalIsMobile = checkIsMobile();
  globalIsHydrated = true;
}

/**
 * Hook otimizado que usa CSS media queries e cache global
 * para evitar re-renders desnecessários
 */
export function useIsMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState(() => {
    if (globalIsHydrated && globalIsMobile !== null) {
      return globalIsMobile;
    }
    return false;
  });

  const updateIsMobile = useCallback((newValue: boolean) => {
    setIsMobile(newValue);
  }, []);

  useEffect(() => {
    // Se ainda não está hidratado, hidrata agora
    if (!globalIsHydrated) {
      globalIsHydrated = true;
      globalIsMobile = checkIsMobile(breakpoint);
      setIsMobile(globalIsMobile);
    }

    // Adiciona listener para este componente
    listeners.add(updateIsMobile);

    // Setup da media query apenas uma vez globalmente
    if (listeners.size === 1 && typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
      
      const handleChange = (e: MediaQueryListEvent) => {
        globalIsMobile = e.matches;
        // Notifica todos os componentes que usam o hook
        listeners.forEach(listener => listener(e.matches));
      };

      mediaQuery.addListener(handleChange);
      
      // Cleanup será feita quando o último componente for desmontado
      return () => {
        listeners.delete(updateIsMobile);
        if (listeners.size === 0) {
          mediaQuery.removeListener(handleChange);
        }
      };
    }

    return () => {
      listeners.delete(updateIsMobile);
    };
  }, [breakpoint, updateIsMobile]);

  return isMobile;
}