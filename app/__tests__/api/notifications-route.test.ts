/**
 * @jest-environment node
 */

// Mock the Prisma client and all related modules
const mockPrismaInstance = {
  notificationSettings: {
    findUnique: jest.fn(),
    create: jest.fn(),
    upsert: jest.fn(),
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

// Use jest.isolateModules to ensure fresh module loading
let GET: any, PUT: any;
beforeAll(() => {
  jest.isolateModules(() => {
    const routeModule = require('@/app/api/settings/notifications/route');
    GET = routeModule.GET;
    PUT = routeModule.PUT;
  });
});

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockPrisma = mockPrismaInstance;

describe('/api/settings/notifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/settings/notifications', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/settings/notifications', {
        method: 'GET'
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: 'Unauthorized' });
      expect(mockPrisma.notificationSettings.findUnique).not.toHaveBeenCalled();
    });

    it('should return existing notification settings', async () => {
      const mockSession = {
        user: { id: 'user-123', email: 'test@example.com' }
      };
      const mockSettings = {
        id: 'settings-1',
        userId: 'user-123',
        emailNotifications: true,
        pushNotifications: false,
        taskReminders: true,
        commentNotifications: true,
        notificationFrequency: 'DAILY',
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      };

      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.notificationSettings.findUnique.mockResolvedValue(mockSettings);

      const request = new NextRequest('http://localhost:3000/api/settings/notifications', {
        method: 'GET'
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockSettings);
      expect(mockPrisma.notificationSettings.findUnique).toHaveBeenCalledWith({
        where: { userId: 'user-123' }
      });
    });

    it('should create default settings when none exist', async () => {
      const mockSession = {
        user: { id: 'user-123', email: 'test@example.com' }
      };
      const mockCreatedSettings = {
        id: 'settings-new',
        userId: 'user-123',
        emailNotifications: true,
        pushNotifications: true,
        taskReminders: true,
        commentNotifications: true,
        notificationFrequency: 'IMMEDIATE',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      };

      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.notificationSettings.findUnique.mockResolvedValue(null);
      mockPrisma.notificationSettings.create.mockResolvedValue(mockCreatedSettings);

      const request = new NextRequest('http://localhost:3000/api/settings/notifications', {
        method: 'GET'
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockCreatedSettings);
      expect(mockPrisma.notificationSettings.create).toHaveBeenCalledWith({
        data: { userId: 'user-123' }
      });
    });

    it('should handle database errors gracefully', async () => {
      const mockSession = {
        user: { id: 'user-123', email: 'test@example.com' }
      };

      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.notificationSettings.findUnique.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/settings/notifications', {
        method: 'GET'
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Internal server error' });
    });
  });

  describe('PUT /api/settings/notifications', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/settings/notifications', {
        method: 'PUT',
        body: JSON.stringify({ taskAssigned: true }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: 'Unauthorized' });
      expect(mockPrisma.notificationSettings.upsert).not.toHaveBeenCalled();
    });

    it('should update notification settings successfully', async () => {
      const mockSession = {
        user: { id: 'user-123', email: 'test@example.com' }
      };
      const updateData = {
        taskAssigned: false,
        commentAdded: true,
        frequency: 'HOURLY' as const
      };
      const mockUpdatedSettings = {
        id: 'settings-1',
        userId: 'user-123',
        ...updateData,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      };

      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.notificationSettings.upsert.mockResolvedValue(mockUpdatedSettings);
      mockPrisma.activityLog.create.mockResolvedValue({});

      const request = new NextRequest('http://localhost:3000/api/settings/notifications', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockUpdatedSettings);
      expect(mockPrisma.notificationSettings.upsert).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        update: updateData,
        create: {
          userId: 'user-123',
          ...updateData
        }
      });
    });

    it('should handle quiet hours time validation', async () => {
      const mockSession = {
        user: { id: 'user-123', email: 'test@example.com' }
      };
      const updateData = {
        quietHoursStart: '23:30',
        quietHoursEnd: '07:15'
      };
      const mockUpdatedSettings = {
        id: 'settings-1',
        userId: 'user-123',
        ...updateData,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      };

      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.notificationSettings.upsert.mockResolvedValue(mockUpdatedSettings);
      mockPrisma.activityLog.create.mockResolvedValue({});

      const request = new NextRequest('http://localhost:3000/api/settings/notifications', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockUpdatedSettings);
    });

    it('should reject invalid quiet hours format', async () => {
      const mockSession = {
        user: { id: 'user-123', email: 'test@example.com' }
      };

      mockGetServerSession.mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost:3000/api/settings/notifications', {
        method: 'PUT',
        body: JSON.stringify({
          quietHoursStart: '25:00' // Invalid time
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await PUT(request);

      expect(response.status).toBe(400);
      expect(mockPrisma.notificationSettings.upsert).not.toHaveBeenCalled();
    });

    it('should reject invalid request body', async () => {
      const mockSession = {
        user: { id: 'user-123', email: 'test@example.com' }
      };

      mockGetServerSession.mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost:3000/api/settings/notifications', {
        method: 'PUT',
        body: JSON.stringify({
          frequency: 'INVALID_FREQUENCY' // Invalid enum value
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await PUT(request);

      expect(response.status).toBe(400);
      expect(mockPrisma.notificationSettings.upsert).not.toHaveBeenCalled();
    });

    it('should handle database update errors', async () => {
      const mockSession = {
        user: { id: 'user-123', email: 'test@example.com' }
      };

      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.notificationSettings.upsert.mockRejectedValue(new Error('Database update failed'));

      const request = new NextRequest('http://localhost:3000/api/settings/notifications', {
        method: 'PUT',
        body: JSON.stringify({ taskAssigned: true }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Internal server error' });
    });

    it('should create activity log entry on successful update', async () => {
      const mockSession = {
        user: { id: 'user-123', email: 'test@example.com' }
      };
      const updateData = { taskAssigned: true, commentAdded: false };
      const mockUpdatedSettings = {
        id: 'settings-1',
        userId: 'user-123',
        ...updateData,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      };

      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.notificationSettings.upsert.mockResolvedValue(mockUpdatedSettings);
      mockPrisma.activityLog.create.mockResolvedValue({});

      const request = new NextRequest('http://localhost:3000/api/settings/notifications', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await PUT(request);

      expect(response.status).toBe(200);
      expect(mockPrisma.activityLog.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          action: 'SETTINGS_UPDATED',
          entityType: 'notifications',
          entityId: 'user-123',
          details: {
            updatedFields: ['taskAssigned', 'commentAdded']
          }
        }
      });
    });
  });
});