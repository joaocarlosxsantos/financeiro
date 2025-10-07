'use client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { UserProfile } from '@/components/user/user-profile';
import PageTitle from '@/components/PageTitle';

export default function UserPage() {
  return (
    <DashboardLayout>
      <PageTitle module="Controle Financeiro" page="Usuário" />
      <div className="flex min-h-[60vh] items-center justify-center p-4 bg-background/50 dark:bg-background">
        <UserProfile />
      </div>
    </DashboardLayout>
  );
}
