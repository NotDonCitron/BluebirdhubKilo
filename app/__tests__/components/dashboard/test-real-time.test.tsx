import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TestRealTime } from '@/components/dashboard/test-real-time';
import { RealTimeProvider } from '@/components/providers/real-time-provider';
import { useSession } from 'next-auth/react';

// Mock dependencies
jest.mock('next-auth/react');
jest.mock('react-hot-toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock useRealTime hook
jest.mock('@/components/providers/real-time-provider', () => ({
  RealTimeProvider: ({ children }: { children: React.ReactNode }) => children,
  useRealTime: () => mockRealTimeContext,
}));

const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;
const mockSendEvent = jest.fn();

// Mock real-time context
const mockRealTimeContext = {
  isConnected: true,
  connectionState: 'connected' as const,
  lastEvent: null,
  connect: jest.fn(),
  disconnect: jest.fn(),
  sendEvent: mockSendEvent,
};

// Mock EventSource
const mockEventSource = {
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  close: jest.fn(),
  readyState: 1,
  CONNECTING: 0,
  OPEN: 1,
  CLOSED: 2,
  onopen: null,
  onmessage: null,
  onerror: null,
};

global.EventSource = jest.fn(() => mockEventSource) as any;

// Mock fetch
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
  fileShareNotifications: true,
  systemUpdateNotifications: true,
  soundEnabled: true,
  desktopNotifications: true,
};

