import '@testing-library/jest-dom';

// Mock next/router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: {},
      asPath: '/',
      push: jest.fn(),
      pop: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn().mockResolvedValue(undefined),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
    };
  },
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    };
  },
  useSearchParams() {
    return new URLSearchParams();
  },
  usePathname() {
    return '/';
  },
}));

// Mock NextAuth
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({
    data: {
      user: {
        id: '1',
        name: 'Test User',
        email: 'test@example.com',
      },
    },
    status: 'authenticated',
  })),
  signIn: jest.fn(),
  signOut: jest.fn(),
  SessionProvider: ({ children }) => children,
}));

// Mock fetch globally
global.fetch = jest.fn();

// Mock EventSource for SSE tests
class MockEventSource {
  constructor(url) {
    this.url = url;
    this.readyState = 0; // CONNECTING
    this.CONNECTING = 0;
    this.OPEN = 1;
    this.CLOSED = 2;
    this.onopen = null;
    this.onmessage = null;
    this.onerror = null;
    this.onclose = null;
    this.listeners = {};
    
    // Simulate connection opening asynchronously - use setTimeout to ensure
    // the hook has time to set event handlers
    setTimeout(() => {
      if (this.readyState !== 2) { // Only if not already closed
        this.readyState = 1; // OPEN
        if (this.onopen) {
          this.onopen(new Event('open'));
        }
        // Also trigger any addEventListener handlers
        if (this.listeners.open) {
          this.listeners.open.forEach(handler => handler(new Event('open')));
        }
      }
    }, 0);
  }

  addEventListener(event, handler) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(handler);
  }

  removeEventListener(event, handler) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(h => h !== handler);
    }
  }

  close() {
    this.readyState = 2; // CLOSED
    if (this.onclose) {
      this.onclose(new Event('close'));
    }
    // Trigger close event listeners
    if (this.listeners.close) {
      this.listeners.close.forEach(handler => handler(new Event('close')));
    }
  }

  // Helper method to simulate receiving a message
  simulateMessage(data) {
    const event = new MessageEvent('message', { data });
    if (this.onmessage) {
      this.onmessage(event);
    }
    if (this.listeners.message) {
      this.listeners.message.forEach(handler => handler(event));
    }
  }

  // Helper method to simulate an error
  simulateError() {
    const event = new Event('error');
    if (this.onerror) {
      this.onerror(event);
    }
    if (this.listeners.error) {
      this.listeners.error.forEach(handler => handler(event));
    }
  }
}

global.EventSource = jest.fn((url) => new MockEventSource(url));

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    loading: jest.fn(),
  },
  Toaster: () => null,
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: 'div',
    span: 'span',
    button: 'button',
    form: 'form',
  },
  AnimatePresence: ({ children }) => children,
}));

// Clear all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});