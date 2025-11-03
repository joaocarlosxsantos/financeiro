import { GruposContent } from '@/components/controle-contas/grupos-content';
import PageTitle from '@/components/PageTitle';
import { getMetadata } from '@/lib/pageTitle';

export const metadata = getMetadata({ module: 'Controle de Contas', page: 'Grupos' });

export default function GruposPage() {
  return (
    <>
      <PageTitle module="Controle de Contas" page="Grupos" />
      <GruposContent />
    </>
  );
}
