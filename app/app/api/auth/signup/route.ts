
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { appLogger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  // Add comprehensive error logging
  appLogger.info('=== SIGNUP API START ===');
  appLogger.info('Signup API started', { timestamp: new Date().toISOString() });
  appLogger.info('Request details', { url: request.url });
  appLogger.info('Request method', { method: request.method });
  
  try {
    // Use Next.js built-in JSON parsing with error handling
    let body;
    try {
      body = await request.json();
      appLogger.info('JSON parsed successfully');
      appLogger.info('Request body keys:', Object.keys(body));
    } catch (jsonError) {
      appLogger.error('JSON parsing failed', jsonError as Error);
      return NextResponse.json(
        { 
          error: 'Invalid JSON format',
          details: 'Request body must be valid JSON',
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }

    appLogger.info('Signup attempt', { 
      email: body?.email, 
      name: body?.name, 
      hasPassword: !!body?.password 
    });
    
    const { email, password, name } = body;

    // Validate required fields
    if (!email || !password || !name) {
      appLogger.warn('Signup validation failed', { 
        email: !!email, 
        password: !!password, 
        name: !!name 
      });
      return NextResponse.json(
        { 
          error: 'Missing required fields',
          details: 'Email, password, and name are all required',
          required: ['email', 'password', 'name'],
          received: Object.keys(body),
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      appLogger.info('Invalid email format:', email);
      return NextResponse.json(
        { 
          error: 'Invalid email format',
          details: 'Please provide a valid email address',
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }

    appLogger.info('Validation passed - checking if user exists');

    // Check if user already exists
    let existingUser;
    try {
      existingUser = await prisma.user.findUnique({
        where: { email }
      });
      appLogger.info('Database query completed', { userExists: !!existingUser });
    } catch (dbError) {
      appLogger.error('Database error during user lookup', dbError as Error);
      return NextResponse.json(
        { 
          error: 'Database connection error',
          details: 'Unable to check existing users',
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      );
    }

    if (existingUser) {
      appLogger.info('User already exists with email:', email);
      return NextResponse.json(
        { 
          error: 'User already exists',
          details: 'An account with this email address already exists',
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }

    appLogger.info('User does not exist - proceeding with creation');

    // Hash password
    let hashedPassword;
    try {
      hashedPassword = await bcrypt.hash(password, 12);
      appLogger.info('Password hashed successfully');
    } catch (hashError) {
      appLogger.error('Password hashing error:', hashError as Error);
      return NextResponse.json(
        { 
          error: 'Password processing error',
          details: 'Unable to process password',
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      );
    }

    // Create user
    let user;
    try {
      appLogger.info('Creating user with data:', { email, name });
      user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name
          // role defaults to USER as per schema
        }
      });
      appLogger.info('User created successfully', { userId: user.id });
    } catch (createError) {
      appLogger.error('User creation error:', createError as Error);
      return NextResponse.json(
        { 
          error: 'User creation failed',
          details: 'Unable to create user account',
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      );
    }

    appLogger.info('=== SIGNUP SUCCESS ===');
    return NextResponse.json({
      message: 'User created successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    appLogger.error('=== SIGNUP CRITICAL ERROR ===');
    appLogger.error('Critical error during signup', error as Error, {
      errorType: error?.constructor?.name || 'Unknown'
    });
    appLogger.error('=== END CRITICAL ERROR ===');
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: 'An unexpected error occurred during registration',
        errorType: (error as Error)?.constructor?.name || 'Unknown',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
