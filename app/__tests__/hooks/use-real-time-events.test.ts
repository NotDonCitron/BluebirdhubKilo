import { renderHook, act } from '@testing-library/react';
import { useRealTimeEvents } from '@/hooks/use-real-time-events';

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

describe('useRealTimeEvents', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEventSource.readyState = 1; // OPEN state
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('initializes EventSource connection', () => {
    renderHook(() => useRealTimeEvents());

    expect(global.EventSource).toHaveBeenCalledWith('/api/events/stream');
    expect(mockEventSource.addEventListener).toHaveBeenCalledWith('message', expect.any(Function));
    expect(mockEventSource.addEventListener).toHaveBeenCalledWith('error', expect.any(Function));
    expect(mockEventSource.addEventListener).toHaveBeenCalledWith('open', expect.any(Function));
  });

  it('returns correct initial state', () => {
    const { result } = renderHook(() => useRealTimeEvents());

    expect(result.current.isConnected).toBe(true);
    expect(result.current.connectionState).toBe('connected');
    expect(result.current.lastMessage).toBe(null);
    expect(result.current.error).toBe(null);
  });

  it('handles connection state changes', () => {
    const { result } = renderHook(() => useRealTimeEvents());

    // Simulate connection opening
    act(() => {
      const openHandler = mockEventSource.addEventListener.mock.calls.find(
        call => call[0] === 'open'
      )?.[1];
      openHandler?.();
    });

    expect(result.current.isConnected).toBe(true);
    expect(result.current.connectionState).toBe('connected');
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

  it('handles malformed JSON messages', () => {
    const { result } = renderHook(() => useRealTimeEvents());

    act(() => {
      const messageHandler = mockEventSource.addEventListener.mock.calls.find(
        call => call[0] === 'message'
      )?.[1];
      
      const mockEvent = {
        data: 'invalid json',
      };
      
      messageHandler?.(mockEvent);
    });

    expect(result.current.lastMessage).toBe(null);
    expect(result.current.error).toContain('Failed to parse message');
  });

  it('calls event handlers when provided', () => {
    const onMessage = jest.fn();
    const onError = jest.fn();
    const onConnectionChange = jest.fn();

    renderHook(() => useRealTimeEvents({
      onMessage,
      onError,
      onConnectionChange,
    }));

    const testMessage = {
      type: 'test',
      data: { message: 'Test' },
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

    expect(onMessage).toHaveBeenCalledWith(testMessage);
  });

  it('handles connection errors', () => {
    const onError = jest.fn();
    const { result } = renderHook(() => useRealTimeEvents({ onError }));

    act(() => {
      const errorHandler = mockEventSource.addEventListener.mock.calls.find(
        call => call[0] === 'error'
      )?.[1];
      
      const mockErrorEvent = {
        type: 'error',
        message: 'Connection failed',
      };
      
      errorHandler?.(mockErrorEvent);
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.connectionState).toBe('error');
    expect(onError).toHaveBeenCalled();
  });

  it('attempts to reconnect on connection loss', () => {
    jest.useFakeTimers();
    
    renderHook(() => useRealTimeEvents({ reconnect: true, reconnectInterval: 1000 }));

    // Simulate connection error
    act(() => {
      const errorHandler = mockEventSource.addEventListener.mock.calls.find(
        call => call[0] === 'error'
      )?.[1];
      
      errorHandler?.({ type: 'error' });
    });

    // Fast-forward time to trigger reconnection
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    // Should create a new EventSource
    expect(global.EventSource).toHaveBeenCalledTimes(2);
  });

  it('does not reconnect when disabled', () => {
    jest.useFakeTimers();
    
    renderHook(() => useRealTimeEvents({ reconnect: false }));

    // Simulate connection error
    act(() => {
      const errorHandler = mockEventSource.addEventListener.mock.calls.find(
        call => call[0] === 'error'
      )?.[1];
      
      errorHandler?.({ type: 'error' });
    });

    // Fast-forward time
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    // Should not create a new EventSource
    expect(global.EventSource).toHaveBeenCalledTimes(1);
  });

  it('cleans up on unmount', () => {
    const { unmount } = renderHook(() => useRealTimeEvents());

    unmount();

    expect(mockEventSource.close).toHaveBeenCalled();
  });

  it('filters messages by type when specified', () => {
    const onMessage = jest.fn();
    
    renderHook(() => useRealTimeEvents({
      onMessage,
      eventTypes: ['task_assigned', 'comment_added'],
    }));

    // Send a filtered message type
    act(() => {
      const messageHandler = mockEventSource.addEventListener.mock.calls.find(
        call => call[0] === 'message'
      )?.[1];
      
      const mockEvent = {
        data: JSON.stringify({
          type: 'task_assigned',
          data: { message: 'Test' },
        }),
      };
      
      messageHandler?.(mockEvent);
    });

    expect(onMessage).toHaveBeenCalledTimes(1);

    // Send a non-filtered message type
    act(() => {
      const messageHandler = mockEventSource.addEventListener.mock.calls.find(
        call => call[0] === 'message'
      )?.[1];
      
      const mockEvent = {
        data: JSON.stringify({
          type: 'system_update',
          data: { message: 'Test' },
        }),
      };
      
      messageHandler?.(mockEvent);
    });

    // Should still be called only once (filtered out)
    expect(onMessage).toHaveBeenCalledTimes(1);
  });

  it('handles connection state transitions correctly', () => {
    const onConnectionChange = jest.fn();
    const { result } = renderHook(() => useRealTimeEvents({ onConnectionChange }));

    // Start with connecting state
    mockEventSource.readyState = 0; // CONNECTING

    // Simulate connection opening
    act(() => {
      mockEventSource.readyState = 1; // OPEN
      const openHandler = mockEventSource.addEventListener.mock.calls.find(
        call => call[0] === 'open'
      )?.[1];
      openHandler?.();
    });

    expect(result.current.connectionState).toBe('connected');
    expect(onConnectionChange).toHaveBeenCalledWith(true);

    // Simulate connection closing
    act(() => {
      mockEventSource.readyState = 2; // CLOSED
      const errorHandler = mockEventSource.addEventListener.mock.calls.find(
        call => call[0] === 'error'
      )?.[1];
      errorHandler?.({ type: 'error' });
    });

    expect(result.current.connectionState).toBe('error');
    expect(onConnectionChange).toHaveBeenCalledWith(false);
  });
});