describe('TestRealTime', () => {
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

  it('renders test component with all elements', async () => {
    render(
      <RealTimeProvider>
        <TestRealTime />
      </RealTimeProvider>
    );

    // Wait for EventSource to be created and set up
    await waitFor(() => {
      expect(global.EventSource).toHaveBeenCalled();
    });

    // Simulate EventSource connection established
    act(() => {
      if (mockEventSource.onopen) {
        const event = new Event('open') as any;
        mockEventSource.onopen(event);
      }
    });

    await waitFor(() => {
      expect(screen.getByText('Connected')).toBeInTheDocument();
    });

    expect(screen.getByText('Real-time Events Test')).toBeInTheDocument();
    expect(screen.getByText('Test real-time notifications and events system.')).toBeInTheDocument();
    expect(screen.getByText('Status: connected')).toBeInTheDocument();
    expect(screen.getByLabelText('Event Type')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /trigger test event/i })).toBeInTheDocument();
  });

  it('displays correct connection status when connected', () => {
    render(
      <RealTimeProvider>
        <TestRealTime />
      </RealTimeProvider>
    );

    const connectionBadge = screen.getByText('Connected');
    expect(connectionBadge).toBeInTheDocument();
    expect(screen.getByText('Status: connected')).toBeInTheDocument();
  });

  it('displays correct connection status when disconnected', () => {
    // Mock disconnected state
    const disconnectedContext = {
      ...mockRealTimeContext,
      isConnected: false,
      connectionState: 'error' as const,
    };
    
    jest.doMock('@/components/providers/real-time-provider', () => ({
      RealTimeProvider: ({ children }: { children: React.ReactNode }) => children,
      useRealTime: () => disconnectedContext,
    }));

    render(<TestRealTime />);

    const connectionBadge = screen.getByText('Disconnected');
    expect(connectionBadge).toBeInTheDocument();
    expect(screen.getByText('Status: error')).toBeInTheDocument();
  });

  it('allows selecting different event types', async () => {
    const user = userEvent.setup();
    render(
      <RealTimeProvider>
        <TestRealTime />
      </RealTimeProvider>
    );

    const eventTypeSelect = screen.getByRole('combobox');
    await user.click(eventTypeSelect);

    // Check that all event types are available
    expect(screen.getByText('Task Assigned')).toBeInTheDocument();
    expect(screen.getByText('Task Completed')).toBeInTheDocument();
    expect(screen.getByText('Comment Added')).toBeInTheDocument();
    expect(screen.getByText('Mention')).toBeInTheDocument();
    expect(screen.getByText('Workspace Invite')).toBeInTheDocument();
    expect(screen.getByText('File Shared')).toBeInTheDocument();
    expect(screen.getByText('System Update')).toBeInTheDocument();

    // Select a different event type
    await user.click(screen.getByText('Task Completed'));
    expect(screen.getByDisplayValue('Task Completed')).toBeInTheDocument();
  });

  it('triggers test event when button is clicked', async () => {
    const mockToast = require('react-hot-toast').toast;
    const user = userEvent.setup();
    
    render(
      <RealTimeProvider>
        <TestRealTime />
      </RealTimeProvider>
    );

    const triggerButton = screen.getByRole('button', { name: /trigger test event/i });
    await user.click(triggerButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/test-events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ eventType: 'task_assigned' }),
      });
    });

    expect(mockToast.success).toHaveBeenCalledWith('Test task_assigned event triggered!');
    expect(mockSendEvent).toHaveBeenCalledWith('task_assigned', {
      message: 'Test task_assigned event',
      source: 'test-button',
    });
  });

  it('triggers test event with selected event type', async () => {
    const user = userEvent.setup();
    render(
      <RealTimeProvider>
        <TestRealTime />
      </RealTimeProvider>
    );

    // Select different event type
    const eventTypeSelect = screen.getByRole('combobox');
    await user.click(eventTypeSelect);
    await user.click(screen.getByText('Comment Added'));

    const triggerButton = screen.getByRole('button', { name: /trigger test event/i });
    await user.click(triggerButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/test-events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ eventType: 'comment_added' }),
      });
    });

    expect(mockSendEvent).toHaveBeenCalledWith('comment_added', {
      message: 'Test comment_added event',
      source: 'test-button',
    });
  });

  it('shows loading state while triggering event', async () => {
    const user = userEvent.setup();
    
    // Mock delayed response
    (global.fetch as jest.Mock).mockImplementation(() =>
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: async () => ({ success: true }),
      }), 100))
    );

    render(
      <RealTimeProvider>
        <TestRealTime />
      </RealTimeProvider>
    );

    const triggerButton = screen.getByRole('button', { name: /trigger test event/i });
    await user.click(triggerButton);

    expect(screen.getByText('Triggering...')).toBeInTheDocument();
    expect(triggerButton).toBeDisabled();

    await waitFor(() => {
      expect(screen.getByText('Trigger Test Event')).toBeInTheDocument();
    });
  });

  it('disables button when not connected', () => {
    // Mock disconnected state
    const disconnectedContext = {
      ...mockRealTimeContext,
      isConnected: false,
      connectionState: 'error' as const,
    };
    
    jest.doMock('@/components/providers/real-time-provider', () => ({
      RealTimeProvider: ({ children }: { children: React.ReactNode }) => children,
      useRealTime: () => disconnectedContext,
    }));

    render(<TestRealTime />);

    const triggerButton = screen.getByRole('button', { name: /trigger test event/i });
    expect(triggerButton).toBeDisabled();
  });

  it('handles API errors gracefully', async () => {
    const mockToast = require('react-hot-toast').toast;
    const user = userEvent.setup();
    
    // Mock failed response
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
    });

    render(
      <RealTimeProvider>
        <TestRealTime />
      </RealTimeProvider>
    );

    const triggerButton = screen.getByRole('button', { name: /trigger test event/i });
    await user.click(triggerButton);

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Failed to trigger test event');
    });
  });

  it('handles network errors', async () => {
    const mockToast = require('react-hot-toast').toast;
    const user = userEvent.setup();
    
    // Mock network error
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    render(
      <RealTimeProvider>
        <TestRealTime />
      </RealTimeProvider>
    );

    const triggerButton = screen.getByRole('button', { name: /trigger test event/i });
    await user.click(triggerButton);

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Failed to trigger test event');
    });
  });

  it('handles sendEvent errors gracefully', async () => {
    const user = userEvent.setup();
    
    // Mock sendEvent to throw error
    mockSendEvent.mockRejectedValue(new Error('Send event failed'));

    render(
      <RealTimeProvider>
        <TestRealTime />
      </RealTimeProvider>
    );

    const triggerButton = screen.getByRole('button', { name: /trigger test event/i });
    await user.click(triggerButton);

    // Should still complete the API call even if sendEvent fails
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  it('displays helpful instructions', () => {
    render(
      <RealTimeProvider>
        <TestRealTime />
      </RealTimeProvider>
    );

    expect(screen.getByText('This will trigger a test notification based on your notification settings.')).toBeInTheDocument();
    expect(screen.getByText('Make sure notifications are enabled in Settings → Notifications.')).toBeInTheDocument();
  });

  it('shows connection status with proper icons', () => {
    render(
      <RealTimeProvider>
        <TestRealTime />
      </RealTimeProvider>
    );

    // Should show Wifi icon when connected
    const connectionBadge = screen.getByText('Connected').closest('.flex');
    expect(connectionBadge).toBeTruthy();
  });

  it('shows disconnected status with proper icons', () => {
    // Mock disconnected state
    const disconnectedContext = {
      ...mockRealTimeContext,
      isConnected: false,
      connectionState: 'disconnected' as const,
    };
    
    jest.doMock('@/components/providers/real-time-provider', () => ({
      RealTimeProvider: ({ children }: { children: React.ReactNode }) => children,
      useRealTime: () => disconnectedContext,
    }));

    render(<TestRealTime />);

    // Should show WifiOff icon when disconnected
    const connectionBadge = screen.getByText('Disconnected').closest('.flex');
    expect(connectionBadge).toBeTruthy();
  });

  it('maintains selected event type across re-renders', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <RealTimeProvider>
        <TestRealTime />
      </RealTimeProvider>
    );

    // Select different event type
    const eventTypeSelect = screen.getByRole('combobox');
    await user.click(eventTypeSelect);
    await user.click(screen.getByText('Mention'));

    // Re-render component
    rerender(
      <RealTimeProvider>
        <TestRealTime />
      </RealTimeProvider>
    );

    // Should maintain the selected value
    expect(screen.getByDisplayValue('Mention')).toBeInTheDocument();
  });
});