'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

interface UseSessionTimeoutOptions {
  warningTime?: number; // Time before timeout to show warning (in minutes)
  onTimeout?: () => void;
  onWarning?: () => void;
}

export function useSessionTimeout(options: UseSessionTimeoutOptions = {}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const warningShownRef = useRef<boolean>(false);

  const {
    warningTime = 5, // 5 minutes before timeout
    onTimeout,
    onWarning
  } = options;

  // Get session timeout from user settings or default to 480 minutes (8 hours)
  const getSessionTimeout = useCallback(() => {
    if (session?.user?.id) {
      // In a real implementation, this would come from user settings
      // For now, we'll use a default of 480 minutes
      return 480 * 60 * 1000; // Convert to milliseconds
    }
    return 480 * 60 * 1000;
  }, [session]);

  const handleTimeout = useCallback(async () => {
    console.log('Session timeout - logging out user');
    
    // Clear any existing timeouts
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);
    
    // Call custom timeout handler if provided
    if (onTimeout) {
      onTimeout();
    }
    
    // Show timeout message
    toast.error('Your session has expired. Please log in again.', {
      duration: 5000,
      position: 'top-center'
    });
    
    // Sign out and redirect
    await signOut({ redirect: false });
    router.push('/login?timeout=true');
  }, [onTimeout, router]);

  const showWarning = useCallback(() => {
    if (!warningShownRef.current) {
      warningShownRef.current = true;
      
      // Call custom warning handler if provided
      if (onWarning) {
        onWarning();
      } else {
        // Default warning
        toast.error(
          `Session Expiring Soon: Your session will expire in ${warningTime} minutes. Please save your work.`,
          {
            duration: 30000, // Show for 30 seconds
            position: 'top-center',
            icon: '⚠️'
          }
        );
      }
    }
  }, [warningTime, onWarning]);

  const resetTimeout = useCallback(() => {
    lastActivityRef.current = Date.now();
    warningShownRef.current = false;
    
    // Clear existing timeouts
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);
    
    if (status === 'authenticated' && session) {
      const timeout = getSessionTimeout();
      const warningTimeout = timeout - (warningTime * 60 * 1000);
      
      // Set warning timeout
      warningRef.current = setTimeout(() => {
        showWarning();
      }, warningTimeout);
      
      // Set session timeout
      timeoutRef.current = setTimeout(() => {
        handleTimeout();
      }, timeout);
    }
  }, [status, session, getSessionTimeout, warningTime, showWarning, handleTimeout]);

  // Track user activity
  const trackActivity = useCallback(() => {
    const now = Date.now();
    const timeSinceLastActivity = now - lastActivityRef.current;
    
    // Only reset if more than 1 minute has passed since last activity
    if (timeSinceLastActivity > 60000) {
      resetTimeout();
    }
  }, [resetTimeout]);

  // Set up activity listeners
  useEffect(() => {
    if (status === 'authenticated') {
      // Events to track
      const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
      
      events.forEach(event => {
        window.addEventListener(event, trackActivity);
      });
      
      // Initial timeout setup
      resetTimeout();
      
      // Cleanup
      return () => {
        events.forEach(event => {
          window.removeEventListener(event, trackActivity);
        });
        
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        if (warningRef.current) clearTimeout(warningRef.current);
      };
    }
  }, [status, trackActivity, resetTimeout]);

  // Check session validity on focus
  useEffect(() => {
    const handleFocus = async () => {
      if (status === 'authenticated' && session) {
        // Check if session is still valid
        const response = await fetch('/api/auth/session');
        if (!response.ok) {
          handleTimeout();
        } else {
          resetTimeout();
        }
      }
    };

    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [status, session, handleTimeout, resetTimeout]);

  return {
    resetTimeout,
    timeRemaining: timeoutRef.current ? 
      Math.max(0, getSessionTimeout() - (Date.now() - lastActivityRef.current)) : 
      null
  };
}

// Hook for components that need to display session timeout info
export function useSessionTimeoutInfo() {
  const { timeRemaining } = useSessionTimeout();
  
  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${minutes}m`;
  };
  
  return {
    timeRemaining: timeRemaining ? formatTime(timeRemaining) : null,
    isExpiringSoon: timeRemaining ? timeRemaining < 5 * 60 * 1000 : false
  };
}