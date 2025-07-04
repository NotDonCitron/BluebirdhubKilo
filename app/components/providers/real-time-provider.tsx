'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRealTimeEvents } from '@/hooks/use-real-time-events';
import { toast } from 'react-hot-toast';

interface RealTimeEvent {
  type: string;
  data: any;
  timestamp: string;
}

interface RealTimeContextType {
  isConnected: boolean;
  connectionState: 'disconnected' | 'connecting' | 'connected' | 'error';
  sendEvent: (eventType: string, data: any) => Promise<void>;
  lastEvent: RealTimeEvent | null;
}

const RealTimeContext = createContext<RealTimeContextType | undefined>(undefined);

export function useRealTime() {
  const context = useContext(RealTimeContext);
  if (context === undefined) {
    throw new Error('useRealTime must be used within a RealTimeProvider');
  }
  return context;
}

interface RealTimeProviderProps {
  children: React.ReactNode;
}

export function RealTimeProvider({ children }: RealTimeProviderProps) {
  const { data: session } = useSession();
  const [notificationSettings, setNotificationSettings] = useState<any>(null);

  // Load notification settings
  useEffect(() => {
    if (session?.user) {
      fetch('/api/settings/notifications')
        .then(res => res.json())
        .then(data => setNotificationSettings(data))
        .catch(err => console.error('Failed to load notification settings:', err));
    }
  }, [session?.user]);

  const handleEvent = (event: RealTimeEvent) => {
    console.log('Received real-time event:', event);

    // Handle different event types
    switch (event.type) {
      case 'connection':
        if (notificationSettings?.systemUpdates) {
          toast.success('Connected to real-time updates');
        }
        break;

      case 'task_assigned':
        if (notificationSettings?.taskReminders && notificationSettings?.desktopNotifications) {
          toast.success(`New task assigned: ${event.data.taskTitle}`);
          
          // Browser notification if permission granted
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('New Task Assigned', {
              body: event.data.taskTitle,
              icon: '/favicon.ico',
            });
          }
        }
        break;

      case 'task_completed':
        if (notificationSettings?.taskReminders && notificationSettings?.desktopNotifications) {
          toast.success(`Task completed: ${event.data.taskTitle}`);
        }
        break;

      case 'comment_added':
        if (notificationSettings?.commentNotifications && notificationSettings?.desktopNotifications) {
          toast.info(`New comment from ${event.data.senderName}`);
          
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('New Comment', {
              body: `${event.data.senderName} commented on ${event.data.entityTitle}`,
              icon: '/favicon.ico',
            });
          }
        }
        break;

      case 'mention':
        if (notificationSettings?.mentionNotifications && notificationSettings?.desktopNotifications) {
          toast.info(`You were mentioned by ${event.data.senderName}`);
          
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('You were mentioned', {
              body: `${event.data.senderName} mentioned you`,
              icon: '/favicon.ico',
            });
          }
        }
        break;

      case 'workspace_invite':
        if (notificationSettings?.workspaceInvites && notificationSettings?.desktopNotifications) {
          toast.info(`Invited to workspace: ${event.data.workspaceName}`);
        }
        break;

      case 'file_shared':
        if (notificationSettings?.systemUpdates && notificationSettings?.desktopNotifications) {
          toast.info(`File shared: ${event.data.fileName}`);
        }
        break;

      case 'system_update':
        if (notificationSettings?.systemUpdates && notificationSettings?.desktopNotifications) {
          toast.info(event.data.message);
        }
        break;

      case 'heartbeat':
        // Silent heartbeat, no notification
        break;

      default:
        console.log('Unhandled event type:', event.type);
    }
  };

  const handleConnect = () => {
    console.log('Real-time connection established');
    
    // Request notification permission if not already granted
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        console.log('Notification permission:', permission);
      });
    }
  };

  const handleDisconnect = () => {
    console.log('Real-time connection lost');
    if (notificationSettings?.systemUpdates) {
      toast.error('Lost connection to real-time updates');
    }
  };

  const handleError = (error: Event) => {
    console.error('Real-time connection error:', error);
    if (notificationSettings?.systemUpdates) {
      toast.error('Real-time connection error');
    }
  };

  const { isConnected, connectionState, lastEvent, sendEvent } = useRealTimeEvents({
    onEvent: handleEvent,
    onConnect: handleConnect,
    onDisconnect: handleDisconnect,
    onError: handleError,
    autoReconnect: true,
    reconnectDelay: 5000,
  });

  const contextValue: RealTimeContextType = {
    isConnected,
    connectionState,
    sendEvent,
    lastEvent,
  };

  return (
    <RealTimeContext.Provider value={contextValue}>
      {children}
    </RealTimeContext.Provider>
  );
}