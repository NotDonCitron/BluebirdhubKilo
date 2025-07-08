import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { appLogger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  appLogger.debug('🔍 DEBUG AUTH TEST API CALLED');
  
  try {
    const body = await request.json();
    const { email, password } = body;
    
    appLogger.info('📨 Request data:', { email, hasPassword: !!password });
    
    // Test 1: Check environment variables
    appLogger.info('🌍 Environment check:');
    appLogger.info('  DATABASE_URL:', process.env.DATABASE_URL);
    appLogger.info('  NEXTAUTH_SECRET:', process.env.NEXTAUTH_SECRET ? 'SET' : 'MISSING');
    appLogger.info('  NEXTAUTH_URL:', process.env.NEXTAUTH_URL);
    
    // Test 2: Database connection
    appLogger.info('💾 Testing database connection...');
    await prisma.$connect();
    appLogger.info('✅ Database connected successfully');
    
    // Test 3: User lookup
    appLogger.info('👤 Looking up user...');
    const user = await prisma.user.findUnique({
      where: { email: email }
    });
    
    console.log('👤 User lookup result:', {
      found: !!user,
      email: user?.email,
      name: user?.name,
      hasPassword: !!user?.password,
      role: user?.role,
      id: user?.id
    });
    
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'User not found',
        debug: {
          email_searched: email,
          database_url: process.env.DATABASE_URL,
          user_found: false
        }
      });
    }
    
    if (!user.password) {
      return NextResponse.json({
        success: false,
        error: 'User has no password',
        debug: {
          email: user.email,
          has_password: false
        }
      });
    }
    
    // Test 4: Password verification
    appLogger.info('🔑 Testing password...');
    const isPasswordValid = await bcrypt.compare(password, user.password);
    appLogger.info('🔑 Password result:', { isValid: isPasswordValid });
    
    // Test 5: List all users for debugging
    appLogger.info('📋 All users in database:');
    const allUsers = await prisma.user.findMany({
      select: { email: true, name: true, role: true }
    });
    appLogger.info('📋 Users:', allUsers);
    
    await prisma.$disconnect();
    
    return NextResponse.json({
      success: isPasswordValid,
      debug: {
        user_found: true,
        email: user.email,
        name: user.name,
        password_valid: isPasswordValid,
        database_url: process.env.DATABASE_URL,
        total_users: allUsers.length,
        all_users: allUsers
      }
    });
    
  } catch (error) {
    appLogger.error('💥 Auth test error:', error);
    return NextResponse.json({
      success: false,
      error: 'Database or auth error',
      debug: {
        error_message: (error as Error).message,
        error_type: (error as Error).constructor.name,
        database_url: process.env.DATABASE_URL
      }
    }, { status: 500 });
  }
}