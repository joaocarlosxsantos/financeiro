import React from 'react';
import PageTitle from '@/components/PageTitle';
import { getMetadata } from '@/lib/pageTitle';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { CategoriasContent } from '@/components/categorias/categorias-content';

export const metadata = getMetadata({ module: 'Controle Financeiro', page: 'Categorias' });

export default function CategoriasPage() {
  return (
    <DashboardLayout maxWidth="max-w-6xl">
      <PageTitle module="Controle Financeiro" page="Categorias" />
      <CategoriasContent />
    </DashboardLayout>
  );
}
