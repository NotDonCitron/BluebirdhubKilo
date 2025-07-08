
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard/layout';
import { authOptions } from '@/lib/auth-config';
import { appLogger } from '@/lib/logger';

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  let session;
  
  try {
    session = await getServerSession(authOptions);
    appLogger.debug('Dashboard layout session check', { 
      hasSession: !!session, 
      userId: session?.user?.id 
    });
  } catch (error) {
    appLogger.error('Dashboard layout - session error:', error);
    redirect('/login');
  }

  if (!session) {
    appLogger.info('Dashboard layout - no session, redirecting to login');
    redirect('/login');
  }

  appLogger.info('Dashboard layout - session valid, rendering dashboard');
  return <DashboardLayout>{children}</DashboardLayout>;
}
