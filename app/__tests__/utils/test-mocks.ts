import { jest } from '@jest/globals';

/**
 * Reusable mock utility for API responses and common testing patterns
 * This utility provides consistent mock implementations across all test files
 */

// === API Mock Data ===

export const mockAccountInfo = {
  id: 'user-123',
  email: 'test@example.com',
  createdAt: '2024-01-01T00:00:00.000Z',
  lastLoginAt: '2024-01-15T10:00:00.000Z',
  activeSessionsCount: 2,
  storageUsed: 1024,
  storageLimit: 10240
};

export const mockSecuritySettings = {
  twoFactorEnabled: false,
  sessionTimeout: 60,
  loginNotifications: true,
  suspiciousActivityAlerts: true
};

export const mockPrivacySettings = {
  profileVisibility: 'PRIVATE' as const,
  showEmail: false,
  showLastSeen: true,
  showOnlineStatus: true,
  allowDirectMessages: true,
  allowMentions: true,
  dataExportEnabled: true,
  activityLogging: true
};

export const mockNotificationSettings = {
  emailNotifications: true,
  pushNotifications: false,
  desktopNotifications: true,
  soundEnabled: true,
  notificationFrequency: 'IMMEDIATE' as const,
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
  taskNotifications: true,
  commentNotifications: true,
  mentionNotifications: true,
  workspaceInviteNotifications: true,
  fileShareNotifications: false,
  systemUpdateNotifications: true
};

export const mockActivityLogs = [
  {
    id: 'log-1',
    action: 'Login',
    timestamp: '2024-01-15T10:00:00.000Z',
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0'
  },
  {
    id: 'log-2',
    action: 'Password changed',
    timestamp: '2024-01-14T09:30:00.000Z',
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0'
  }
];

export const mockWorkspaces = [
  {
    id: 'workspace-1',
    name: 'Test Workspace',
    description: 'A test workspace',
    isPersonal: false,
    createdAt: '2024-01-01T00:00:00.000Z',
    role: 'OWNER'
  }
];

export const mockTasks = [
  {
    id: 'task-1',
    title: 'Test Task',
    description: 'A test task',
    status: 'TODO',
    priority: 'MEDIUM',
    workspaceId: 'workspace-1',
    createdAt: '2024-01-01T00:00:00.000Z'
  }
];

export const mockFiles = [
  {
    id: 'file-1',
    filename: 'test-document.pdf',
    originalName: 'test-document.pdf',
    mimeType: 'application/pdf',
    size: 1024,
    workspaceId: 'workspace-1',
    uploadedAt: '2024-01-01T00:00:00.000Z'
  }
];

// === Mock Factory Functions ===

/**
 * Creates a successful API response mock
 */
export const createSuccessResponse = <T>(data: T) => ({
  ok: true,
  status: 200,
  statusText: 'OK',
  json: jest.fn().mockResolvedValue(data),
  text: jest.fn().mockResolvedValue(JSON.stringify(data)),
  headers: new Headers(),
  redirected: false,
  type: 'basic',
  url: '',
  clone: jest.fn(),
  body: null,
  bodyUsed: false,
  arrayBuffer: jest.fn(),
  blob: jest.fn(),
  formData: jest.fn()
});

/**
 * Creates an error API response mock
 */
export const createErrorResponse = (status: number = 500, message: string = 'Server error') => ({
  ok: false,
  status,
  statusText: message,
  json: jest.fn().mockResolvedValue({ error: message }),
  text: jest.fn().mockResolvedValue(JSON.stringify({ error: message })),
  headers: new Headers(),
  redirected: false,
  type: 'basic',
  url: '',
  clone: jest.fn(),
  body: null,
  bodyUsed: false,
  arrayBuffer: jest.fn(),
  blob: jest.fn(),
  formData: jest.fn()
});

/**
 * Creates a network error mock
 */
export const createNetworkError = (message: string = 'Network error') => {
  throw new Error(message);
};

// === Common Mock Setups ===

/**
 * Sets up successful mocks for account settings page
 */
export const setupAccountSettingsMocks = (mockFetch: jest.MockedFunction<typeof fetch>) => {
  mockFetch
    .mockResolvedValueOnce(createSuccessResponse(mockAccountInfo) as any)
    .mockResolvedValueOnce(createSuccessResponse(mockSecuritySettings) as any)
    .mockResolvedValueOnce(createSuccessResponse(mockActivityLogs) as any);
};

/**
 * Sets up successful mocks for privacy settings page
 */
export const setupPrivacySettingsMocks = (mockFetch: jest.MockedFunction<typeof fetch>) => {
  mockFetch.mockResolvedValueOnce(createSuccessResponse(mockPrivacySettings) as any);
};

/**
 * Sets up successful mocks for notification settings page
 */
export const setupNotificationSettingsMocks = (mockFetch: jest.MockedFunction<typeof fetch>) => {
  // Ensure proper fetch response structure with all required properties
  mockFetch.mockResolvedValue({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () => mockNotificationSettings,
    text: async () => JSON.stringify(mockNotificationSettings),
    headers: new Headers(),
    redirected: false,
    type: 'basic',
    url: '',
    clone: jest.fn(),
    body: null,
    bodyUsed: false,
    arrayBuffer: jest.fn(),
    blob: jest.fn(),
    formData: jest.fn()
  } as any);
};

