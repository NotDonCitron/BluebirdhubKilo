export const useRealTimeEvents = jest.fn(() => ({
  isConnected: true,
  connectionState: 'connected',
  lastMessage: null,
  error: null,
}));