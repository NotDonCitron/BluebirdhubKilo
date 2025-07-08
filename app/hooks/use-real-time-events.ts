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

  // Use refs for callbacks to avoid dependency issues
  const onEventRef = useRef(onEvent);
  const onConnectRef = useRef(onConnect);
  const onDisconnectRef = useRef(onDisconnect);
  const onErrorRef = useRef(onError);

  // Update refs when callbacks change
  useEffect(() => {
    onEventRef.current = onEvent;
    onConnectRef.current = onConnect;
    onDisconnectRef.current = onDisconnect;
    onErrorRef.current = onError;
  });

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

    // Close existing connection first
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    setConnectionState('connecting');

    try {
      const eventSource = new EventSource('/api/events/stream');
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setIsConnected(true);
        setConnectionState('connected');
        onConnectRef.current?.();
      };

      eventSource.onmessage = (event) => {
        try {
          const parsedEvent: RealTimeEvent = JSON.parse(event.data);
          setLastEvent(parsedEvent);
          onEventRef.current?.(parsedEvent);
        } catch (error) {
          console.error('Error parsing SSE event:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error('SSE connection error:', error);
        setIsConnected(false);
        setConnectionState('error');
        onErrorRef.current?.(error);

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
        onDisconnectRef.current?.();
      });

    } catch (error) {
      console.error('Error creating EventSource:', error);
      setConnectionState('error');
    }
  }, [session?.user, autoReconnect, reconnectDelay]);

  useEffect(() => {
    if (!session?.user) {
      // Disconnect if no user
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
      return;
    }

    // Connect logic directly in effect
    // Close existing connection first
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    setConnectionState('connecting');

    try {
      const eventSource = new EventSource('/api/events/stream');
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setIsConnected(true);
        setConnectionState('connected');
        onConnectRef.current?.();
      };

      eventSource.onmessage = (event) => {
        try {
          const parsedEvent: RealTimeEvent = JSON.parse(event.data);
          setLastEvent(parsedEvent);
          onEventRef.current?.(parsedEvent);
        } catch (error) {
          console.error('Error parsing SSE event:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error('SSE connection error:', error);
        setIsConnected(false);
        setConnectionState('error');
        onErrorRef.current?.(error);

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
        onDisconnectRef.current?.();
      });

    } catch (error) {
      console.error('Error creating EventSource:', error);
      setConnectionState('error');
    }

    // Cleanup on unmount or session change
    return () => {
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
    };
  }, [session?.user, autoReconnect, reconnectDelay, connect]);

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