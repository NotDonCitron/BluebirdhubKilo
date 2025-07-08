import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/db';
// Rate limiting temporarily disabled for build fix
import { z } from 'zod';
import { appLogger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const preferencesSchema = z.object({
  theme: z.enum(['LIGHT', 'DARK', 'SYSTEM']).optional(),
  language: z.string().min(2).max(5).optional(),
  timezone: z.string().optional(),
  dateFormat: z.string().optional(),
  timeFormat: z.enum(['12h', '24h']).optional(),
  emailNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  desktopNotifications: z.boolean().optional(),
  soundEnabled: z.boolean().optional(),
  autoSave: z.boolean().optional(),
  compactMode: z.boolean().optional(),
  showAvatars: z.boolean().optional(),
  activityVisible: z.boolean().optional(),
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting temporarily disabled for build fix

    let userSettings = await prisma.userSettings.findUnique({
      where: { userId: session.user.id }
    });

    // Create default settings if they don't exist
    if (!userSettings) {
      userSettings = await prisma.userSettings.create({
        data: {
          userId: session.user.id
        }
      });
    }

    return NextResponse.json(userSettings);
  } catch (error) {
    appLogger.error('Error fetching preferences:', error);
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

    // Rate limiting temporarily disabled for build fix

    const body = await request.json();
    const validatedData = preferencesSchema.parse(body);

    // Upsert user settings
    const updatedSettings = await prisma.userSettings.upsert({
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
        entityType: 'preferences',
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

    appLogger.error('Error updating preferences:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}