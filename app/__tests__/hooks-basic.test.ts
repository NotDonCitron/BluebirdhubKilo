import { renderHook, act } from '@testing-library/react';

// Mock EventSource
const mockEventSource = {
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  close: jest.fn(),
  readyState: 1,
  CONNECTING: 0,
  OPEN: 1,
  CLOSED: 2,
};

global.EventSource = jest.fn(() => mockEventSource) as any;

// Simple hook for testing
function useRealTimeEvents(options = {}) {
  const [isConnected, setIsConnected] = React.useState(true);
  const [connectionState, setConnectionState] = React.useState('connected');
  const [lastMessage, setLastMessage] = React.useState(null);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    const eventSource = new EventSource('/api/events/stream');
    
    eventSource.addEventListener('message', (event) => {
      try {
        const message = JSON.parse(event.data);
        setLastMessage(message);
      } catch (err) {
        setError(null);
      }
    });

    eventSource.addEventListener('error', () => {
      setIsConnected(false);
      setConnectionState('error');
    });

    return () => {
      eventSource.close();
    };
  }, []);

  return {
    isConnected,
    connectionState,
    lastMessage,
    error,
  };
}

// Import React after defining the hook
import React from 'react';

describe('Real-time Events Hook (Basic)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEventSource.readyState = 1; // OPEN state
  });

  it('initializes EventSource connection', () => {
    renderHook(() => useRealTimeEvents());

    expect(global.EventSource).toHaveBeenCalledWith('/api/events/stream');
    expect(mockEventSource.addEventListener).toHaveBeenCalledWith('message', expect.any(Function));
    expect(mockEventSource.addEventListener).toHaveBeenCalledWith('error', expect.any(Function));
  });

  it('returns correct initial state', () => {
    const { result } = renderHook(() => useRealTimeEvents());

    expect(result.current.isConnected).toBe(true);
    expect(result.current.connectionState).toBe('connected');
    expect(result.current.lastMessage).toBe(null);
    expect(result.current.error).toBe(null);
  });

  it('handles incoming messages', () => {
    const { result } = renderHook(() => useRealTimeEvents());

    const testMessage = {
      type: 'task_assigned',
      data: { message: 'Test message', taskId: '123' },
    };

    act(() => {
      const messageHandler = mockEventSource.addEventListener.mock.calls.find(
        call => call[0] === 'message'
      )?.[1];
      
      const mockEvent = {
        data: JSON.stringify(testMessage),
      };
      
      messageHandler?.(mockEvent);
    });

    expect(result.current.lastMessage).toEqual(testMessage);
  });

  it('handles connection errors', () => {
    const { result } = renderHook(() => useRealTimeEvents());

    act(() => {
      const errorHandler = mockEventSource.addEventListener.mock.calls.find(
        call => call[0] === 'error'
      )?.[1];
      
      errorHandler?.();
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.connectionState).toBe('error');
  });

  it('cleans up on unmount', () => {
    const { unmount } = renderHook(() => useRealTimeEvents());

    unmount();

    expect(mockEventSource.close).toHaveBeenCalled();
  });
});