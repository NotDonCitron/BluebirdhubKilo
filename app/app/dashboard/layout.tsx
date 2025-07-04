
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard/layout';

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();

  if (!session) {
    redirect('/login');
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}
