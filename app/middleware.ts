import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { generateCSPHeader } from './lib/validation';
import { createIPRateLimit } from './lib/rate-limiting';

// Rate limiters for different endpoints with security-focused limits
const generalRateLimit = createIPRateLimit(300, 60 * 1000); // 300 requests per minute
const authRateLimit = createIPRateLimit(5, 15 * 60 * 1000); // 5 requests per 15 minutes
const apiRateLimit = createIPRateLimit(100, 60 * 1000); // 100 requests per minute

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Block debug endpoints in production
  if (process.env.NODE_ENV === 'production' && pathname.startsWith('/api/debug')) {
    return new NextResponse('Not Found', { status: 404 });
  }
  
  const response = NextResponse.next();
  
  // Security headers
  addSecurityHeaders(response);
  
  // Rate limiting
  if (!handleRateLimit(request)) {
    return new NextResponse('Too Many Requests', { status: 429 });
  }
  
  // Authentication check for protected routes
  if (await shouldProtectRoute(request)) {
    const token = await getToken({ req: request });
    
    if (!token) {
      // Redirect to login for dashboard routes
      if (request.nextUrl.pathname.startsWith('/dashboard')) {
        return NextResponse.redirect(new URL('/login', request.url));
      }
      
      // Return 401 for API routes
      if (request.nextUrl.pathname.startsWith('/api/')) {
        return new NextResponse('Unauthorized', { status: 401 });
      }
    }
  }
  
  // CSRF protection for POST requests
  if (request.method === 'POST' && !request.nextUrl.pathname.startsWith('/api/auth/')) {
    const csrfToken = request.headers.get('x-csrf-token');
    const sessionToken = request.headers.get('x-session-token');
    
    // Skip CSRF for upload endpoints as they use multipart/form-data
    if (!request.nextUrl.pathname.startsWith('/api/upload')) {
      if (!csrfToken || !sessionToken || csrfToken !== sessionToken) {
        return new NextResponse('CSRF token validation failed', { status: 403 });
      }
    }
  }
  
  return response;
}

function addSecurityHeaders(response: NextResponse) {
  // Content Security Policy
  response.headers.set('Content-Security-Policy', generateCSPHeader());
  
  // HSTS (HTTP Strict Transport Security)
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
  );
  
  // X-Frame-Options
  response.headers.set('X-Frame-Options', 'DENY');
  
  // X-Content-Type-Options
  response.headers.set('X-Content-Type-Options', 'nosniff');
  
  // X-XSS-Protection
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  // Referrer Policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions Policy
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  );
  
  // Remove server information
  response.headers.delete('Server');
  response.headers.delete('X-Powered-By');
}

function handleRateLimit(request: NextRequest): boolean {
  const pathname = request.nextUrl.pathname;
  
  // Authentication endpoints
  if (pathname.startsWith('/api/auth/') || pathname === '/login') {
    return authRateLimit(request);
  }
  
  // API endpoints
  if (pathname.startsWith('/api/')) {
    return apiRateLimit(request);
  }
  
  // General rate limiting
  return generalRateLimit(request);
}

async function shouldProtectRoute(request: NextRequest): Promise<boolean> {
  const pathname = request.nextUrl.pathname;
  
  // Protected routes
  const protectedRoutes = [
    '/dashboard',
    '/api/tasks',
    '/api/files',
    '/api/workspaces',
    '/api/comments',
    '/api/settings',
    '/api/users',
    '/api/upload',
  ];
  
  // Public routes that don't need authentication
  const publicRoutes = [
    '/api/auth',
    '/login',
    '/register',
    '/',
    '/about',
    '/privacy',
    '/terms',
    '/_next',
    '/favicon.ico',
  ];
  
  // Add debug routes only in development
  if (process.env.NODE_ENV === 'development') {
    publicRoutes.push('/api/debug');
  }
  
  // Check if route is explicitly public
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return false;
  }
  
  // Check if route needs protection
  return protectedRoutes.some(route => pathname.startsWith(route));
}

// Matcher configuration
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};