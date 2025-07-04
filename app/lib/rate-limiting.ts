import { NextRequest, NextResponse } from 'next/server';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

// In-memory store for rate limiting (use Redis in production)
const store: RateLimitStore = {};

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  message?: string; // Custom error message
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean; // Don't count failed requests
}

export function createRateLimiter(config: RateLimitConfig) {
  return async (request: NextRequest, getResponse?: () => Promise<NextResponse>) => {
    const key = getClientKey(request);
    const now = Date.now();
    
    // Clean up expired entries
    if (store[key] && now > store[key].resetTime) {
      delete store[key];
    }
    
    // Initialize or get current count
    if (!store[key]) {
      store[key] = {
        count: 0,
        resetTime: now + config.windowMs,
      };
    }
    
    // Check if limit exceeded
    if (store[key].count >= config.maxRequests) {
      return NextResponse.json(
        { 
          error: config.message || 'Too many requests, please try again later.',
          retryAfter: Math.ceil((store[key].resetTime - now) / 1000)
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': config.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': store[key].resetTime.toString(),
          }
        }
      );
    }
    
    // If response function is provided, execute it
    let response: NextResponse;
    if (getResponse) {
      response = await getResponse();
      
      // Only count request if it meets criteria
      const shouldCount = !config.skipSuccessfulRequests || response.status >= 400;
      if (shouldCount && (!config.skipFailedRequests || response.status < 400)) {
        store[key].count++;
      }
    } else {
      // Count the request
      store[key].count++;
      response = NextResponse.next();
    }
    
    // Add rate limit headers
    response.headers.set('X-RateLimit-Limit', config.maxRequests.toString());
    response.headers.set('X-RateLimit-Remaining', Math.max(0, config.maxRequests - store[key].count).toString());
    response.headers.set('X-RateLimit-Reset', store[key].resetTime.toString());
    
    return response;
  };
}

function getClientKey(request: NextRequest): string {
  // Try to get IP from various headers
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const remoteAddress = request.ip;
  
  const ip = forwarded?.split(',')[0]?.trim() || realIp || remoteAddress || 'unknown';
  
  // Include user ID if available for more granular limiting
  const userId = request.headers.get('x-user-id') || '';
  
  return `${ip}:${userId}`;
}

// Predefined rate limiters
export const strictRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 10,
  message: 'Too many attempts, please try again later.',
});

export const authRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5,
  message: 'Too many authentication attempts, please try again later.',
});

export const apiRateLimit = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100,
  message: 'API rate limit exceeded, please slow down.',
});

export const fileUploadRateLimit = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10,
  message: 'Too many file uploads, please wait.',
});

// Utility function for API routes
export function withRateLimit(handler: Function, rateLimiter: Function) {
  return async (request: NextRequest) => {
    const rateLimitResponse = await rateLimiter(request, async () => {
      return handler(request);
    });
    
    return rateLimitResponse;
  };
}

// IP-based rate limiting for specific endpoints
export function createIPRateLimit(maxRequests: number, windowMs: number) {
  const ipStore: { [ip: string]: { count: number; resetTime: number } } = {};
  
  return (request: NextRequest) => {
    const ip = getClientKey(request).split(':')[0];
    const now = Date.now();
    
    if (!ipStore[ip] || now > ipStore[ip].resetTime) {
      ipStore[ip] = { count: 1, resetTime: now + windowMs };
      return true;
    }
    
    if (ipStore[ip].count >= maxRequests) {
      return false;
    }
    
    ipStore[ip].count++;
    return true;
  };
}

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  Object.keys(store).forEach(key => {
    if (store[key] && now > store[key].resetTime) {
      delete store[key];
    }
  });
}, 5 * 60 * 1000); // Clean up every 5 minutes