import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/db';
import { rateLimiters, getClientIdentifier } from '@/lib/rate-limit';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const notificationSchema = z.object({
  taskAssigned: z.boolean().optional(),
  taskCompleted: z.boolean().optional(),
  taskOverdue: z.boolean().optional(),
  commentAdded: z.boolean().optional(),
  fileShared: z.boolean().optional(),
  workspaceInvite: z.boolean().optional(),
  weeklyDigest: z.boolean().optional(),
  monthlyReport: z.boolean().optional(),
  marketingEmails: z.boolean().optional(),
  frequency: z.enum(['REAL_TIME', 'HOURLY', 'DAILY', 'WEEKLY', 'NEVER']).optional(),
  quietHoursStart: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional().nullable(),
  quietHoursEnd: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional().nullable(),
  weekendsEnabled: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Apply rate limiting
    const identifier = getClientIdentifier(request, session.user.id);
    if (!rateLimiters.api(identifier)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', message: 'Too many requests' },
        { status: 429 }
      );
    }

    let notificationSettings = await prisma.notificationSettings.findUnique({
      where: { userId: session.user.id }
    });

    // Create default settings if they don't exist
    if (!notificationSettings) {
      notificationSettings = await prisma.notificationSettings.create({
        data: {
          userId: session.user.id
        }
      });
    }

    return NextResponse.json(notificationSettings);
  } catch (error) {
    console.error('Error fetching notification settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
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

    // Apply rate limiting
    const identifier = getClientIdentifier(request, session.user.id);
    if (!rateLimiters.api(identifier)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', message: 'Too many requests' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const validatedData = notificationSchema.parse(body);

    // Upsert notification settings
    const updatedSettings = await prisma.notificationSettings.upsert({
      where: { userId: session.user.id },
      update: validatedData,
      create: {
        userId: session.user.id,
        ...validatedData
      }
    });

    // Log the activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'SETTINGS_UPDATED',
        entityType: 'notifications',
        entityId: session.user.id,
        details: {
          updatedFields: Object.keys(validatedData)
        }
      }
    });

    return NextResponse.json(updatedSettings);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating notification settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}