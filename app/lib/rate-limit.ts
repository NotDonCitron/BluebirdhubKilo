import { NextRequest, NextResponse } from 'next/server';

interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum number of requests per window
  message?: string; // Custom error message
}

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

// In-memory store for rate limiting
// In production, you'd want to use Redis or another external store
const store = new Map<string, RateLimitRecord>();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of store.entries()) {
    if (now > record.resetTime) {
      store.delete(key);
    }
  }
}, 60000); // Clean up every minute

export function createRateLimit(options: RateLimitOptions) {
  const { windowMs, maxRequests, message = 'Too many requests, please try again later.' } = options;

  return function rateLimit(identifier: string): boolean {
    const now = Date.now();
    const key = identifier;
    
    let record = store.get(key);
    
    if (!record) {
      // First request for this identifier
      record = {
        count: 1,
        resetTime: now + windowMs,
      };
      store.set(key, record);
      return true;
    }
    
    if (now > record.resetTime) {
      // Window has expired, reset
      record.count = 1;
      record.resetTime = now + windowMs;
      store.set(key, record);
      return true;
    }
    
    if (record.count >= maxRequests) {
      // Rate limit exceeded
      return false;
    }
    
    // Increment count
    record.count++;
    store.set(key, record);
    return true;
  };
}

// Helper function to get client identifier
export function getClientIdentifier(request: NextRequest, userId?: string): string {
  // Prefer user ID if available (for authenticated requests)
  if (userId) {
    return `user:${userId}`;
  }
  
  // Fallback to IP address
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0]?.trim() || realIp || 'unknown';
  
  return `ip:${ip}`;
}

// Predefined rate limiters for different endpoint types
export const rateLimiters = {
  // General API endpoints
  api: createRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100, // 100 requests per 15 minutes
    message: 'Too many API requests, please try again later.',
  }),
  
  // Authentication endpoints (more restrictive)
  auth: createRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 login attempts per 15 minutes
    message: 'Too many login attempts, please try again later.',
  }),
  
  // File upload endpoints
  upload: createRateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 50, // 50 uploads per hour
    message: 'Too many file uploads, please try again later.',
  }),
  
};

// Helper function to apply rate limiting to API routes
export function withRateLimit(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>,
  limiter: (identifier: string) => boolean,
  getIdentifier?: (request: NextRequest) => string | Promise<string>
) {
  return async function rateLimitedHandler(request: NextRequest, context?: any): Promise<NextResponse> {
    try {
      const identifier = getIdentifier 
        ? await getIdentifier(request)
        : getClientIdentifier(request);
      
      if (!limiter(identifier)) {
        return NextResponse.json(
          { 
            error: 'Rate limit exceeded',
            message: 'Too many requests, please try again later.',
            retryAfter: '15 minutes'
          },
          { 
            status: 429,
            headers: {
              'Retry-After': '900', // 15 minutes in seconds
              'X-RateLimit-Limit': '100',
              'X-RateLimit-Remaining': '0',
            }
          }
        );
      }
      
      return await handler(request, context);
    } catch (error) {
      console.error('Rate limiting error:', error);
      // If rate limiting fails, allow the request to proceed
      return await handler(request, context);
    }
  };
}

// Middleware function for session-based rate limiting
export async function rateLimitBySession(
  request: NextRequest, 
  limiter: (identifier: string) => boolean
): Promise<NextResponse | null> {
  try {
    // For session-based limiting, we'll use IP as identifier
    // In a real app, you might extract user ID from session
    const identifier = getClientIdentifier(request);
    
    if (!limiter(identifier)) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded',
          message: 'Too many requests, please try again later.'
        },
        { 
          status: 429,
          headers: {
            'Retry-After': '900', // 15 minutes
          }
        }
      );
    }
    
    return null; // No rate limit hit, proceed with request
  } catch (error) {
    console.error('Rate limiting middleware error:', error);
    return null; // Allow request to proceed if rate limiting fails
  }
}