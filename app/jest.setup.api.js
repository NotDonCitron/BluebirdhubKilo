// Jest setup for API route tests (Node.js environment)
// This setup file avoids DOM-specific mocks that would break in Node.js

// Mock console to reduce noise during tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Ensure global fetch is available for testing
if (!global.fetch) {
  global.fetch = jest.fn();
}

// Set up test environment variables
process.env.NODE_ENV = 'test';
process.env.NEXTAUTH_SECRET = 'test-secret';
process.env.NEXTAUTH_URL = 'http://localhost:3000';

// Mock common Node.js globals for consistency
global.setImmediate = global.setImmediate || ((fn, ...args) => global.setTimeout(fn, 0, ...args));

beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
});

afterEach(() => {
  // Clean up after each test
  jest.resetAllMocks();
});