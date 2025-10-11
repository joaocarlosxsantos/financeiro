import { Suspense } from 'react';
import TransacoesContent from '@/components/transacoes/transacoes-content';
import { Loader } from '@/components/ui/loader';

function TransacoesWrapper() {
  return (
    <Suspense fallback={<Loader text="Carregando transações..." />}>
      <TransacoesContent />
    </Suspense>
  );
}

export default TransacoesWrapper;