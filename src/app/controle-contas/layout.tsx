import React from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';

export default function ControleContasLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout maxWidth="max-w-full">
      {children}
    </DashboardLayout>
  );
}
