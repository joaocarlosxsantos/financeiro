import Link from 'next/link';
import PageTitle from '@/components/PageTitle';
import { getMetadata } from '@/lib/pageTitle';

export const metadata = getMetadata({ module: 'Controle de Contas', page: 'Dashboard' });

export default function AccountsDashboardPage() {
  return (
    <div className="p-8">
  <PageTitle module="Controle de Contas" page="Dashboard" />
  <h1 className="text-2xl font-bold">Controle de Contas — Dashboard</h1>
      <p className="mt-2 text-muted-foreground">Página inicial do módulo Controle de Contas (placeholder).</p>
      <div className="mt-4 space-x-2">
        <Link href="/accounts/contas" className="text-primary underline">Ir para Contas</Link>
        <Link href="/accounts/grupos" className="text-primary underline">Ir para Grupos</Link>
      </div>
    </div>
  );
}
