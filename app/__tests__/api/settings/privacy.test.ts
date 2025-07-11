import { NextRequest } from 'next/server';
import { GET, PUT } from '@/app/api/settings/privacy/route';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';

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

const mockUserSettings = {
  id: 'settings-1',
  userId: 'user-1',
  profileVisibility: 'WORKSPACE_ONLY',
  showOnlineStatus: true,
  allowDirectMessages: true,
  searchableByEmail: false,
  showActivityStatus: true,
  dataProcessingConsent: true,
  marketingEmailsConsent: false,
  analyticsConsent: true,
  thirdPartyIntegrationsConsent: false,
  twoFactorEnabled: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('/api/settings/privacy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetServerSession.mockResolvedValue(mockSession);
  });

  describe('GET', () => {
    it('returns privacy settings for authenticated user', async () => {
      mockDb.userSettings.findUnique.mockResolvedValue(mockUserSettings);

      const request = new NextRequest('http://localhost:3000/api/settings/privacy');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockUserSettings);
      expect(mockDb.userSettings.findUnique).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
    });

    it('creates default settings if none exist', async () => {
      mockDb.userSettings.findUnique.mockResolvedValue(null);
      mockDb.userSettings.create.mockResolvedValue(mockUserSettings);

      const request = new NextRequest('http://localhost:3000/api/settings/privacy');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockDb.userSettings.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          profileVisibility: 'WORKSPACE_ONLY',
          showOnlineStatus: true,
          allowDirectMessages: true,
          searchableByEmail: true,
          showActivityStatus: true,
          dataProcessingConsent: true,
          marketingEmailsConsent: false,
          analyticsConsent: true,
          thirdPartyIntegrationsConsent: false,
        },
      });
    });

    it('returns 401 for unauthenticated requests', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/settings/privacy');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('handles database errors', async () => {
      mockDb.userSettings.findUnique.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/settings/privacy');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch privacy settings');
    });
  });

  describe('PUT', () => {
    const validUpdateData = {
      profileVisibility: 'PUBLIC',
      showOnlineStatus: false,
      allowDirectMessages: false,
      searchableByEmail: true,
      dataProcessingConsent: true,
      marketingEmailsConsent: true,
      analyticsConsent: false,
    };

    it('updates privacy settings for authenticated user', async () => {
      const updatedSettings = { ...mockUserSettings, ...validUpdateData };
      mockDb.userSettings.upsert.mockResolvedValue(updatedSettings);

      const request = new NextRequest('http://localhost:3000/api/settings/privacy', {
        method: 'PUT',
        body: JSON.stringify(validUpdateData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(updatedSettings);
      expect(mockDb.userSettings.upsert).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        update: validUpdateData,
        create: {
          userId: 'user-1',
          ...validUpdateData,
        },
      });
    });

    it('validates profile visibility values', async () => {
      const invalidData = {
        profileVisibility: 'INVALID_VISIBILITY',
      };

      const request = new NextRequest('http://localhost:3000/api/settings/privacy', {
        method: 'PUT',
        body: JSON.stringify(invalidData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request data');
    });

    it('validates boolean fields', async () => {
      const invalidData = {
        showOnlineStatus: 'not-a-boolean',
        dataProcessingConsent: 'invalid',
      };

      const request = new NextRequest('http://localhost:3000/api/settings/privacy', {
        method: 'PUT',
        body: JSON.stringify(invalidData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request data');
    });

    it('requires data processing consent to be true', async () => {
      const invalidData = {
        dataProcessingConsent: false,
      };

      const request = new NextRequest('http://localhost:3000/api/settings/privacy', {
        method: 'PUT',
        body: JSON.stringify(invalidData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Data processing consent is required');
    });

    it('returns 401 for unauthenticated requests', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/settings/privacy', {
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
      const request = new NextRequest('http://localhost:3000/api/settings/privacy', {
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
      mockDb.userSettings.upsert.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/settings/privacy', {
        method: 'PUT',
        body: JSON.stringify(validUpdateData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to update privacy settings');
    });
  });
});