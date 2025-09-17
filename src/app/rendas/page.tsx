import { DashboardLayout } from '@/components/layout/dashboard-layout';
import RendasContent from '@/components/rendas/rendas-content';
import React from 'react';
import PageTitle from '@/components/PageTitle';
import { getMetadata } from '@/lib/pageTitle';

export const metadata = getMetadata({ module: 'Controle Financeiro', page: 'Ganhos' });

export default function RendasPage() {
  return (
    <DashboardLayout>
  <PageTitle module="Controle Financeiro" page="Ganhos" />
      <RendasContent />
    </DashboardLayout>
  );
}
