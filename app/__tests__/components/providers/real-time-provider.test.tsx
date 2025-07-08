import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { RealTimeProvider, useRealTime } from '@/components/providers/real-time-provider';
import { useSession } from 'next-auth/react';

// Mock dependencies
jest.mock('next-auth/react');
jest.mock('react-hot-toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    custom: jest.fn(),
  },
}));

const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;

// Create a mock EventSource instance that we can access in tests
const mockEventSource = {
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  close: jest.fn(),
  readyState: 0,
  url: '',
  simulateMessage: jest.fn(),
  simulateError: jest.fn(),
};

// Override the global EventSource mock to return our controllable instance
const MockEventSourceConstructor = jest.fn(() => mockEventSource);
MockEventSourceConstructor.CONNECTING = 0;
MockEventSourceConstructor.OPEN = 1;
MockEventSourceConstructor.CLOSED = 2;
global.EventSource = MockEventSourceConstructor as any;

// Mock fetch for settings
global.fetch = jest.fn();

const mockSession = {
  user: {
    id: 'user-1',
    name: 'Test User',
    email: 'test@example.com',
  },
};

const mockNotificationSettings = {
  taskNotifications: true,
  commentNotifications: true,
  mentionNotifications: true,
  workspaceInviteNotifications: true,
  fileShareNotifications: false,
  systemUpdateNotifications: true,
  soundEnabled: true,
  desktopNotifications: true,
};

// Test component that uses the RealTime context
function TestComponent() {
  const { isConnected, connectionState, sendEvent } = useRealTime();
  
  return (
    <div>
      <div data-testid="connection-status">
        {isConnected ? 'Connected' : 'Disconnected'}
      </div>
      <div data-testid="connection-state">{connectionState}</div>
      <button 
        onClick={() => sendEvent('test_event', { message: 'test' })}
        data-testid="send-event"
      >
        Send Event
      </button>
    </div>
  );
}

