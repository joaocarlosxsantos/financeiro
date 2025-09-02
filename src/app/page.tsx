'use client';

import { useAuth } from '@/hooks/use-auth';
import { useEffect } from 'react';

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        window.location.href = '/dashboard';
      } else {
        window.location.href = '/auth/signin';
      }
    }
  }, [isAuthenticated, isLoading]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        {/* Visually hidden H1 for accessibility and SEO */}
        <h1 className="sr-only">Controle Financeiro — Carregando</h1>
  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" aria-hidden="true"></div>
  <p className="mt-2 text-black dark:text-white">Carregando...</p>
      </div>
    </div>
  );
}
