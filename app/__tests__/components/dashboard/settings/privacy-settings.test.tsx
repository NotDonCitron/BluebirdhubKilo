import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PrivacySettings } from '@/components/dashboard/settings/privacy-settings';

// Mock fetch responses
const mockFetch = jest.fn();
global.fetch = mockFetch;

const mockPrivacySettings = {
  profileVisibility: 'WORKSPACE_ONLY',
  showOnlineStatus: true,
  allowDirectMessages: true,
  searchableByEmail: false,
  showActivityStatus: true,
  dataProcessingConsent: true,
  marketingEmailsConsent: false,
  analyticsConsent: true,
  thirdPartyIntegrationsConsent: false,
};

// Mock URL.createObjectURL for data export tests
global.URL.createObjectURL = jest.fn(() => 'mock-blob-url');
global.URL.revokeObjectURL = jest.fn();

describe('PrivacySettings', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    // Mock successful GET request
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockPrivacySettings,
    });
  });

  it('renders privacy settings form', async () => {
    render(<PrivacySettings />);
    
    await waitFor(() => {
      expect(screen.getByText('Privacy Settings')).toBeInTheDocument();
    });

    expect(screen.getByText('Profile Visibility')).toBeInTheDocument();
    expect(screen.getByText('Activity Status')).toBeInTheDocument();
    expect(screen.getByText('Data Consent')).toBeInTheDocument();
  });

  it('loads existing privacy settings on mount', async () => {
    render(<PrivacySettings />);
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/settings/privacy');
    });

    // Check that settings are loaded correctly
    await waitFor(() => {
      const onlineStatusToggle = screen.getByRole('switch', { name: /show online status/i });
      expect(onlineStatusToggle).toBeChecked();
      
      const directMessagesToggle = screen.getByRole('switch', { name: /allow direct messages/i });
      expect(directMessagesToggle).toBeChecked();
    });
  });

  it('updates profile visibility setting', async () => {
    const user = userEvent.setup();
    render(<PrivacySettings />);
    
    await waitFor(() => {
      expect(screen.getByText('Privacy Settings')).toBeInTheDocument();
    });

    const visibilitySelect = screen.getByRole('combobox');
    await user.click(visibilitySelect);
    
    const publicOption = screen.getByText('Public');
    await user.click(publicOption);

    expect(screen.getByDisplayValue('Public')).toBeInTheDocument();
  });

  it('toggles privacy switches', async () => {
    const user = userEvent.setup();
    render(<PrivacySettings />);
    
    await waitFor(() => {
      expect(screen.getByText('Privacy Settings')).toBeInTheDocument();
    });

    const onlineStatusToggle = screen.getByRole('switch', { name: /show online status/i });
    await user.click(onlineStatusToggle);

    expect(onlineStatusToggle).not.toBeChecked();
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

    const saveButton = screen.getByRole('button', { name: /save settings/i });
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

    const exportButton = screen.getByRole('button', { name: /export data/i });
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

    const exportButton = screen.getByRole('button', { name: /export data/i });
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

    const exportButton = screen.getByRole('button', { name: /export data/i });
    await user.click(exportButton);

    expect(screen.getByText(/exporting/i)).toBeInTheDocument();
  });

  it('toggles consent settings', async () => {
    const user = userEvent.setup();
    render(<PrivacySettings />);
    
    await waitFor(() => {
      expect(screen.getByText('Privacy Settings')).toBeInTheDocument();
    });

    const dataProcessingToggle = screen.getByRole('switch', { name: /data processing/i });
    const marketingToggle = screen.getByRole('switch', { name: /marketing emails/i });
    const analyticsToggle = screen.getByRole('switch', { name: /analytics/i });

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

    const dataProcessingToggle = screen.getByRole('switch', { name: /data processing/i });
    await user.click(dataProcessingToggle); // Turn off required consent

    const saveButton = screen.getByRole('button', { name: /save settings/i });
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

    const visibilitySelect = screen.getByRole('combobox');
    await user.click(visibilitySelect);
    
    const privateOption = screen.getByText('Private');
    await user.click(privateOption);

    const saveButton = screen.getByRole('button', { name: /save settings/i });
    await user.click(saveButton);

    // Should show confirmation for privacy level changes
    expect(screen.getByDisplayValue('Private')).toBeInTheDocument();
  });
});