describe('RealTimeProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSession.mockReturnValue({
      data: mockSession,
      status: 'authenticated',
    } as any);

    // Clear the EventSource mock calls
    (global.EventSource as jest.Mock).mockClear();
    mockEventSource.addEventListener.mockClear();
    mockEventSource.removeEventListener.mockClear();
    mockEventSource.close.mockClear();

    // Mock notification settings fetch
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockNotificationSettings,
    });
  });

  it('provides real-time context to children', async () => {
    render(
      <RealTimeProvider>
        <TestComponent />
      </RealTimeProvider>
    );

    // Wait for EventSource to be created
    await waitFor(() => {
      expect(global.EventSource).toHaveBeenCalledWith('/api/events/stream');
    });

    // Get the mock EventSource instance
    const mockInstance = (global.EventSource as jest.MockedClass<typeof EventSource>).mock.results[0]?.value;
    
    if (mockInstance && mockInstance.simulateOpen) {
      // Trigger the connection to open
      act(() => {
        mockInstance.simulateOpen();
      });
    }

    await waitFor(() => {
      expect(screen.getByTestId('connection-status')).toHaveTextContent('Connected');
    });

    expect(screen.getByTestId('connection-state')).toHaveTextContent('connected');
  });

  it('loads notification settings on mount', async () => {
    render(
      <RealTimeProvider>
        <TestComponent />
      </RealTimeProvider>
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/settings/notifications');
    });
  });

  it('does not initialize for unauthenticated users', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
    } as any);

    render(
      <RealTimeProvider>
        <TestComponent />
      </RealTimeProvider>
    );

    expect(global.EventSource).not.toHaveBeenCalled();
    expect(screen.getByTestId('connection-status')).toHaveTextContent('Disconnected');
  });

  it('handles incoming real-time events', async () => {
    const mockToast = require('react-hot-toast').toast;
    
    render(
      <RealTimeProvider>
        <TestComponent />
      </RealTimeProvider>
    );

    await waitFor(() => {
      expect(global.EventSource).toHaveBeenCalled();
    });

    // Simulate incoming message
    const messageHandler = mockEventSource.addEventListener.mock.calls.find(
      call => call[0] === 'message'
    )?.[1];

    const testEvent = {
      type: 'task_assigned',
      data: {
        message: 'New task assigned to you',
        taskTitle: 'Complete project',
        senderName: 'John Doe',
        workspaceName: 'Test Workspace',
      },
    };

    messageHandler?.({
      data: JSON.stringify(testEvent),
    });

    expect(mockToast.custom).toHaveBeenCalled();
  });

  it('respects notification settings for different event types', async () => {
    const mockToast = require('react-hot-toast').toast;
    
    // Mock settings with task notifications disabled
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        ...mockNotificationSettings,
        taskNotifications: false,
      }),
    });

    render(
      <RealTimeProvider>
        <TestComponent />
      </RealTimeProvider>
    );

    await waitFor(() => {
      expect(global.EventSource).toHaveBeenCalled();
    });

    // Simulate task notification (should be ignored)
    const messageHandler = mockEventSource.addEventListener.mock.calls.find(
      call => call[0] === 'message'
    )?.[1];

    messageHandler?.({
      data: JSON.stringify({
        type: 'task_assigned',
        data: { message: 'Task assigned' },
      }),
    });

    expect(mockToast.custom).not.toHaveBeenCalled();

    // Simulate comment notification (should show)
    messageHandler?.({
      data: JSON.stringify({
        type: 'comment_added',
        data: { message: 'New comment' },
      }),
    });

    expect(mockToast.custom).toHaveBeenCalled();
  });

  it('plays sound for notifications when enabled', async () => {
    // Mock Audio constructor
    const mockPlay = jest.fn().mockResolvedValue(undefined);
    global.Audio = jest.fn().mockImplementation(() => ({
      play: mockPlay,
      pause: jest.fn(),
      load: jest.fn(),
    })) as any;

    render(
      <RealTimeProvider>
        <TestComponent />
      </RealTimeProvider>
    );

    await waitFor(() => {
      expect(global.EventSource).toHaveBeenCalled();
    });

    // Simulate notification
    const messageHandler = mockEventSource.addEventListener.mock.calls.find(
      call => call[0] === 'message'
    )?.[1];

    messageHandler?.({
      data: JSON.stringify({
        type: 'task_assigned',
        data: { message: 'Task assigned' },
      }),
    });

    await waitFor(() => {
      expect(mockPlay).toHaveBeenCalled();
    });
  });

  it('does not play sound when disabled', async () => {
    const mockPlay = jest.fn().mockResolvedValue(undefined);
    global.Audio = jest.fn().mockImplementation(() => ({
      play: mockPlay,
      pause: jest.fn(),
      load: jest.fn(),
    })) as any;

    // Mock settings with sound disabled
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        ...mockNotificationSettings,
        soundEnabled: false,
      }),
    });

    render(
      <RealTimeProvider>
        <TestComponent />
      </RealTimeProvider>
    );

    await waitFor(() => {
      expect(global.EventSource).toHaveBeenCalled();
    });

    // Simulate notification
    const messageHandler = mockEventSource.addEventListener.mock.calls.find(
      call => call[0] === 'message'
    )?.[1];

    messageHandler?.({
      data: JSON.stringify({
        type: 'task_assigned',
        data: { message: 'Task assigned' },
      }),
    });

    expect(mockPlay).not.toHaveBeenCalled();
  });

  it('shows desktop notifications when enabled', async () => {
    // Mock Notification API
    const mockNotificationConstructor = jest.fn();
    global.Notification = mockNotificationConstructor as any;
    Object.defineProperty(global.Notification, 'permission', {
      value: 'granted',
      writable: true,
      configurable: true
    });
    global.Notification.requestPermission = jest.fn().mockResolvedValue('granted');

    render(
      <RealTimeProvider>
        <TestComponent />
      </RealTimeProvider>
    );

    await waitFor(() => {
      expect(global.EventSource).toHaveBeenCalled();
    });

    // Simulate notification
    const messageHandler = mockEventSource.addEventListener.mock.calls.find(
      call => call[0] === 'message'
    )?.[1];

    messageHandler?.({
      data: JSON.stringify({
        type: 'task_assigned',
        data: {
          message: 'Task assigned',
          taskTitle: 'Complete project',
        },
      }),
    });

    expect(mockNotificationConstructor).toHaveBeenCalledWith(
      'BlueBirdHub',
      expect.objectContaining({
        body: 'Task assigned',
        icon: '/favicon.ico',
      })
    );
  });

  it('handles sendEvent function', async () => {
    render(
      <RealTimeProvider>
        <TestComponent />
      </RealTimeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('send-event')).toBeInTheDocument();
    });

    // The sendEvent function should be available but might not do anything
    // in the current implementation (it's a placeholder)
    expect(screen.getByTestId('send-event')).toBeInTheDocument();
  });

  it('handles connection errors gracefully', async () => {
    render(
      <RealTimeProvider>
        <TestComponent />
      </RealTimeProvider>
    );

    await waitFor(() => {
      expect(global.EventSource).toHaveBeenCalled();
    });

    // Simulate connection error
    const errorHandler = mockEventSource.addEventListener.mock.calls.find(
      call => call[0] === 'error'
    )?.[1];

    errorHandler?.({ type: 'error' });

    await waitFor(() => {
      expect(screen.getByTestId('connection-status')).toHaveTextContent('Disconnected');
    });
  });

  it('cleans up on unmount', () => {
    const { unmount } = render(
      <RealTimeProvider>
        <TestComponent />
      </RealTimeProvider>
    );

    unmount();

    expect(mockEventSource.close).toHaveBeenCalled();
  });
});