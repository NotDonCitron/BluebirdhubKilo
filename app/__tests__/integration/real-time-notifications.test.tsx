import React from 'react';
import { render, screen, waitFor, act, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RealTimeProvider } from '@/components/providers/real-time-provider';
import { TestRealTime } from '@/components/dashboard/test-real-time';
import { useSession } from 'next-auth/react';


jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({
    data: { user: { id: '1', name: 'Test User' } },
    status: 'authenticated'
  })),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}));

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

// Mock fetch
global.fetch = jest.fn();

// Mock Audio and Notification APIs
global.Audio = jest.fn().mockImplementation(() => ({
  play: jest.fn().mockResolvedValue(undefined),
  pause: jest.fn(),
  load: jest.fn(),
})) as any;

global.Notification = jest.fn() as any;
Object.defineProperty(global.Notification, 'permission', {
  value: 'granted',
  writable: true,
  configurable: true
});
global.Notification.requestPermission = jest.fn().mockResolvedValue('granted');

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
  fileShareNotifications: true,
  systemUpdateNotifications: true,
  soundEnabled: true,
  desktopNotifications: true,
};

describe('Real-time Notifications Integration', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSession.mockReturnValue({
      data: mockSession,
      status: 'authenticated',
    } as any);

    // Mock notification settings fetch
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockNotificationSettings,
      })
      .mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, message: 'Test event triggered' }),
      });
  });

  it('integrates real-time provider with test component', async () => {
    render(
      <RealTimeProvider>
        <TestRealTime />
      </RealTimeProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Connected')).toBeInTheDocument();
    });

    expect(screen.getByText('Real-time Events Test')).toBeInTheDocument();
    expect(global.EventSource).toHaveBeenCalledWith('/api/events/stream');
  });

  it('triggers and handles real-time events end-to-end', async () => {
    const mockToast = require('react-hot-toast').toast;
    const user = userEvent.setup();

    render(
      <RealTimeProvider>
        <TestRealTime />
      </RealTimeProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Connected')).toBeInTheDocument();
    });

    // Trigger a test event
    const triggerButton = screen.getByRole('button', { name: /trigger test event/i });
    await user.click(triggerButton);

    // Verify API call was made
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/test-events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ eventType: 'task_assigned' }),
      });
    });

    // Simulate receiving the event through SSE
    const messageHandler = mockEventSource.addEventListener.mock.calls.find(
      call => call[0] === 'message'
    )?.[1];

    act(() => {
      messageHandler?.({
        data: JSON.stringify({
          type: 'task_assigned',
          data: {
            message: 'New task assigned to you',
            taskTitle: 'Complete integration tests',
            senderName: 'Test User',
            workspaceName: 'Test Workspace',
          },
        }),
      });
    });

    // Verify notification was shown
    expect(mockToast.custom).toHaveBeenCalled();
    expect(mockToast.success).toHaveBeenCalledWith('Test task_assigned event triggered!');
  });

  it('handles different event types with proper notifications', async () => {
    const mockToast = require('react-hot-toast').toast;
    const user = userEvent.setup();

    render(
      <RealTimeProvider>
        <TestRealTime />
      </RealTimeProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Connected')).toBeInTheDocument();
    });

    // Get message handler
    const messageHandler = mockEventSource.addEventListener.mock.calls.find(
      call => call[0] === 'message'
    )?.[1];

    // Test different event types
    const eventTypes = [
      {
        type: 'task_assigned',
        data: { message: 'Task assigned', taskTitle: 'Test Task' },
      },
      {
        type: 'comment_added',
        data: { message: 'New comment', entityTitle: 'Test Entity' },
      },
      {
        type: 'mention',
        data: { message: 'You were mentioned', senderName: 'John Doe' },
      },
      {
        type: 'workspace_invite',
        data: { message: 'Workspace invitation', workspaceName: 'New Workspace' },
      },
      {
        type: 'file_shared',
        data: { message: 'File shared', fileName: 'document.pdf' },
      },
    ];

    for (const event of eventTypes) {
      act(() => {
        messageHandler?.({
          data: JSON.stringify(event),
        });
      });

      expect(mockToast.custom).toHaveBeenCalled();
    }
  });

  it('respects notification settings for different event types', async () => {
    const mockToast = require('react-hot-toast').toast;

    // Mock settings with some notifications disabled
    (global.fetch as jest.Mock).mockReset();
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...mockNotificationSettings,
          taskNotifications: false,
          fileShareNotifications: false,
        }),
      })
      .mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

    render(
      <RealTimeProvider>
        <TestRealTime />
      </RealTimeProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Connected')).toBeInTheDocument();
    });

    const messageHandler = mockEventSource.addEventListener.mock.calls.find(
      call => call[0] === 'message'
    )?.[1];

    // Test disabled notification type (should not show)
    act(() => {
      messageHandler?.({
        data: JSON.stringify({
          type: 'task_assigned',
          data: { message: 'Task assigned' },
        }),
      });
    });

    expect(mockToast.custom).not.toHaveBeenCalled();

    // Test enabled notification type (should show)
    act(() => {
      messageHandler?.({
        data: JSON.stringify({
          type: 'comment_added',
          data: { message: 'New comment' },
        }),
      });
    });

    expect(mockToast.custom).toHaveBeenCalled();
  });

  it('handles connection state changes', async () => {
    render(
      <RealTimeProvider>
        <TestRealTime />
      </RealTimeProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Connected')).toBeInTheDocument();
    });

    // Simulate connection error
    const errorHandler = mockEventSource.addEventListener.mock.calls.find(
      call => call[0] === 'error'
    )?.[1];

    act(() => {
      errorHandler?.({ type: 'error' });
    });

    await waitFor(() => {
      expect(screen.getByText('Disconnected')).toBeInTheDocument();
    });

    // Button should be disabled when disconnected
    const triggerButton = screen.getByRole('button', { name: /trigger test event/i });
    expect(triggerButton).toBeDisabled();
  });

  it('plays sound notifications when enabled', async () => {
    const mockPlay = jest.fn().mockResolvedValue(undefined);
    global.Audio = jest.fn().mockImplementation(() => ({
      play: mockPlay,
      pause: jest.fn(),
      load: jest.fn(),
    })) as any;

    render(
      <RealTimeProvider>
        <TestRealTime />
      </RealTimeProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Connected')).toBeInTheDocument();
    });

    const messageHandler = mockEventSource.addEventListener.mock.calls.find(
      call => call[0] === 'message'
    )?.[1];

    act(() => {
      messageHandler?.({
        data: JSON.stringify({
          type: 'task_assigned',
          data: { message: 'Task assigned' },
        }),
      });
    });

    await waitFor(() => {
      expect(mockPlay).toHaveBeenCalled();
    });
  });

  it('shows desktop notifications when enabled', async () => {
    const mockNotificationConstructor = jest.fn();
    global.Notification = mockNotificationConstructor as any;
    Object.defineProperty(global.Notification, 'permission', {
      value: 'granted',
      writable: true,
      configurable: true
    });

    render(
      <RealTimeProvider>
        <TestRealTime />
      </RealTimeProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Connected')).toBeInTheDocument();
    });

    const messageHandler = mockEventSource.addEventListener.mock.calls.find(
      call => call[0] === 'message'
    )?.[1];

    act(() => {
      messageHandler?.({
        data: JSON.stringify({
          type: 'task_assigned',
          data: {
            message: 'New task assigned',
            taskTitle: 'Test Task',
          },
        }),
      });
    });

    expect(mockNotificationConstructor).toHaveBeenCalledWith(
      'BlueBirdHub',
      expect.objectContaining({
        body: 'New task assigned',
        icon: '/favicon.ico',
      })
    );
  });

  it('handles malformed SSE messages gracefully', async () => {
    render(
      <RealTimeProvider>
        <TestRealTime />
      </RealTimeProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Connected')).toBeInTheDocument();
    });

    const messageHandler = mockEventSource.addEventListener.mock.calls.find(
      call => call[0] === 'message'
    )?.[1];

    // Send malformed JSON
    act(() => {
      messageHandler?.({
        data: 'invalid json',
      });
    });

    // Should not crash and connection should remain
    expect(screen.getByText('Connected')).toBeInTheDocument();
  });

  it('handles network failures during event triggering', async () => {
    const mockToast = require('react-hot-toast').toast;
    const user = userEvent.setup();

    // Mock network failure for test events API
    (global.fetch as jest.Mock).mockReset();
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockNotificationSettings,
      })
      .mockRejectedValue(new Error('Network error'));

    render(
      <RealTimeProvider>
        <TestRealTime />
      </RealTimeProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Connected')).toBeInTheDocument();
    });

    const triggerButton = screen.getByRole('button', { name: /trigger test event/i });
    await user.click(triggerButton);

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Failed to trigger test event');
    });
  });

  it('maintains state across component re-renders', async () => {
    const { rerender } = render(
      <RealTimeProvider>
        <TestRealTime />
      </RealTimeProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Connected')).toBeInTheDocument();
    });

    // Re-render the component
    rerender(
      <RealTimeProvider>
        <TestRealTime />
      </RealTimeProvider>
    );

    // Should maintain connection state
    expect(screen.getByText('Connected')).toBeInTheDocument();
  });
});