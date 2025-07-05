'use client';

import { useSessionTimeout } from '@/hooks/use-session-timeout';
import { useEffect } from 'react';

export function SessionTimeoutProvider({ children }: { children: React.ReactNode }) {
  const { timeRemaining } = useSessionTimeout();
  
  useEffect(() => {
    // Log session activity status (can be used for debugging)
    console.log('Session timeout monitoring active:', timeRemaining !== null);
  }, [timeRemaining]);
  
  return <>{children}</>;
}