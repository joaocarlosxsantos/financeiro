'use client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { UserProfile } from '@/components/user/user-profile';

export default function UserPage() {
  return (
    <DashboardLayout>
      <div className="flex min-h-[60vh] items-center justify-center">
        <UserProfile />
      </div>
    </DashboardLayout>
  );
}
