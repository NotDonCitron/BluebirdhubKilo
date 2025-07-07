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

// Mock FileReader for file upload tests
class MockFileReader {
  constructor() {
    this.readyState = 0;
    this.result = null;
    this.error = null;
    this.onload = null;
    this.onerror = null;
    this.onloadend = null;
    this.onprogress = null;
  }

  readAsArrayBuffer(file) {
    this.readyState = 1;
    setTimeout(() => {
      this.readyState = 2;
      this.result = new ArrayBuffer(file.size || 0);
      if (this.onload) this.onload({ target: this });
      if (this.onloadend) this.onloadend({ target: this });
    }, 0);
  }

  readAsText(file) {
    this.readyState = 1;
    setTimeout(() => {
      this.readyState = 2;
      this.result = file.content || '';
      if (this.onload) this.onload({ target: this });
      if (this.onloadend) this.onloadend({ target: this });
    }, 0);
  }

  readAsDataURL(file) {
    this.readyState = 1;
    setTimeout(() => {
      this.readyState = 2;
      this.result = `data:${file.type || 'application/octet-stream'};base64,${btoa(file.content || '')}`;
      if (this.onload) this.onload({ target: this });
      if (this.onloadend) this.onloadend({ target: this });
    }, 0);
  }

  abort() {
    this.readyState = 2;
    if (this.onloadend) this.onloadend({ target: this });
  }
}

global.FileReader = MockFileReader;

// Mock File constructor
global.File = class MockFile {
  constructor(parts, name, options = {}) {
    this.name = name;
    this.size = parts.reduce((acc, part) => acc + (part.length || 0), 0);
    this.type = options.type || '';
    this.lastModified = options.lastModified || Date.now();
    this.content = parts.join('');
  }
};

// Mock URL methods for file downloads
global.URL.createObjectURL = jest.fn(() => 'mock-object-url');
global.URL.revokeObjectURL = jest.fn();

// Mock hasPointerCapture for jsdom compatibility
Element.prototype.hasPointerCapture = jest.fn(() => false);
Element.prototype.setPointerCapture = jest.fn();
Element.prototype.releasePointerCapture = jest.fn();

// Mock resizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock scrollIntoView
Element.prototype.scrollIntoView = jest.fn();

// Mock getBoundingClientRect
Element.prototype.getBoundingClientRect = jest.fn(() => ({
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  toJSON: jest.fn(),
}));

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