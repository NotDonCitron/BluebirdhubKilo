
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard/layout';
import { authOptions } from '@/lib/auth-config';

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  let session;
  
  try {
    session = await getServerSession(authOptions);
    console.log('Dashboard layout - session check:', { 
      hasSession: !!session, 
      userId: session?.user?.id 
    });
  } catch (error) {
    console.error('Dashboard layout - session error:', error);
    redirect('/login');
  }

  if (!session) {
    console.log('Dashboard layout - no session, redirecting to login');
    redirect('/login');
  }

  console.log('Dashboard layout - session valid, rendering dashboard');
  return <DashboardLayout>{children}</DashboardLayout>;
}
