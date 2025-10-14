import { DashboardLayout } from '@/components/layout/dashboard-layout';
import CreditManagementContent from '@/components/credit-management/credit-management-content';
import PageTitle from '@/components/PageTitle';
import { getMetadata } from '@/lib/pageTitle';

export const metadata = getMetadata({ module: 'Controle Financeiro', page: 'Cartão de Crédito' });

export default function CreditManagementPage() {
  return (
    <>
      <PageTitle module="Controle Financeiro" page="Cartão de Crédito" />
      <DashboardLayout maxWidth="max-w-7xl">
        <CreditManagementContent />
      </DashboardLayout>
    </>
  );
}