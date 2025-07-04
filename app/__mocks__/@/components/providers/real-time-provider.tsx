import React from 'react';

export const useRealTime = jest.fn(() => ({
  isConnected: true,
  connectionState: 'connected',
  lastMessage: null,
  error: null,
  sendEvent: jest.fn(),
}));

export const RealTimeProvider = ({ children }: { children: React.ReactNode }) => {
  return <div data-testid="real-time-provider">{children}</div>;
};