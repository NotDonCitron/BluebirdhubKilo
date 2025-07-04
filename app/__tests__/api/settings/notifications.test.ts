/**
 * @jest-environment node
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

// Mock dependencies
jest.mock('next-auth');
jest.mock('@/lib/db');

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockDb = db as jest.Mocked<typeof db>;

const mockSession = {
  user: {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
  },
};

const mockNotificationSettings = {
  id: 'settings-1',
  userId: 'user-1',
  emailNotifications: true,
  pushNotifications: false,
  desktopNotifications: true,
  soundEnabled: true,
  notificationFrequency: 'IMMEDIATE',
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
  taskNotifications: true,
  commentNotifications: true,
  mentionNotifications: true,
  workspaceInviteNotifications: true,
  fileShareNotifications: false,
  systemUpdateNotifications: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('/api/settings/notifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetServerSession.mockResolvedValue(mockSession);
  });

  describe('GET', () => {
    it('returns notification settings for authenticated user', async () => {
      mockDb.notificationSettings.findUnique.mockResolvedValue(mockNotificationSettings);

      const request = new NextRequest('http://localhost:3000/api/settings/notifications');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockNotificationSettings);
      expect(mockDb.notificationSettings.findUnique).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
    });

    it('creates default settings if none exist', async () => {
      mockDb.notificationSettings.findUnique.mockResolvedValue(null);
      mockDb.notificationSettings.create.mockResolvedValue(mockNotificationSettings);

      const request = new NextRequest('http://localhost:3000/api/settings/notifications');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockDb.notificationSettings.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          emailNotifications: true,
          pushNotifications: true,
          desktopNotifications: true,
          soundEnabled: true,
          notificationFrequency: 'IMMEDIATE',
          quietHoursEnabled: false,
          quietHoursStart: '22:00',
          quietHoursEnd: '08:00',
          taskNotifications: true,
          commentNotifications: true,
          mentionNotifications: true,
          workspaceInviteNotifications: true,
          fileShareNotifications: true,
          systemUpdateNotifications: true,
        },
      });
    });

    it('returns 401 for unauthenticated requests', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/settings/notifications');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('handles database errors', async () => {
      mockDb.notificationSettings.findUnique.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/settings/notifications');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch notification settings');
    });
  });

  describe('PUT', () => {
    const validUpdateData = {
      emailNotifications: false,
      pushNotifications: true,
      notificationFrequency: 'HOURLY',
      quietHoursEnabled: true,
      quietHoursStart: '23:00',
      quietHoursEnd: '07:00',
    };

    it('updates notification settings for authenticated user', async () => {
      const updatedSettings = { ...mockNotificationSettings, ...validUpdateData };
      mockDb.notificationSettings.upsert.mockResolvedValue(updatedSettings);

      const request = new NextRequest('http://localhost:3000/api/settings/notifications', {
        method: 'PUT',
        body: JSON.stringify(validUpdateData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(updatedSettings);
      expect(mockDb.notificationSettings.upsert).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        update: validUpdateData,
        create: {
          userId: 'user-1',
          ...validUpdateData,
        },
      });
    });

    it('validates request body', async () => {
      const invalidData = {
        emailNotifications: 'invalid', // Should be boolean
        notificationFrequency: 'INVALID_FREQUENCY',
      };

      const request = new NextRequest('http://localhost:3000/api/settings/notifications', {
        method: 'PUT',
        body: JSON.stringify(invalidData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request data');
    });

    it('validates time format for quiet hours', async () => {
      const invalidTimeData = {
        quietHoursEnabled: true,
        quietHoursStart: '25:00', // Invalid time
        quietHoursEnd: '08:00',
      };

      const request = new NextRequest('http://localhost:3000/api/settings/notifications', {
        method: 'PUT',
        body: JSON.stringify(invalidTimeData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request data');
    });

    it('returns 401 for unauthenticated requests', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/settings/notifications', {
        method: 'PUT',
        body: JSON.stringify(validUpdateData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('handles invalid JSON in request body', async () => {
      const request = new NextRequest('http://localhost:3000/api/settings/notifications', {
        method: 'PUT',
        body: 'invalid json',
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid JSON');
    });

    it('handles database errors during update', async () => {
      mockDb.notificationSettings.upsert.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/settings/notifications', {
        method: 'PUT',
        body: JSON.stringify(validUpdateData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to update notification settings');
    });
  });
});