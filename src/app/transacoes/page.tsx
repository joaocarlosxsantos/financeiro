import { DashboardLayout } from '@/components/layout/dashboard-layout';
import TransacoesContent from '@/components/transacoes/transacoes-content';
import PageTitle from '@/components/PageTitle';
import { getMetadata } from '@/lib/pageTitle';

export const metadata = getMetadata({ module: 'Controle Financeiro', page: 'Transações' });

export default function TransacoesPage() {
  return (
    <>
      <PageTitle module="Controle Financeiro" page="Transações" />
      <DashboardLayout>
        <TransacoesContent />
      </DashboardLayout>
    </>
  );
}