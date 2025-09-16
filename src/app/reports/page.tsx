import { DashboardLayout } from '@/components/layout/dashboard-layout';
import ReportsClient from '@/components/reports/ReportsClient';

export const metadata = {
  title: 'Relatórios',
};

export default function ReportsPage() {
  return (
    <DashboardLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Relatórios</h1>
        <ReportsClient />
      </div>
    </DashboardLayout>
  );
}
