import { useEffect, useRef, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';

interface RealTimeEvent {
  type: string;
  data: Record<string, unknown>;
  timestamp: string;
}

interface UseRealTimeEventsOptions {
  onEvent?: (event: RealTimeEvent) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  autoReconnect?: boolean;
  reconnectDelay?: number;
}

export function useRealTimeEvents(options: UseRealTimeEventsOptions = {}) {
  const { data: session } = useSession();
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [lastEvent, setLastEvent] = useState<RealTimeEvent | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const {
    onEvent,
    onConnect,
    onDisconnect,
    onError,
    autoReconnect = true,
    reconnectDelay = 5000,
  } = options;

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    setIsConnected(false);
    setConnectionState('disconnected');
  }, []);

  const connect = useCallback(() => {
    if (!session?.user) {
      return;
    }

    if (eventSourceRef.current) {
      disconnect();
    }

    setConnectionState('connecting');

    try {
      const eventSource = new EventSource('/api/events/stream');
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setIsConnected(true);
        setConnectionState('connected');
        onConnect?.();
      };

      eventSource.onmessage = (event) => {
        try {
          const parsedEvent: RealTimeEvent = JSON.parse(event.data);
          setLastEvent(parsedEvent);
          onEvent?.(parsedEvent);
        } catch (error) {
          console.error('Error parsing SSE event:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error('SSE connection error:', error);
        setIsConnected(false);
        setConnectionState('error');
        onError?.(error);

        // Auto-reconnect if enabled
        if (autoReconnect && !reconnectTimeoutRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectTimeoutRef.current = null;
            connect();
          }, reconnectDelay);
        }
      };

      eventSource.addEventListener('close', () => {
        setIsConnected(false);
        setConnectionState('disconnected');
        onDisconnect?.();
      });

    } catch (error) {
      console.error('Error creating EventSource:', error);
      setConnectionState('error');
    }
  }, [session?.user, onConnect, onDisconnect, onError, onEvent, autoReconnect, reconnectDelay, disconnect]);

  useEffect(() => {
    if (session?.user) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [session?.user, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  const sendEvent = useCallback(async (eventType: string, data: Record<string, unknown>) => {
    try {
      const response = await fetch('/api/events/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: eventType,
          data,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send event');
      }
    } catch (error) {
      console.error('Error sending event:', error);
      throw error;
    }
  }, []);

  return {
    isConnected,
    connectionState,
    lastEvent,
    connect,
    disconnect,
    sendEvent,
  };
}