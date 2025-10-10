'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DespesasPage() {
  const router = useRouter();

  useEffect(() => {
    // Redireciona para a nova página unificada de transações na aba de gastos
    router.replace('/transacoes?tab=gastos');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h2 className="text-lg font-semibold mb-2">Redirecionando...</h2>
        <p className="text-muted-foreground">Você está sendo redirecionado para a nova página de transações.</p>
      </div>
    </div>
  );
}
