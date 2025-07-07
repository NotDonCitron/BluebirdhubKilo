/**
 * Reusable utilities for testing Next.js API routes
 * 
 * This module provides consistent patterns for:
 * - Mocking Prisma client properly
 * - Setting up authentication mocks  
 * - Creating API request/response test patterns
 * - Handling module isolation for reliable testing
 */

import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';

/**
 * Creates a mock Prisma client instance with commonly used methods
 */
export const createMockPrismaClient = () => ({
  // User model
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  
  // Settings models
  notificationSettings: {
    findUnique: jest.fn(),
    create: jest.fn(),
    upsert: jest.fn(),
  },
  privacySettings: {
    findUnique: jest.fn(),
    create: jest.fn(),
    upsert: jest.fn(),
  },
  
  // Activity logging
  activityLog: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
  
  // Workspace management
  workspace: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  
  // Task management
  task: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  
  // File management
  file: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  
  // Prisma client methods
  $disconnect: jest.fn(),
  $connect: jest.fn(),
  $transaction: jest.fn(),
});

/**
 * Sets up comprehensive mocking for API route testing
 * 
 * NOTE: This function should be called BEFORE importing any modules that use Prisma or NextAuth.
 * For proper mocking, use the pattern demonstrated in notifications-route.test.ts:
 * 1. Create mock instances
 * 2. Call jest.mock() before imports
 * 3. Use jest.isolateModules() for route handlers
 * 
 * @param mockPrismaInstance - Optional custom Prisma mock instance
 * @returns Object with mock functions for testing
 */
export const setupAPIRouteMocks = (mockPrismaInstance?: any) => {
  const mockPrisma = mockPrismaInstance || createMockPrismaClient();
  
  // NOTE: These mocks need to be set up BEFORE module imports in actual test files
  // This function is provided for reference but won't work if called after imports
  
  return {
    mockPrisma,
    // This will only work if getServerSession is already mocked
    mockGetServerSession: getServerSession as jest.MockedFunction<typeof getServerSession>,
  };
};

/**
 * Creates mock session data for authenticated tests
 */
export const createMockSession = (overrides: any = {}) => ({
  user: {
    id: 'test-user-123',
    email: 'test@example.com',
    name: 'Test User',
    ...overrides.user
  },
  expires: '2024-12-31T23:59:59.999Z',
  ...overrides
});

/**
 * Creates a mock NextRequest for API route testing
 */
export const createMockRequest = (url: string, options: RequestInit = {}) => {
  return new NextRequest(url, {
    method: 'GET',
    ...options
  });
};

/**
 * Helper to test API route authentication
 */
export const testAPIAuthentication = async (
  routeHandler: any,
  mockGetServerSession: jest.MockedFunction<typeof getServerSession>,
  url: string = 'http://localhost:3000/api/test'
) => {
  // Test unauthenticated request
  mockGetServerSession.mockResolvedValue(null);
  const request = createMockRequest(url);
  const response = await routeHandler(request);
  const data = await response.json();
  
  return {
    response,
    data,
    isUnauthorized: response.status === 401
  };
};

/**
 * Helper to test API route with valid session
 */
export const testAPIWithAuth = async (
  routeHandler: any,
  mockGetServerSession: jest.MockedFunction<typeof getServerSession>,
  sessionOverrides: any = {},
  url: string = 'http://localhost:3000/api/test',
  requestOptions: RequestInit = {}
) => {
  const mockSession = createMockSession(sessionOverrides);
  mockGetServerSession.mockResolvedValue(mockSession);
  
  const request = createMockRequest(url, requestOptions);
  const response = await routeHandler(request);
  
  let data;
  try {
    data = await response.json();
  } catch {
    data = null; // Some responses might not have JSON body
  }
  
  return {
    response,
    data,
    mockSession,
    isSuccess: response.status >= 200 && response.status < 300
  };
};

/**
 * Helper to test API route error handling
 */
export const testAPIErrorHandling = async (
  routeHandler: any,
  mockGetServerSession: jest.MockedFunction<typeof getServerSession>,
  mockPrisma: any,
  errorToThrow: Error,
  url: string = 'http://localhost:3000/api/test'
) => {
  const mockSession = createMockSession();
  mockGetServerSession.mockResolvedValue(mockSession);
  
  // Make a Prisma method throw an error
  Object.values(mockPrisma).forEach((model: any) => {
    if (typeof model === 'object' && model.findMany) {
      model.findMany.mockRejectedValue(errorToThrow);
    }
    if (typeof model === 'object' && model.findUnique) {
      model.findUnique.mockRejectedValue(errorToThrow);
    }
  });
  
  const request = createMockRequest(url);
  const response = await routeHandler(request);
  const data = await response.json();
  
  return {
    response,
    data,
    isError: response.status >= 400
  };
};

/**
 * Helper to create test data with consistent structure
 */
export const createTestData = {
  user: (overrides: any = {}) => ({
    id: 'test-user-123',
    email: 'test@example.com',
    name: 'Test User',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides
  }),
  
  notificationSettings: (overrides: any = {}) => ({
    id: 'test-settings-123',
    userId: 'test-user-123',
    emailNotifications: true,
    pushNotifications: false,
    desktopNotifications: true,
    soundEnabled: true,
    notificationFrequency: 'IMMEDIATE',
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides
  }),
  
  workspace: (overrides: any = {}) => ({
    id: 'test-workspace-123',
    name: 'Test Workspace',
    description: 'A test workspace',
    ownerId: 'test-user-123',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides
  }),
  
  task: (overrides: any = {}) => ({
    id: 'test-task-123',
    title: 'Test Task',
    description: 'A test task',
    status: 'TODO',
    priority: 'MEDIUM',
    workspaceId: 'test-workspace-123',
    assigneeId: 'test-user-123',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides
  })
};

/**
 * Cleans up mocks after tests
 */
export const cleanupAPITests = () => {
  jest.clearAllMocks();
  jest.resetAllMocks();
};

/**
 * Patterns for common API route test scenarios
 */
export const apiTestPatterns = {
  /**
   * Standard CRUD testing pattern
   */
  testCRUDEndpoint: async (
    routeHandlers: { GET?: any, POST?: any, PUT?: any, DELETE?: any },
    mockGetServerSession: jest.MockedFunction<typeof getServerSession>,
    mockPrisma: any,
    testData: any,
    baseUrl: string = 'http://localhost:3000/api/test'
  ) => {
    const results: any = {};
    
    if (routeHandlers.GET) {
      const getResult = await testAPIWithAuth(routeHandlers.GET, mockGetServerSession);
      results.GET = getResult;
    }
    
    if (routeHandlers.POST) {
      const postResult = await testAPIWithAuth(
        routeHandlers.POST, 
        mockGetServerSession, 
        {}, 
        baseUrl,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(testData)
        }
      );
      results.POST = postResult;
    }
    
    if (routeHandlers.PUT) {
      const putResult = await testAPIWithAuth(
        routeHandlers.PUT, 
        mockGetServerSession, 
        {}, 
        baseUrl,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(testData)
        }
      );
      results.PUT = putResult;
    }
    
    if (routeHandlers.DELETE) {
      const deleteResult = await testAPIWithAuth(
        routeHandlers.DELETE, 
        mockGetServerSession, 
        {}, 
        baseUrl,
        { method: 'DELETE' }
      );
      results.DELETE = deleteResult;
    }
    
    return results;
  }
};