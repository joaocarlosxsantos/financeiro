import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { CreditCardsContent } from '@/components/credit-cards/credit-cards-content';
import PageTitle from '@/components/PageTitle';
import { getMetadata } from '@/lib/pageTitle';

export const metadata = getMetadata({ module: 'Controle Financeiro', page: 'Cartões de Crédito' });

export default function CreditCardsPage() {
  return (
    <DashboardLayout>
      <PageTitle module="Controle Financeiro" page="Cartões de Crédito" />
      <CreditCardsContent />
    </DashboardLayout>
  );
}