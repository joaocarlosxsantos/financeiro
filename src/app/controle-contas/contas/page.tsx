import { ContasContent } from '@/components/controle-contas/contas-content';
import PageTitle from '@/components/PageTitle';
import { getMetadata } from '@/lib/pageTitle';

export const metadata = getMetadata({ module: 'Controle de Contas', page: 'Contas' });

export default function ContasPage() {
  return (
    <>
      <PageTitle module="Controle de Contas" page="Contas" />
      <ContasContent />
    </>
  );
}
