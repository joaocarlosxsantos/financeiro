import { NotificationSettings } from '@/components/notifications/notification-settings';
import PageTitle from '@/components/PageTitle';
import { getMetadata } from '@/lib/pageTitle';
import { DashboardLayout } from '@/components/layout/dashboard-layout';

export const metadata = getMetadata({ module: 'Controle Financeiro', page: 'Configurações de Notificações' });

export default function NotificationSettingsPage() {
  return (
    <DashboardLayout>
      <PageTitle module="Controle Financeiro" page="Configurações de Notificações" />
      <div className="p-6">
        <NotificationSettings />
      </div>
    </DashboardLayout>
  );
}