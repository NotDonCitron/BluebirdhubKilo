import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { appLogger } from '@/lib/logger';

const securityUpdateSchema = z.object({
  twoFactorEnabled: z.boolean().optional(),
  sessionTimeout: z.number().min(5).max(10080).optional(), // 5 minutes to 1 week
  loginNotifications: z.boolean().optional(),
  suspiciousActivityAlerts: z.boolean().optional(),
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userSettings = await prisma.userSettings.findUnique({
      where: { userId: session.user.id },
      select: {
        twoFactorEnabled: true,
        sessionTimeout: true,
        loginNotifications: true,
        suspiciousActivityAlerts: true,
      },
    });

    if (!userSettings) {
      // Return default security settings
      return NextResponse.json({
        twoFactorEnabled: false,
        sessionTimeout: 480, // 8 hours default
        loginNotifications: true,
        suspiciousActivityAlerts: true,
      });
    }

    return NextResponse.json({
      twoFactorEnabled: userSettings.twoFactorEnabled || false,
      sessionTimeout: userSettings.sessionTimeout || 480,
      loginNotifications: userSettings.loginNotifications ?? true,
      suspiciousActivityAlerts: userSettings.suspiciousActivityAlerts ?? true,
    });
  } catch (error) {
    appLogger.error('Error fetching security settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch security settings' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = securityUpdateSchema.parse(body);

    const updatedSettings = await prisma.userSettings.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        ...validatedData,
      },
      update: validatedData,
    });

    // Log the activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'Updated security settings',
        details: JSON.stringify(validatedData),
      },
    });

    return NextResponse.json({
      twoFactorEnabled: updatedSettings.twoFactorEnabled || false,
      sessionTimeout: updatedSettings.sessionTimeout || 480,
      loginNotifications: updatedSettings.loginNotifications ?? true,
      suspiciousActivityAlerts: updatedSettings.suspiciousActivityAlerts ?? true,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      );
    }
    
    appLogger.error('Error updating security settings:', error);
    return NextResponse.json(
      { error: 'Failed to update security settings' },
      { status: 500 }
    );
  }
}