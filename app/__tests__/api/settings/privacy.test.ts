import '@testing-library/jest-dom';
/**
 * @jest-environment jsdom
 */

// Setup global web APIs for Next.js API routes
import { TextEncoder, TextDecoder } from 'util';
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

// Mock web APIs needed by Next.js
Object.defineProperty(global, 'Request', {
  writable: true,
  value: class MockRequest {
    constructor(url: string, init?: RequestInit) {
      this.url = url;
      this.method = init?.method || 'GET';
      this.headers = new Headers(init?.headers);
      this.body = init?.body;
    }
    async json() { return JSON.parse(this.body as string || '{}'); }
    async text() { return this.body as string || ''; }
  }
});

Object.defineProperty(global, 'Response', {
  writable: true,
  value: class MockResponse {
    constructor(body?: any, init?: ResponseInit) {
      this.body = body;
      this.status = init?.status || 200;
      this.statusText = init?.statusText || 'OK';
      this.headers = new Headers(init?.headers);
      this.ok = this.status >= 200 && this.status < 300;
    }
    async json() { return this.body; }
    async text() { return JSON.stringify(this.body); }
    static json(data: any, init?: ResponseInit) {
      return new MockResponse(data, { ...init, headers: { 'Content-Type': 'application/json', ...init?.headers } });
    }
  }
});

Object.defineProperty(global, 'Headers', {
  writable: true,
  value: class MockHeaders extends Map {
    append(name: string, value: string) { this.set(name.toLowerCase(), value); }
    get(name: string) { return super.get(name.toLowerCase()); }
    set(name: string, value: string) { return super.set(name.toLowerCase(), value); }
    has(name: string) { return super.has(name.toLowerCase()); }
    delete(name: string) { return super.delete(name.toLowerCase()); }
  }
});

// Mock the auth function first, before any imports
const mockGetServerSession = jest.fn();
jest.mock('next-auth', () => ({
  getServerSession: mockGetServerSession,
}));

// Mock database
const mockDb = {
  userSettings: {
    findUnique: jest.fn(),
    create: jest.fn(),
    upsert: jest.fn(),
  }
};

jest.mock('@/lib/db', () => ({
  db: mockDb
}));

import { NextRequest } from 'next/server';
import { GET, PUT } from '@/app/api/settings/privacy/route';

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
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetServerSession.mockResolvedValue(mockSession);
  });

  describe('GET', () => {
    it('returns privacy settings for authenticated user', async () => {
      mockDb.userSettings.findUnique.mockResolvedValue(mockUserSettings);

      const response = await GET();
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

      const response = await GET();

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

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('handles database errors', async () => {
      mockDb.userSettings.findUnique.mockRejectedValue(new Error('Database error'));

      const response = await GET();
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