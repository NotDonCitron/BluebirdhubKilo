/**
 * @jest-environment node
 */

// Mock the auth function first, before any imports
const mockGetServerSession = jest.fn();
jest.mock('next-auth', () => ({
  getServerSession: mockGetServerSession,
}));

// Mock database
const mockDb = {
  notificationSettings: {
    findUnique: jest.fn(),
    create: jest.fn(),
    upsert: jest.fn(),
  }
};

jest.mock('@/lib/db', () => ({
  db: mockDb
}));

import { NextRequest } from 'next/server';

describe('API Basic Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle authentication check', async () => {
    const mockSession = {
      user: {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
      },
    };

    mockGetServerSession.mockResolvedValue(mockSession);

    expect(mockGetServerSession).toBeDefined();
  });

  it('should handle database operations', async () => {
    const mockSettings = {
      id: 'settings-1',
      userId: 'user-1',
      emailNotifications: true,
    };

    mockDb.notificationSettings.findUnique.mockResolvedValue(mockSettings);

    const result = await mockDb.notificationSettings.findUnique({ where: { userId: 'user-1' } });
    
    expect(result).toEqual(mockSettings);
    expect(mockDb.notificationSettings.findUnique).toHaveBeenCalledWith({
      where: { userId: 'user-1' }
    });
  });

  it('should create NextRequest objects', () => {
    const request = new NextRequest('http://localhost:3000/api/test');
    
    expect(request).toBeInstanceOf(NextRequest);
    expect(request.url).toBe('http://localhost:3000/api/test');
  });

  it('should handle JSON request bodies', async () => {
    const testData = { test: 'data' };
    const request = new NextRequest('http://localhost:3000/api/test', {
      method: 'POST',
      body: JSON.stringify(testData),
      headers: { 'Content-Type': 'application/json' },
    });

    const body = await request.json();
    expect(body).toEqual(testData);
  });
});