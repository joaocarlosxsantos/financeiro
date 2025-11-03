import { ControleContasContent } from '@/components/controle-contas/controle-contas-content';
import PageTitle from '@/components/PageTitle';
import { getMetadata } from '@/lib/pageTitle';

export const metadata = getMetadata({ module: 'Controle de Contas', page: 'Visão Geral' });

export default function ControleContasPage() {
  return (
    <>
      <PageTitle module="Controle de Contas" page="Visão Geral" />
      <ControleContasContent />
    </>
  );
}
