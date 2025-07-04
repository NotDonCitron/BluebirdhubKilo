import React from 'react';

export const NotificationSettings = () => {
  return (
    <div data-testid="notification-settings">
      <h2>Notification Preferences</h2>
      <div>
        <label>Delivery Methods</label>
        <div>
          <input type="checkbox" name="emailNotifications" />
          <label>Email Notifications</label>
        </div>
        <div>
          <input type="checkbox" name="pushNotifications" />
          <label>Push Notifications</label>
        </div>
        <div>
          <input type="checkbox" name="desktopNotifications" />
          <label>Desktop Notifications</label>
        </div>
      </div>
      <button type="button">Save Preferences</button>
    </div>
  );
};