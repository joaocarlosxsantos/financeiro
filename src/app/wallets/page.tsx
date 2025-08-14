import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { CarteirasContent } from '@/components/wallets/carteiras-content';

export default function WalletsPage() {
  return (
    <DashboardLayout>
      <CarteirasContent />
    </DashboardLayout>
  );
}
