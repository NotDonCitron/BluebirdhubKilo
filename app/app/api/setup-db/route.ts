import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { execSync } from 'child_process';
import { appLogger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    appLogger.info('🔧 Setting up production database...');
    
    // Try to push schema first
    try {
      appLogger.info('🔄 Pushing database schema...');
      execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
    } catch (schemaError: unknown) {
      const errorMessage = schemaError instanceof Error ? schemaError.message : String(schemaError);
      appLogger.info('Schema push result:', errorMessage);
    }
    
    // Check if demo user already exists
    let existingUser;
    try {
      existingUser = await prisma.user.findUnique({
        where: { email: 'john@doe.com' }
      });
    } catch (error) {
      appLogger.info('🔄 Database needs initialization, will seed');
      existingUser = null;
    }

    if (existingUser) {
      appLogger.info('✅ Database already set up');
      return NextResponse.json({ 
        success: true, 
        message: 'Database already initialized' 
      });
    }

    // Run the seed script
    try {
      appLogger.info('🌱 Running database seed...');
      execSync('npx prisma db seed', { stdio: 'inherit' });
      
      return NextResponse.json({ 
        success: true, 
        message: 'Database seeded successfully'
      });
    } catch (seedError: unknown) {
      const errorMessage = seedError instanceof Error ? seedError.message : String(seedError);
      appLogger.error('Seed error:', errorMessage);
      
      // Fallback: Create demo user manually
      const hashedPassword = await bcrypt.hash('johndoe123', 12);
      
      const demoUser = await prisma.user.create({
        data: {
          email: 'john@doe.com',
          name: 'John Doe',
          password: hashedPassword,
          role: 'ADMIN',
        },
      });

      appLogger.info('✅ Demo user created:', demoUser.email);

      // Create a basic workspace
      await prisma.workspace.create({
        data: {
          name: 'Demo Workspace',
          description: 'Welcome to your demo workspace',
          color: '#3B82F6',
          icon: '🚀',
          ownerId: demoUser.id,
        },
      });

      appLogger.info('✅ Demo workspace created');

      return NextResponse.json({ 
        success: true, 
        message: 'Database initialized successfully',
        user: { email: demoUser.email, name: demoUser.name }
      });
    }
    
  } catch (error) {
    appLogger.error('💥 Database setup error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to initialize database' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Test database connectivity
    const userCount = await prisma.user.count();
    return NextResponse.json({ 
      success: true, 
      userCount,
      message: 'Database connection successful' 
    });
  } catch (error) {
    appLogger.error('💥 Database connection error:', error);
    return NextResponse.json(
      { success: false, error: 'Database connection failed' },
      { status: 500 }
    );
  }
}