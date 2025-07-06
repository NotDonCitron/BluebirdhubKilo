
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  // Add comprehensive error logging
  console.log('=== SIGNUP API START ===');
  console.log('Timestamp:', new Date().toISOString());
  console.log('URL:', request.url);
  console.log('Method:', request.method);
  
  try {
    // Use Next.js built-in JSON parsing with error handling
    let body;
    try {
      body = await request.json();
      console.log('JSON parsed successfully');
      console.log('Request body keys:', Object.keys(body));
    } catch (jsonError) {
      console.error('JSON parsing failed:', jsonError);
      return NextResponse.json(
        { 
          error: 'Invalid JSON format',
          details: 'Request body must be valid JSON',
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }

    console.log('Signup request data:', { 
      email: body?.email, 
      name: body?.name, 
      hasPassword: !!body?.password 
    });
    
    const { email, password, name } = body;

    // Validate required fields
    if (!email || !password || !name) {
      console.log('Validation failed - Missing fields:', { 
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
      console.log('Invalid email format:', email);
      return NextResponse.json(
        { 
          error: 'Invalid email format',
          details: 'Please provide a valid email address',
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }

    console.log('Validation passed - checking if user exists');

    // Check if user already exists
    let existingUser;
    try {
      existingUser = await prisma.user.findUnique({
        where: { email }
      });
      console.log('Database query completed - user exists:', !!existingUser);
    } catch (dbError) {
      console.error('Database error during user lookup:', dbError);
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
      console.log('User already exists with email:', email);
      return NextResponse.json(
        { 
          error: 'User already exists',
          details: 'An account with this email address already exists',
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }

    console.log('User does not exist - proceeding with creation');

    // Hash password
    let hashedPassword;
    try {
      hashedPassword = await bcrypt.hash(password, 12);
      console.log('Password hashed successfully');
    } catch (hashError) {
      console.error('Password hashing error:', hashError);
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
      console.log('Creating user with data:', { email, name });
      user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name
          // role defaults to USER as per schema
        }
      });
      console.log('User created successfully with ID:', user.id);
    } catch (createError) {
      console.error('User creation error:', createError);
      return NextResponse.json(
        { 
          error: 'User creation failed',
          details: 'Unable to create user account',
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      );
    }

    console.log('=== SIGNUP SUCCESS ===');
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
    console.error('=== SIGNUP CRITICAL ERROR ===');
    console.error('Error type:', error?.constructor?.name);
    console.error('Error message:', (error as Error)?.message);
    console.error('Error stack:', (error as Error)?.stack);
    console.error('=== END CRITICAL ERROR ===');
    
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
