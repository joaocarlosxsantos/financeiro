import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { CarteirasContent } from '@/components/wallets/carteiras-content';
import PageTitle from '@/components/PageTitle';
import { getMetadata } from '@/lib/pageTitle';

export const metadata = getMetadata({ module: 'Controle Financeiro', page: 'Carteiras' });

export default function WalletsPage() {
  return (
    <DashboardLayout>
      <PageTitle module="Controle Financeiro" page="Carteiras" />
      <CarteirasContent />
    </DashboardLayout>
  );
}
