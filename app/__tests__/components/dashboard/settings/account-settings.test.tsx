import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AccountSettings } from '@/components/dashboard/settings/account-settings';

// Mock fetch responses
const mockFetch = jest.fn();
global.fetch = mockFetch;

const mockAccountData = {
  name: 'John Doe',
  email: 'john@example.com',
  avatar: null,
  twoFactorEnabled: false,
};

const mockActivityLogs = [
  {
    id: '1',
    action: 'login',
    details: 'User logged in',
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0...',
    createdAt: '2023-12-01T10:00:00Z',
  },
  {
    id: '2',
    action: 'settings_update',
    details: 'Updated privacy settings',
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0...',
    createdAt: '2023-12-01T09:30:00Z',
  },
];

const mockSessions = [
  {
    id: 'session1',
    device: 'Chrome on Windows',
    location: 'New York, US',
    lastActive: '2023-12-01T10:00:00Z',
    current: true,
  },
  {
    id: 'session2',
    device: 'Safari on iPhone',
    location: 'Boston, US',
    lastActive: '2023-11-30T15:00:00Z',
    current: false,
  },
];

describe('AccountSettings', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    
    // Mock initial data fetching
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockAccountData,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockActivityLogs,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockSessions,
      });
  });

  it('renders account settings form', async () => {
    render(<AccountSettings />);
    
    await waitFor(() => {
      expect(screen.getByText('Account Settings')).toBeInTheDocument();
    });

    expect(screen.getByText('Basic Information')).toBeInTheDocument();
    expect(screen.getByText('Security')).toBeInTheDocument();
    expect(screen.getByText('Activity Log')).toBeInTheDocument();
    expect(screen.getByText('Active Sessions')).toBeInTheDocument();
  });

  it('loads existing account data on mount', async () => {
    render(<AccountSettings />);
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/settings/account');
      expect(mockFetch).toHaveBeenCalledWith('/api/settings/activity-logs');
    });

    // Check that account data is loaded
    await waitFor(() => {
      expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
      expect(screen.getByDisplayValue('john@example.com')).toBeInTheDocument();
    });
  });

  it('updates basic account information', async () => {
    const user = userEvent.setup();
    
    // Mock successful update request
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(<AccountSettings />);
    
    await waitFor(() => {
      expect(screen.getByText('Account Settings')).toBeInTheDocument();
    });

    const nameInput = screen.getByDisplayValue('John Doe');
    await user.clear(nameInput);
    await user.type(nameInput, 'Jane Doe');

    const saveButton = screen.getByRole('button', { name: /save changes/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/settings/account', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: expect.stringContaining('Jane Doe'),
      });
    });
  });

  it('handles password change', async () => {
    const user = userEvent.setup();
    
    // Mock successful password change
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(<AccountSettings />);
    
    await waitFor(() => {
      expect(screen.getByText('Account Settings')).toBeInTheDocument();
    });

    const currentPasswordInput = screen.getByLabelText(/current password/i);
    const newPasswordInput = screen.getByLabelText(/new password/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

    await user.type(currentPasswordInput, 'oldpassword');
    await user.type(newPasswordInput, 'newpassword123');
    await user.type(confirmPasswordInput, 'newpassword123');

    const changePasswordButton = screen.getByRole('button', { name: /change password/i });
    await user.click(changePasswordButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/settings/security', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: expect.stringContaining('oldpassword'),
      });
    });
  });

  it('validates password confirmation', async () => {
    const user = userEvent.setup();
    render(<AccountSettings />);
    
    await waitFor(() => {
      expect(screen.getByText('Account Settings')).toBeInTheDocument();
    });

    const newPasswordInput = screen.getByLabelText(/new password/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

    await user.type(newPasswordInput, 'password123');
    await user.type(confirmPasswordInput, 'differentpassword');

    const changePasswordButton = screen.getByRole('button', { name: /change password/i });
    await user.click(changePasswordButton);

    expect(screen.getByText(/passwords don't match/i)).toBeInTheDocument();
  });

  it('toggles two-factor authentication', async () => {
    const user = userEvent.setup();
    
    // Mock 2FA setup request
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ qrCode: 'data:image/png;base64,...' }),
    });

    render(<AccountSettings />);
    
    await waitFor(() => {
      expect(screen.getByText('Account Settings')).toBeInTheDocument();
    });

    const twoFactorToggle = screen.getByRole('switch', { name: /two-factor authentication/i });
    await user.click(twoFactorToggle);

    expect(screen.getByText(/scan qr code/i)).toBeInTheDocument();
  });

  it('displays activity log', async () => {
    render(<AccountSettings />);
    
    await waitFor(() => {
      expect(screen.getByText('Activity Log')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('User logged in')).toBeInTheDocument();
      expect(screen.getByText('Updated privacy settings')).toBeInTheDocument();
    });
  });

  it('displays active sessions', async () => {
    render(<AccountSettings />);
    
    await waitFor(() => {
      expect(screen.getByText('Active Sessions')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('Chrome on Windows')).toBeInTheDocument();
      expect(screen.getByText('Safari on iPhone')).toBeInTheDocument();
      expect(screen.getByText('Current session')).toBeInTheDocument();
    });
  });

  it('terminates a session', async () => {
    const user = userEvent.setup();
    
    // Mock session termination
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(<AccountSettings />);
    
    await waitFor(() => {
      expect(screen.getByText('Active Sessions')).toBeInTheDocument();
    });

    const terminateButtons = screen.getAllByText('Terminate');
    const nonCurrentTerminateButton = terminateButtons.find(button => 
      !button.closest('div')?.textContent?.includes('Current session')
    );

    if (nonCurrentTerminateButton) {
      await user.click(nonCurrentTerminateButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/auth/sessions/session2', {
          method: 'DELETE',
        });
      });
    }
  });

  it('handles account deletion', async () => {
    const user = userEvent.setup();
    
    // Mock confirmation and deletion
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(<AccountSettings />);
    
    await waitFor(() => {
      expect(screen.getByText('Account Settings')).toBeInTheDocument();
    });

    const deleteButton = screen.getByRole('button', { name: /delete account/i });
    await user.click(deleteButton);

    expect(confirmSpy).toHaveBeenCalled();

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/settings/account', {
        method: 'DELETE',
      });
    });

    confirmSpy.mockRestore();
  });

  it('handles account deletion cancellation', async () => {
    const user = userEvent.setup();
    
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);

    render(<AccountSettings />);
    
    await waitFor(() => {
      expect(screen.getByText('Account Settings')).toBeInTheDocument();
    });

    const deleteButton = screen.getByRole('button', { name: /delete account/i });
    await user.click(deleteButton);

    expect(confirmSpy).toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalledWith('/api/settings/account', {
      method: 'DELETE',
    });

    confirmSpy.mockRestore();
  });

  it('shows loading states appropriately', async () => {
    // Mock delayed responses
    mockFetch.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: async () => ({}),
      }), 100))
    );

    render(<AccountSettings />);
    
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('handles API errors gracefully', async () => {
    mockFetch.mockReset();
    mockFetch.mockRejectedValue(new Error('Network error'));

    render(<AccountSettings />);
    
    await waitFor(() => {
      expect(screen.getByText(/error loading/i)).toBeInTheDocument();
    });
  });
});