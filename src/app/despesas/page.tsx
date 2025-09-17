import { DashboardLayout } from '@/components/layout/dashboard-layout';
import DespesasContent from '@/components/despesas/despesas-content';
import PageTitle from '@/components/PageTitle';
import { getMetadata } from '@/lib/pageTitle';

export const metadata = getMetadata({ module: 'Controle Financeiro', page: 'Despesas' });

export default function DespesasPage() {
  return (
        <>
          <PageTitle module="Controle Financeiro" page="Despesas" />
          <DashboardLayout>
            <DespesasContent />
          </DashboardLayout>
        </>
  );
}
