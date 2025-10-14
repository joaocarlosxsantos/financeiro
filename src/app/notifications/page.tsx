import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { NotificationsPageClient } from '@/components/notifications';
import PageTitle from '@/components/PageTitle';
import { getMetadata } from '@/lib/pageTitle';

export const metadata = getMetadata({ module: 'Controle Financeiro', page: 'Notificações' });

export default function NotificationsPage() {
  return (
    <>
      <PageTitle module="Controle Financeiro" page="Notificações" />
      <DashboardLayout maxWidth="max-w-6xl">
        <NotificationsPageClient />
      </DashboardLayout>
    </>
  );
}