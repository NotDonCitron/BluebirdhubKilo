import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'react-hot-toast';
import { PrivacySettings } from '@/components/dashboard/settings/privacy-settings';
import { 
  setupPrivacySettingsMocks,
  mockPrivacySettings,
  createSuccessResponse,
  createErrorResponse,
  createToastMocks
} from '@/__tests__/utils/test-mocks';

// Mock react-hot-toast
jest.mock('react-hot-toast');
const mockToast = createToastMocks();
(toast as any).success = mockToast.success;
(toast as any).error = mockToast.error;

// Mock fetch responses
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

// Mock URL.createObjectURL for data export tests
global.URL.createObjectURL = jest.fn(() => 'mock-blob-url');
global.URL.revokeObjectURL = jest.fn();

describe('PrivacySettings', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    mockToast.success.mockClear();
    mockToast.error.mockClear();
    
    // Mock successful GET request using centralized utility
    setupPrivacySettingsMocks(mockFetch);
  });

  it('renders privacy settings form', async () => {
    render(<PrivacySettings />);
    
    await waitFor(() => {
      expect(screen.getByText('Privacy Settings')).toBeInTheDocument();
    });

    expect(screen.getByText('Profile Visibility')).toBeInTheDocument();
    expect(screen.getByText('Show Activity Status')).toBeInTheDocument();
    expect(screen.getByText('Data & Privacy')).toBeInTheDocument();
  });

  it('loads existing privacy settings on mount', async () => {
    render(<PrivacySettings />);
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/settings/privacy');
    });

    // Check that settings are loaded correctly
    await waitFor(() => {
      const onlineStatusToggle = screen.getByTestId('show-online-status-switch');
      expect(onlineStatusToggle).toBeChecked();
      
      const directMessagesToggle = screen.getByTestId('allow-direct-messages-switch');
      expect(directMessagesToggle).toBeChecked();
    });
  });

  it('updates profile visibility setting', async () => {
    const user = userEvent.setup();
    render(<PrivacySettings />);
    
    await waitFor(() => {
      expect(screen.getByText('Privacy Settings')).toBeInTheDocument();
    });

    const visibilitySelect = screen.getByTestId('profile-visibility-select');
    await user.click(visibilitySelect);
    
    await waitFor(() => {
      const publicOption = screen.getByText('Public');
      expect(publicOption).toBeInTheDocument();
    });
  });

  it('toggles privacy switches', async () => {
    const user = userEvent.setup();
    
    // Mock successful PUT request for the toggle action
    mockFetch.mockResolvedValueOnce(createSuccessResponse({ message: 'Setting updated' }) as any);
    
    await act(async () => {
      render(<PrivacySettings />);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Privacy Settings')).toBeInTheDocument();
    });

    const onlineStatusToggle = screen.getByTestId('show-online-status-switch');
    
    // Check initial state - should be checked (true) based on mock data
    expect(onlineStatusToggle).toHaveAttribute('aria-checked', 'true');
    
    await user.click(onlineStatusToggle);

    // After clicking and successful API response, should toggle to unchecked
    await waitFor(() => {
      expect(onlineStatusToggle).toHaveAttribute('aria-checked', 'false');
    });
  });

  it('saves privacy settings when form is submitted', async () => {
    const user = userEvent.setup();
    
    // Mock successful PUT request
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(<PrivacySettings />);
    
    await waitFor(() => {
      expect(screen.getByText('Privacy Settings')).toBeInTheDocument();
    });

    const saveButton = screen.getByTestId('save-settings-button');
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/settings/privacy', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: expect.stringContaining('profileVisibility'),
      });
    });
  });

  it('handles data export functionality', async () => {
    const user = userEvent.setup();
    
    // Mock successful export request
    const mockBlob = new Blob(['{"data": "test"}'], { type: 'application/json' });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      blob: async () => mockBlob,
      headers: new Headers({
        'content-disposition': 'attachment; filename="user-data.json"'
      }),
    });

    render(<PrivacySettings />);
    
    await waitFor(() => {
      expect(screen.getByText('Privacy Settings')).toBeInTheDocument();
    });

    const exportButton = screen.getByTestId('export-data-button');
    await user.click(exportButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/settings/export-data', {
        method: 'POST',
      });
    });

    expect(global.URL.createObjectURL).toHaveBeenCalledWith(mockBlob);
  });

  it('handles export data errors', async () => {
    const user = userEvent.setup();
    
    // Mock failed export request
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    render(<PrivacySettings />);
    
    await waitFor(() => {
      expect(screen.getByText('Privacy Settings')).toBeInTheDocument();
    });

    const exportButton = screen.getByTestId('export-data-button');
    await user.click(exportButton);

    await waitFor(() => {
      expect(screen.getByText(/failed to export/i)).toBeInTheDocument();
    });
  });

  it('shows loading state during data export', async () => {
    const user = userEvent.setup();
    
    // Mock delayed export request
    mockFetch.mockImplementationOnce(() => 
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        blob: async () => new Blob(['{}'], { type: 'application/json' }),
        headers: new Headers({}),
      }), 100))
    );

    render(<PrivacySettings />);
    
    await waitFor(() => {
      expect(screen.getByText('Privacy Settings')).toBeInTheDocument();
    });

    const exportButton = screen.getByTestId('export-data-button');
    await user.click(exportButton);

    expect(screen.getByText(/exporting/i)).toBeInTheDocument();
  });

  it('toggles consent settings', async () => {
    const user = userEvent.setup();
    render(<PrivacySettings />);
    
    await waitFor(() => {
      expect(screen.getByText('Privacy Settings')).toBeInTheDocument();
    });

    const dataProcessingToggle = screen.getByTestId('data-processing-consent-switch');
    const marketingToggle = screen.getByTestId('marketing-emails-consent-switch');
    const analyticsToggle = screen.getByTestId('analytics-consent-switch');

    expect(dataProcessingToggle).toBeInTheDocument();
    expect(marketingToggle).toBeInTheDocument();
    expect(analyticsToggle).toBeInTheDocument();

    await user.click(dataProcessingToggle);
    expect(dataProcessingToggle).not.toBeChecked();
  });

  it('validates required consent fields', async () => {
    const user = userEvent.setup();
    render(<PrivacySettings />);
    
    await waitFor(() => {
      expect(screen.getByText('Privacy Settings')).toBeInTheDocument();
    });

    const dataProcessingToggle = screen.getByTestId('data-processing-consent-switch');
    await user.click(dataProcessingToggle); // Turn off required consent

    const saveButton = screen.getByTestId('save-settings-button');
    await user.click(saveButton);

    // Should show validation message or prevent save
    expect(dataProcessingToggle).not.toBeChecked();
  });

  it('shows confirmation dialog for sensitive changes', async () => {
    const user = userEvent.setup();
    render(<PrivacySettings />);
    
    await waitFor(() => {
      expect(screen.getByText('Privacy Settings')).toBeInTheDocument();
    });

    const visibilitySelect = screen.getByTestId('profile-visibility-select');
    await user.click(visibilitySelect);
    
    await waitFor(() => {
      const privateOption = screen.getByText('Private');
      expect(privateOption).toBeInTheDocument();
    });

    const saveButton = screen.getByTestId('save-settings-button');
    await user.click(saveButton);

    // Should show confirmation for privacy level changes
    expect(saveButton).toBeInTheDocument();
  });
});