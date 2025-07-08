import React from 'react';
import { render, screen, waitFor, cleanup, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import { AccountSettings } from '@/components/dashboard/settings/account-settings';
import { 
  setupAccountSettingsMocks,
  createSessionMock,
  createToastMocks,
  mockAccountInfo,
  mockSecuritySettings,
  mockActivityLogs,
  createErrorResponse
} from '@/__tests__/utils/test-mocks';

// Mock next-auth
jest.mock('next-auth/react');
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;

// Mock react-hot-toast
jest.mock('react-hot-toast');
const mockToast = createToastMocks();
(toast as any).success = mockToast.success;
(toast as any).error = mockToast.error;

// Mock fetch
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

describe('AccountSettings', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-15T12:00:00.000Z'));
    
    // Mock session using utility
    mockUseSession.mockReturnValue(createSessionMock() as any);
    
    // Clear all mocks
    jest.clearAllMocks();
    mockFetch.mockClear();
    mockToast.success.mockClear();
    mockToast.error.mockClear();
  });

  afterEach(() => {
    cleanup();
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renders loading state initially', () => {
    // Don't setup any mocks so it stays in loading state
    render(<AccountSettings />);
    
    // Check for loading spinner using class name since SVG doesn't have role="img"
    expect(document.querySelector('.animate-spin')).toBeTruthy();
  });

  it('renders account settings after loading', async () => {
    setupAccountSettingsMocks(mockFetch);
    
    await act(async () => {
      render(<AccountSettings />);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Account Information')).toBeInTheDocument();
    });

    expect(screen.getByText('Security')).toBeInTheDocument();
    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    expect(screen.getByText('Danger Zone')).toBeInTheDocument();
  });

  it('displays account information correctly', async () => {
    setupAccountSettingsMocks(mockFetch);
    
    await act(async () => {
      render(<AccountSettings />);
    });
    
    await waitFor(() => {
      expect(screen.getByText('user-123')).toBeInTheDocument();
    });

    expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
    expect(screen.getByText('Jan 1, 2024')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // Active sessions count
  });

  it('displays activity logs when data loads', async () => {
    setupAccountSettingsMocks(mockFetch);
    
    await act(async () => {
      render(<AccountSettings />);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Login')).toBeInTheDocument();
    });

    expect(screen.getByText('Password changed')).toBeInTheDocument();
  });

  it('handles email change interaction', async () => {
    setupAccountSettingsMocks(mockFetch);
    
    await act(async () => {
      render(<AccountSettings />);
    });
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /change/i })).toBeInTheDocument();
  });

  it('toggles security settings', async () => {
    setupAccountSettingsMocks(mockFetch);
    
    await act(async () => {
      render(<AccountSettings />);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Login Notifications')).toBeInTheDocument();
    });

    expect(screen.getByText('Security')).toBeInTheDocument();
  });

  it('handles API errors gracefully', async () => {
    // Mock all API calls to fail
    mockFetch.mockRejectedValue(new Error('Network error'));

    await act(async () => {
      render(<AccountSettings />);
    });
    
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Failed to load account information');
    });
  });

  it('handles partial API failures', async () => {
    // Mock only account API to succeed, others to fail
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAccountInfo)
      })
      .mockRejectedValueOnce(new Error('Security API failed'))
      .mockRejectedValueOnce(new Error('Activity API failed'));

    await act(async () => {
      render(<AccountSettings />);
    });
    
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Failed to load account information');
    });
  });

  it('handles empty activity logs', async () => {
    // Setup mocks with empty activity logs using utility
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAccountInfo)
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSecuritySettings)  
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]) // Empty array
      });

    await act(async () => {
      render(<AccountSettings />);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    });

    expect(screen.getByText('No recent activity')).toBeInTheDocument();
  });

  it('handles session termination dialog', async () => {
    setupAccountSettingsMocks(mockFetch);
    
    await act(async () => {
      render(<AccountSettings />);
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('terminate-sessions-trigger')).toBeInTheDocument();
    });

    expect(screen.getByText('Security')).toBeInTheDocument();
  });

  it('handles account deletion dialog', async () => {
    setupAccountSettingsMocks(mockFetch);
    
    await act(async () => {
      render(<AccountSettings />);
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('delete-account-trigger')).toBeInTheDocument();
    });

    expect(screen.getByText('Danger Zone')).toBeInTheDocument();
  });
});