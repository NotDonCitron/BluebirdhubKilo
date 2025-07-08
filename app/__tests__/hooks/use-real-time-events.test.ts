import { renderHook, act, waitFor } from '@testing-library/react';
import { useRealTimeEvents } from '@/hooks/use-real-time-events';
import '@testing-library/jest-dom';

describe('useRealTimeEvents', () => {
  let mockEventSource: any;

  const getMockEventSource = async () => {
    await waitFor(() => {
      expect(global.EventSource).toHaveBeenCalled();
    });
    
    const results = (global.EventSource as jest.MockedClass<typeof EventSource>).mock.results;
    mockEventSource = results[results.length - 1]?.value;
    expect(mockEventSource).toBeDefined();
    
    // Ensure the connection opens immediately for tests
    if (mockEventSource && mockEventSource.simulateOpen) {
      act(() => {
        mockEventSource.simulateOpen();
      });
    }
    
    return mockEventSource;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mockEventSource for each test
    mockEventSource = null;
  });

  it('initializes EventSource connection', async () => {
    const { result } = renderHook(() => useRealTimeEvents());

    await waitFor(() => {
      expect(global.EventSource).toHaveBeenCalledWith('/api/events/stream');
    });

    // Get the created instance
    mockEventSource = (global.EventSource as jest.MockedClass<typeof EventSource>).mock.results[0]?.value;
    
    // Log for debugging
    console.log('Mock created:', mockEventSource);
    console.log('Connection state:', result.current.connectionState);
    console.log('Is connected:', result.current.isConnected);
  });

  it('returns correct initial state after connection', async () => {
    const { result } = renderHook(() => useRealTimeEvents());

    // Wait for EventSource to be created and connection state to be connecting
    await waitFor(() => {
      expect(global.EventSource).toHaveBeenCalled();
      expect(result.current.connectionState).toBe('connecting');
    });

    // The mock should auto-open after a short delay, wait for that
    await waitFor(() => {
      expect(result.current.connectionState).toBe('connected');
    }, { timeout: 3000 });

    expect(result.current.isConnected).toBe(true);
    expect(result.current.lastEvent).toBe(null);
  });

  it('handles connection state changes', async () => {
    const onConnect = jest.fn();
    const { result } = renderHook(() => useRealTimeEvents({ onConnect }));

    // Get the created instance
    await getMockEventSource();

    // Wait for connection
    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
      expect(result.current.connectionState).toBe('connected');
    });

    expect(onConnect).toHaveBeenCalled();
  });

  it('handles incoming messages', async () => {
    const onEvent = jest.fn();
    const { result } = renderHook(() => useRealTimeEvents({ onEvent }));

    // Get the created instance
    await getMockEventSource();

    // Wait for connection
    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    const testMessage = {
      type: 'task_assigned',
      data: { message: 'Test message', taskId: '123' },
      timestamp: new Date().toISOString(),
    };

    act(() => {
      mockEventSource.simulateMessage(JSON.stringify(testMessage));
    });

    expect(result.current.lastEvent).toEqual(testMessage);
    expect(onEvent).toHaveBeenCalledWith(testMessage);
  });

  it('handles malformed JSON messages gracefully', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation();
    const { result } = renderHook(() => useRealTimeEvents());

    await getMockEventSource();

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    act(() => {
      mockEventSource.simulateMessage('invalid json');
    });

    expect(result.current.lastEvent).toBe(null);
    expect(consoleError).toHaveBeenCalledWith('Error parsing SSE event:', expect.any(Error));
    
    consoleError.mockRestore();
  });

  it('calls event handlers when provided', async () => {
    const onEvent = jest.fn();
    const { result } = renderHook(() => useRealTimeEvents({ onEvent }));

    await getMockEventSource();

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    const testMessage = {
      type: 'test',
      data: { message: 'Test' },
      timestamp: new Date().toISOString(),
    };

    act(() => {
      mockEventSource.simulateMessage(JSON.stringify(testMessage));
    });

    expect(result.current.lastEvent).toEqual(testMessage);
    expect(onEvent).toHaveBeenCalledWith(testMessage);
  });

  it('handles connection errors', async () => {
    const onError = jest.fn();
    const { result } = renderHook(() => useRealTimeEvents({ onError }));

    await getMockEventSource();

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    act(() => {
      mockEventSource.simulateError();
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.connectionState).toBe('error');
    expect(onError).toHaveBeenCalled();
  });

  it('attempts to reconnect on connection loss', async () => {
    jest.useFakeTimers();
    
    const { result } = renderHook(() => useRealTimeEvents({ reconnectDelay: 1000 }));

    await getMockEventSource();

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    // Simulate connection error
    act(() => {
      mockEventSource.simulateError();
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.connectionState).toBe('error');

    // Fast-forward time to trigger reconnection
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    // Should attempt to reconnect
    await waitFor(() => {
      expect(global.EventSource).toHaveBeenCalledTimes(2);
    });

    jest.useRealTimers();
  });

  it('does not reconnect when disabled', async () => {
    jest.useFakeTimers();
    
    const { result } = renderHook(() => useRealTimeEvents({ autoReconnect: false }));

    await getMockEventSource();

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    // Simulate connection error
    act(() => {
      mockEventSource.simulateError();
    });

    // Fast-forward time
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    // Should not create a new EventSource
    expect(global.EventSource).toHaveBeenCalledTimes(1);

    jest.useRealTimers();
  });

  it('cleans up on unmount', async () => {
    const { result, unmount } = renderHook(() => useRealTimeEvents());

    await getMockEventSource();

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    const closeSpy = jest.spyOn(mockEventSource, 'close');

    unmount();

    expect(closeSpy).toHaveBeenCalled();
  });

  it('filters messages by type when specified', async () => {
    const { result } = renderHook(() => useRealTimeEvents());

    await getMockEventSource();

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    // Send a message
    act(() => {
      mockEventSource.simulateMessage(JSON.stringify({
        type: 'task_assigned',
        data: { message: 'Test' },
        timestamp: new Date().toISOString(),
      }));
    });

    expect(result.current.lastEvent?.type).toBe('task_assigned');

    // Send another message type
    act(() => {
      mockEventSource.simulateMessage(JSON.stringify({
        type: 'system_update',
        data: { message: 'Test 2' },
        timestamp: new Date().toISOString(),
      }));
    });

    // Should update to the new message
    expect(result.current.lastEvent?.type).toBe('system_update');
  });

  it('handles connection state transitions correctly', async () => {
    const onConnect = jest.fn();
    const onDisconnect = jest.fn();
    const { result } = renderHook(() => useRealTimeEvents({ onConnect, onDisconnect }));

    // Should start connecting and then connect
    expect(result.current.connectionState).toBe('connecting');

    await getMockEventSource();

    await waitFor(() => {
      expect(result.current.connectionState).toBe('connected');
    });

    expect(onConnect).toHaveBeenCalled();

    // Simulate connection closing
    act(() => {
      mockEventSource.close();
    });

    await waitFor(() => {
      expect(result.current.connectionState).toBe('disconnected');
    });
    
    expect(onDisconnect).toHaveBeenCalled();
  });

  it('handles send event functionality', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    const { result } = renderHook(() => useRealTimeEvents());

    await getMockEventSource();

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    await act(async () => {
      await result.current.sendEvent('test_event', { data: 'test' });
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/events/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'test_event',
        data: { data: 'test' },
      }),
    });
  });

  it('does not connect when no session', () => {
    // Mock no session
    const mockUseSession = require('next-auth/react').useSession;
    mockUseSession.mockReturnValueOnce({
      data: null,
      status: 'unauthenticated',
    });

    renderHook(() => useRealTimeEvents());

    expect(global.EventSource).not.toHaveBeenCalled();
  });
});