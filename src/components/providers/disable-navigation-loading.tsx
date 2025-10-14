'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Componente que desabilita o loading padrão do Next.js durante navegação
 * Remove o indicador de carregamento que aparece brevemente entre páginas
 */
export function DisableNavigationLoading() {
  const router = useRouter();

  useEffect(() => {
    // Desabilita o loading padrão do Next.js
    const style = document.createElement('style');
    style.textContent = `
      /* Remove o loading indicator padrão do Next.js */
      #__next-route-loading-indicator,
      .next-route-loading-indicator,
      [data-nextjs-router-loading],
      .router-loading {
        display: none !important;
      }
      
      /* Remove possíveis overlays de loading */
      .loading-overlay,
      .page-loading,
      .route-loading {
        display: none !important;
      }
    `;
    document.head.appendChild(style);

    // Cleanup
    return () => {
      if (style.parentNode) {
        style.parentNode.removeChild(style);
      }
    };
  }, []);

  return null;
}