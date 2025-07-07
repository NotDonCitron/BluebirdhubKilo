/**
 * @jest-environment node
 */

// Mock the Prisma client and all related modules BEFORE any imports
const mockPrismaInstance = {
  workspace: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  activityLog: {
    create: jest.fn(),
  },
  $disconnect: jest.fn(),
  $connect: jest.fn(),
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => mockPrismaInstance)
}));

// Mock the db module to return our mock
jest.mock('@/lib/db', () => ({
  prisma: mockPrismaInstance,
  db: mockPrismaInstance
}));

// Mock next-auth
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

// Mock auth config
jest.mock('@/lib/auth-config', () => ({
  authOptions: {}
}));

// Import modules AFTER mocking
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { 
  testAPIAuthentication, 
  testAPIWithAuth, 
  testAPIErrorHandling,
  createTestData,
  cleanupAPITests
} from '../utils/api-test-utils';

// Use jest.isolateModules to ensure fresh module loading
let GET: any, POST: any;
beforeAll(() => {
  jest.isolateModules(() => {
    const routeModule = require('@/app/api/workspaces/route');
    GET = routeModule.GET;
    POST = routeModule.POST;
  });
});

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockPrisma = mockPrismaInstance;

describe('/api/workspaces', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    cleanupAPITests();
  });

  describe('GET /api/workspaces', () => {
    it('should return 401 when user is not authenticated', async () => {
      const { isUnauthorized } = await testAPIAuthentication(
        GET, 
        mockGetServerSession, 
        'http://localhost:3000/api/workspaces'
      );
      
      expect(isUnauthorized).toBe(true);
    });

    it('should return user workspaces when authenticated', async () => {
      const testWorkspaces = [
        createTestData.workspace({ name: 'Personal Workspace' }),
        createTestData.workspace({ name: 'Team Workspace', id: 'test-workspace-456' })
      ];

      mockPrisma.workspace.findMany.mockResolvedValue(testWorkspaces);

      const { response, data, isSuccess } = await testAPIWithAuth(
        GET,
        mockGetServerSession,
        {},
        'http://localhost:3000/api/workspaces'
      );

      expect(isSuccess).toBe(true);
      expect(data).toEqual(testWorkspaces);
      expect(mockPrisma.workspace.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ ownerId: 'test-user-123' })
            ])
          })
        })
      );
    });

    it('should handle database errors gracefully', async () => {
      const { isError } = await testAPIErrorHandling(
        GET,
        mockGetServerSession,
        mockPrisma,
        new Error('Database connection failed'),
        'http://localhost:3000/api/workspaces'
      );

      expect(isError).toBe(true);
    });
  });

  describe('POST /api/workspaces', () => {
    it('should return 401 when user is not authenticated', async () => {
      const { isUnauthorized } = await testAPIAuthentication(
        POST, 
        mockGetServerSession, 
        'http://localhost:3000/api/workspaces'
      );
      
      expect(isUnauthorized).toBe(true);
    });

    it('should create a new workspace when authenticated', async () => {
      const newWorkspaceData = {
        name: 'New Team Workspace',
        description: 'A workspace for the development team'
      };

      const createdWorkspace = createTestData.workspace({
        ...newWorkspaceData,
        id: 'new-workspace-123'
      });

      mockPrisma.workspace.create.mockResolvedValue(createdWorkspace);

      const { response, data, isSuccess } = await testAPIWithAuth(
        POST,
        mockGetServerSession,
        {},
        'http://localhost:3000/api/workspaces',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newWorkspaceData)
        }
      );

      expect(isSuccess).toBe(true);
      expect(data).toEqual(createdWorkspace);
      expect(mockPrisma.workspace.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: newWorkspaceData.name,
          description: newWorkspaceData.description,
          ownerId: 'test-user-123'
        }),
        include: expect.any(Object)
      });
    });

    it('should validate required fields', async () => {
      const invalidData = {
        description: 'Missing name field'
      };

      const { response, isSuccess } = await testAPIWithAuth(
        POST,
        mockGetServerSession,
        {},
        'http://localhost:3000/api/workspaces',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(invalidData)
        }
      );

      expect(isSuccess).toBe(false);
      expect(response.status).toBe(400);
      expect(mockPrisma.workspace.create).not.toHaveBeenCalled();
    });

    it('should handle database creation errors', async () => {
      const validData = {
        name: 'Test Workspace',
        description: 'Test description'
      };

      mockPrisma.workspace.create.mockRejectedValue(
        new Error('Duplicate workspace name')
      );

      const { response, isSuccess } = await testAPIWithAuth(
        POST,
        mockGetServerSession,
        {},
        'http://localhost:3000/api/workspaces',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validData)
        }
      );

      expect(isSuccess).toBe(false);
      expect(response.status).toBe(500);
    });
  });
});

/**
 * This test demonstrates the reusable API testing patterns:
 * 
 * 1. ✅ Consistent mock setup with setupAPIRouteMocks()
 * 2. ✅ Module isolation for reliable Prisma mocking
 * 3. ✅ Reusable authentication testing patterns
 * 4. ✅ Standardized test data creation
 * 5. ✅ Error handling test patterns
 * 6. ✅ Proper cleanup utilities
 * 
 * This pattern can be easily replicated for other API routes like:
 * - /api/tasks
 * - /api/files  
 * - /api/settings/*
 * - /api/users
 */