/**
 * Sets up successful mocks for workspace-related operations
 */
export const setupWorkspacesMocks = (mockFetch: jest.MockedFunction<typeof fetch>) => {
  mockFetch.mockResolvedValueOnce(createSuccessResponse(mockWorkspaces) as any);
};

/**
 * Sets up successful mocks for task-related operations
 */
export const setupTasksMocks = (mockFetch: jest.MockedFunction<typeof fetch>) => {
  mockFetch.mockResolvedValueOnce(createSuccessResponse(mockTasks) as any);
};

/**
 * Sets up successful mocks for file-related operations
 */
export const setupFilesMocks = (mockFetch: jest.MockedFunction<typeof fetch>) => {
  mockFetch.mockResolvedValueOnce(createSuccessResponse(mockFiles) as any);
};

// === Session Mock Utilities ===

/**
 * Creates a valid session mock for NextAuth
 */
export const createSessionMock = (overrides: Partial<any> = {}) => ({
  data: {
    user: {
      email: 'test@example.com',
      id: 'user-123',
      ...overrides.user
    },
    ...overrides
  },
  status: 'authenticated'
});

/**
 * Creates an unauthenticated session mock
 */
export const createUnauthenticatedSessionMock = () => ({
  data: null,
  status: 'unauthenticated'
});

/**
 * Creates a loading session mock
 */
export const createLoadingSessionMock = () => ({
  data: null,
  status: 'loading'
});

// === Toast Mock Utilities ===

/**
 * Creates consistent toast mocks
 */
export const createToastMocks = () => ({
  success: jest.fn(),
  error: jest.fn(),
  loading: jest.fn(),
  dismiss: jest.fn()
});

// === Browser API Mocks ===

/**
 * Sets up File and FileReader mocks for file upload testing
 */
export const setupFileUploadMocks = () => {
  // Mock File constructor
  global.File = jest.fn().mockImplementation((bits, filename, options) => ({
    size: bits.reduce((acc: number, bit: any) => acc + (bit.length || 0), 0),
    name: filename,
    type: options?.type || 'application/octet-stream',
    lastModified: Date.now(),
    slice: jest.fn()
  })) as any;

  // Mock FileReader
  const mockFileReader = {
    readAsArrayBuffer: jest.fn(),
    result: null,
    onload: null,
    onerror: null,
    addEventListener: jest.fn()
  };
  
  global.FileReader = jest.fn().mockImplementation(() => mockFileReader);
  
  return mockFileReader;
};

/**
 * Sets up EventSource mock for real-time testing
 */
export const setupEventSourceMock = () => {
  const mockEventSource = {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    close: jest.fn(),
    readyState: 1, // OPEN
    CONNECTING: 0,
    OPEN: 1,
    CLOSED: 2
  };

  global.EventSource = jest.fn().mockImplementation(() => mockEventSource);
  
  return mockEventSource;
};

// === Switch Testing Utilities ===

/**
 * Helper to test Radix UI Switch components using aria-checked
 * This avoids issues with Jest DOM's toBeChecked() matcher on Radix switches
 */
export const expectSwitchChecked = (element: HTMLElement, checked: boolean) => {
  expect(element).toHaveAttribute('aria-checked', checked.toString());
};

/**
 * Helper to get switch state from Radix UI Switch
 */
export const getSwitchState = (element: HTMLElement): boolean => {
  return element.getAttribute('aria-checked') === 'true';
};

/**
 * Pattern for testing switch interactions with proper API mock support
 */
export const createSwitchTestPattern = (mockFetch: jest.MockedFunction<typeof fetch>) => ({
  setupSuccessfulToggle: () => {
    mockFetch.mockResolvedValueOnce(createSuccessResponse({ message: 'Setting updated' }) as any);
  },
  
  setupFailedToggle: () => {
    mockFetch.mockResolvedValueOnce(createErrorResponse(500, 'Failed to update setting') as any);
  },
  
  expectSwitchToggled: async (switchElement: HTMLElement, originalState: boolean, waitFor: any) => {
    await waitFor(() => {
      expectSwitchChecked(switchElement, !originalState);
    });
  }
});

// === Test Utilities ===

/**
 * Waits for all pending promises to resolve
 */
export const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0));

/**
 * Creates a delay for testing loading states
 */
export const createDelay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Helper to simulate user interactions with better timing
 */
export const waitForElement = async (getElement: () => HTMLElement | null, timeout = 1000) => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const element = getElement();
    if (element) return element;
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  throw new Error(`Element not found within ${timeout}ms`);
};

// === Common Test Patterns ===

/**
 * Standard setup for component tests with session and fetch mocks
 */
export const setupComponentTest = () => {
  const mockFetch = jest.fn();
  global.fetch = mockFetch;
  
  const toastMocks = createToastMocks();
  
  // Mock react-hot-toast
  jest.doMock('react-hot-toast', () => ({
    toast: toastMocks
  }));
  
  return {
    mockFetch,
    toastMocks,
    sessionMock: createSessionMock()
  };
};

/**
 * Cleanup function for tests
 */
export const cleanupTest = () => {
  jest.clearAllMocks();
  jest.resetAllMocks();
};