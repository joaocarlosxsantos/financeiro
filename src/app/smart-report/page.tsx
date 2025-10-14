import { DashboardLayout } from '@/components/layout/dashboard-layout';
import SmartReportClient from '@/components/smart-report/smart-report-client';
import PageTitle from '@/components/PageTitle';
import { getMetadata } from '@/lib/pageTitle';

export const metadata = getMetadata({ module: 'Controle Financeiro', page: 'Relatório Inteligente' });

export default function SmartReportPage() {
  return (
    <DashboardLayout>
      <PageTitle module="Controle Financeiro" page="Relatório Inteligente" />
      
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Relatório Inteligente
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Análise inteligente da sua saúde financeira com insights personalizados
          </p>
        </div>
        
        <SmartReportClient />
      </div>
    </DashboardLayout>
  );
}