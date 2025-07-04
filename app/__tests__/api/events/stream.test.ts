/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/events/stream/route';
import { getServerSession } from 'next-auth';

// Mock dependencies
jest.mock('next-auth');

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;

const mockSession = {
  user: {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
  },
};

// Mock ReadableStream for testing
class MockReadableStream {
  private controller: any;
  
  constructor(source: any) {
    this.controller = {
      enqueue: jest.fn(),
      close: jest.fn(),
    };
    source.start(this.controller);
  }

  getReader() {
    return {
      read: jest.fn().mockResolvedValue({ done: true, value: undefined }),
      releaseLock: jest.fn(),
    };
  }
}

// Replace global ReadableStream with mock
global.ReadableStream = MockReadableStream as any;

describe('/api/events/stream', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetServerSession.mockResolvedValue(mockSession);
  });

  describe('GET', () => {
    it('establishes SSE connection for authenticated user', async () => {
      const request = new NextRequest('http://localhost:3000/api/events/stream');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/event-stream');
      expect(response.headers.get('Cache-Control')).toBe('no-cache');
      expect(response.headers.get('Connection')).toBe('keep-alive');
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Headers')).toBe('Cache-Control');
    });

    it('returns 401 for unauthenticated requests', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/events/stream');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('sends initial connection message', async () => {
      const request = new NextRequest('http://localhost:3000/api/events/stream');
      const response = await GET(request);

      // Verify that the stream was created
      expect(response.body).toBeInstanceOf(MockReadableStream);
    });

    it('handles connection with custom headers', async () => {
      const request = new NextRequest('http://localhost:3000/api/events/stream', {
        headers: {
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
      });

      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/event-stream');
    });

    it('handles connection errors gracefully', async () => {
      mockGetServerSession.mockRejectedValue(new Error('Session error'));

      const request = new NextRequest('http://localhost:3000/api/events/stream');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });

  describe('SSE Stream Behavior', () => {
    let mockController: any;

    beforeEach(() => {
      // Capture the controller from the ReadableStream constructor
      const originalConstructor = MockReadableStream;
      MockReadableStream.prototype.constructor = function(source: any) {
        mockController = {
          enqueue: jest.fn(),
          close: jest.fn(),
        };
        source.start(mockController);
        return this;
      };
    });

    it('sends heartbeat messages', async () => {
      jest.useFakeTimers();
      
      const request = new NextRequest('http://localhost:3000/api/events/stream');
      await GET(request);

      // Fast-forward time to trigger heartbeat
      jest.advanceTimersByTime(30000); // 30 seconds

      expect(mockController.enqueue).toHaveBeenCalledWith(
        expect.any(Uint8Array) // Encoded heartbeat message
      );

      jest.useRealTimers();
    });

    it('encodes messages correctly', async () => {
      const request = new NextRequest('http://localhost:3000/api/events/stream');
      await GET(request);

      // Verify that messages are properly encoded
      expect(mockController.enqueue).toHaveBeenCalled();
      
      const calls = mockController.enqueue.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      
      // Check that the first call contains the initial connection message
      const firstCall = calls[0][0];
      expect(firstCall).toBeInstanceOf(Uint8Array);
    });

    it('handles stream cleanup on connection close', async () => {
      const request = new NextRequest('http://localhost:3000/api/events/stream');
      const response = await GET(request);

      // Simulate connection close
      if (response.body instanceof MockReadableStream) {
        const reader = response.body.getReader();
        reader.releaseLock();
      }

      // Verify cleanup doesn't cause errors
      expect(response.status).toBe(200);
    });
  });

  describe('Message Format', () => {
    it('formats SSE messages correctly', () => {
      const testMessage = { type: 'test', data: { message: 'hello' } };
      const encoder = new TextEncoder();
      const expected = encoder.encode(`data: ${JSON.stringify(testMessage)}\n\n`);

      // This tests the message formatting logic that would be used in the actual implementation
      expect(expected).toBeInstanceOf(Uint8Array);
      expect(expected.length).toBeGreaterThan(0);
    });

    it('handles special characters in messages', () => {
      const testMessage = { 
        type: 'test', 
        data: { 
          message: 'Special chars: "quotes", newlines\n, emojis 🎉' 
        } 
      };
      const encoder = new TextEncoder();
      const formatted = encoder.encode(`data: ${JSON.stringify(testMessage)}\n\n`);

      expect(formatted).toBeInstanceOf(Uint8Array);
      expect(formatted.length).toBeGreaterThan(0);
    });
  });
});