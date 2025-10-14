import { DashboardLayout } from '@/components/layout/dashboard-layout';
import ReportsClient from '@/components/reports/ReportsClient';
import PageTitle from '@/components/PageTitle';
import { getMetadata } from '@/lib/pageTitle';

export const metadata = getMetadata({ module: 'Controle Financeiro', page: 'Relatórios' });

export default function ReportsPage() {
  return (
    <DashboardLayout maxWidth="max-w-7xl">
  {/* componente cliente: garante que document.title seja atualizado no navegador (client-side) */}
  <PageTitle module="Controle Financeiro" page="Relatórios" />

      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Relatórios</h1>
        <ReportsClient />
      </div>
    </DashboardLayout>
  );
}
