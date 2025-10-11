"use client";

import PageTitle from '@/components/PageTitle';
import { MetasContent } from '@/components/metas/metas-content';

export default function GoalsPage() {
  return (
    <div className="flex flex-col gap-12 w-full max-w-7xl mx-auto">
      <PageTitle module="Controle Financeiro" page="Metas" />
      <MetasContent />
    </div>
  );
}
