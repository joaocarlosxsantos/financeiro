'use client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { TagsContent } from '@/components/tags/tags-content';
import PageTitle from '@/components/PageTitle';

export default function TagsPage() {
  return (
    <DashboardLayout>
      <PageTitle module="Controle Financeiro" page="Tags" />
      <TagsContent />
    </DashboardLayout>
  );
}
