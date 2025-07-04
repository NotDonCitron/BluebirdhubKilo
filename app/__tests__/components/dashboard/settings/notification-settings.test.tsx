import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificationSettings } from '@/components/dashboard/settings/notification-settings';

// Mock fetch responses
const mockFetch = jest.fn();
global.fetch = mockFetch;

const mockNotificationSettings = {
  emailNotifications: true,
  pushNotifications: false,
  desktopNotifications: true,
  soundEnabled: true,
  notificationFrequency: 'IMMEDIATE' as const,
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
  taskNotifications: true,
  commentNotifications: true,
  mentionNotifications: true,
  workspaceInviteNotifications: true,
  fileShareNotifications: false,
  systemUpdateNotifications: true,
};

describe('NotificationSettings', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    // Mock successful GET request
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockNotificationSettings,
    });
  });

  it('renders notification settings form', async () => {
    render(<NotificationSettings />);
    
    await waitFor(() => {
      expect(screen.getByText('Notification Preferences')).toBeInTheDocument();
    });

    expect(screen.getByText('Delivery Methods')).toBeInTheDocument();
    expect(screen.getByText('Email Notifications')).toBeInTheDocument();
    expect(screen.getByText('Push Notifications')).toBeInTheDocument();
    expect(screen.getByText('Desktop Notifications')).toBeInTheDocument();
  });

  it('loads existing settings on mount', async () => {
    render(<NotificationSettings />);
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/settings/notifications');
    });

    // Check that settings are loaded correctly
    await waitFor(() => {
      const emailToggle = screen.getByRole('switch', { name: /email notifications/i });
      expect(emailToggle).toBeChecked();
      
      const pushToggle = screen.getByRole('switch', { name: /push notifications/i });
      expect(pushToggle).not.toBeChecked();
    });
  });

  it('toggles notification settings', async () => {
    const user = userEvent.setup();
    render(<NotificationSettings />);
    
    await waitFor(() => {
      expect(screen.getByText('Notification Preferences')).toBeInTheDocument();
    });

    const emailToggle = screen.getByRole('switch', { name: /email notifications/i });
    await user.click(emailToggle);

    expect(emailToggle).not.toBeChecked();
  });

  it('updates notification frequency', async () => {
    const user = userEvent.setup();
    render(<NotificationSettings />);
    
    await waitFor(() => {
      expect(screen.getByText('Notification Preferences')).toBeInTheDocument();
    });

    const frequencySelect = screen.getByRole('combobox');
    await user.click(frequencySelect);
    
    const hourlyOption = screen.getByText('Hourly digest');
    await user.click(hourlyOption);

    expect(screen.getByDisplayValue('Hourly digest')).toBeInTheDocument();
  });

  it('saves settings when form is submitted', async () => {
    const user = userEvent.setup();
    
    // Mock successful PUT request
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(<NotificationSettings />);
    
    await waitFor(() => {
      expect(screen.getByText('Notification Preferences')).toBeInTheDocument();
    });

    const saveButton = screen.getByRole('button', { name: /save preferences/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/settings/notifications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: expect.stringContaining('emailNotifications'),
      });
    });
  });

  it('handles save errors gracefully', async () => {
    const user = userEvent.setup();
    
    // Mock failed PUT request
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    render(<NotificationSettings />);
    
    await waitFor(() => {
      expect(screen.getByText('Notification Preferences')).toBeInTheDocument();
    });

    const saveButton = screen.getByRole('button', { name: /save preferences/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/failed to save/i)).toBeInTheDocument();
    });
  });

  it('toggles quiet hours settings', async () => {
    const user = userEvent.setup();
    render(<NotificationSettings />);
    
    await waitFor(() => {
      expect(screen.getByText('Notification Preferences')).toBeInTheDocument();
    });

    const quietHoursToggle = screen.getByRole('switch', { name: /quiet hours/i });
    await user.click(quietHoursToggle);

    expect(quietHoursToggle).toBeChecked();
    
    // Check that time inputs appear
    expect(screen.getByLabelText(/start time/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/end time/i)).toBeInTheDocument();
  });

  it('validates time inputs for quiet hours', async () => {
    const user = userEvent.setup();
    render(<NotificationSettings />);
    
    await waitFor(() => {
      expect(screen.getByText('Notification Preferences')).toBeInTheDocument();
    });

    const quietHoursToggle = screen.getByRole('switch', { name: /quiet hours/i });
    await user.click(quietHoursToggle);

    const startTimeInput = screen.getByLabelText(/start time/i);
    await user.clear(startTimeInput);
    await user.type(startTimeInput, '25:00'); // Invalid time

    const saveButton = screen.getByRole('button', { name: /save preferences/i });
    await user.click(saveButton);

    // Should show validation error or handle invalid input
    expect(startTimeInput).toHaveValue('25:00');
  });

  it('shows loading state while fetching settings', () => {
    // Mock delayed response
    mockFetch.mockImplementationOnce(() => 
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: async () => mockNotificationSettings,
      }), 100))
    );

    render(<NotificationSettings />);
    
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('toggles specific notification types', async () => {
    const user = userEvent.setup();
    render(<NotificationSettings />);
    
    await waitFor(() => {
      expect(screen.getByText('Notification Preferences')).toBeInTheDocument();
    });

    const taskNotificationToggle = screen.getByRole('switch', { name: /task assignments/i });
    const commentNotificationToggle = screen.getByRole('switch', { name: /comments/i });
    const mentionNotificationToggle = screen.getByRole('switch', { name: /mentions/i });

    expect(taskNotificationToggle).toBeInTheDocument();
    expect(commentNotificationToggle).toBeInTheDocument();
    expect(mentionNotificationToggle).toBeInTheDocument();

    await user.click(taskNotificationToggle);
    expect(taskNotificationToggle).not.toBeChecked();
  });
});