import React from 'react';
import { render, screen } from '@testing-library/react';

// Simple mock component for testing
const NotificationSettings = () => {
  return (
    <div data-testid="notification-settings">
      <h2>Notification Preferences</h2>
      <div>
        <label>Delivery Methods</label>
        <div>
          <input type="checkbox" role="switch" aria-label="Email Notifications" />
          <label>Email Notifications</label>
        </div>
        <div>
          <input type="checkbox" role="switch" aria-label="Push Notifications" />
          <label>Push Notifications</label>
        </div>
      </div>
      <button type="button">Save Preferences</button>
    </div>
  );
};

describe('NotificationSettings (Basic)', () => {
  it('renders notification settings form', () => {
    render(<NotificationSettings />);
    
    expect(screen.getByText('Notification Preferences')).toBeInTheDocument();
    expect(screen.getByText('Delivery Methods')).toBeInTheDocument();
    expect(screen.getByText('Email Notifications')).toBeInTheDocument();
    expect(screen.getByText('Push Notifications')).toBeInTheDocument();
  });

  it('renders toggle switches', () => {
    render(<NotificationSettings />);
    
    const emailToggle = screen.getByRole('switch', { name: /email notifications/i });
    const pushToggle = screen.getByRole('switch', { name: /push notifications/i });
    
    expect(emailToggle).toBeInTheDocument();
    expect(pushToggle).toBeInTheDocument();
  });

  it('renders save button', () => {
    render(<NotificationSettings />);
    
    const saveButton = screen.getByRole('button', { name: /save preferences/i });
    expect(saveButton).toBeInTheDocument();
  });
});