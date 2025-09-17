import { DashboardContent } from '@/components/dashboard/dashboard-content';
import PageTitle, { } from '@/components/PageTitle';
import { getMetadata } from '@/lib/pageTitle';

export const metadata = getMetadata({ module: 'Controle Financeiro', page: 'Dashboard' });

export default function DashboardPage() {
  return (
    <>
      <PageTitle module="Controle Financeiro" page="Dashboard" />
      <DashboardContent />
    </>
  );
}
