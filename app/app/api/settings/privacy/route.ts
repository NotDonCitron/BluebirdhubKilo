import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { appLogger } from '@/lib/logger';

const privacyUpdateSchema = z.object({
  profileVisibility: z.enum(['PUBLIC', 'WORKSPACE_ONLY', 'PRIVATE']).optional(),
  activityVisible: z.boolean().optional(),
  showOnlineStatus: z.boolean().optional(),
  allowDirectMessages: z.boolean().optional(),
  allowWorkspaceInvites: z.boolean().optional(),
  dataProcessingConsent: z.boolean().optional(),
  analyticsConsent: z.boolean().optional(),
  marketingConsent: z.boolean().optional(),
  shareUsageData: z.boolean().optional(),
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
        id: true,
        profileVisibility: true,
        activityVisible: true,
        showOnlineStatus: true,
        allowDirectMessages: true,
        allowWorkspaceInvites: true,
        dataProcessingConsent: true,
        analyticsConsent: true,
        marketingConsent: true,
        shareUsageData: true,
      },
    });

    if (!userSettings) {
      // Create default settings
      const defaultSettings = await prisma.userSettings.create({
        data: {
          userId: session.user.id,
          profileVisibility: 'WORKSPACE_ONLY',
          activityVisible: true,
          showOnlineStatus: true,
          allowDirectMessages: true,
          allowWorkspaceInvites: true,
          dataProcessingConsent: true,
          analyticsConsent: true,
          marketingConsent: false,
          shareUsageData: false,
        },
        select: {
          id: true,
          profileVisibility: true,
          activityVisible: true,
          showOnlineStatus: true,
          allowDirectMessages: true,
          allowWorkspaceInvites: true,
          dataProcessingConsent: true,
          analyticsConsent: true,
          marketingConsent: true,
          shareUsageData: true,
        },
      });
      return NextResponse.json(defaultSettings);
    }

    return NextResponse.json(userSettings);
  } catch (error) {
    appLogger.error('Error fetching privacy settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch privacy settings' },
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
    const validatedData = privacyUpdateSchema.parse(body);

    const updatedSettings = await prisma.userSettings.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        ...validatedData,
      },
      update: validatedData,
      select: {
        id: true,
        profileVisibility: true,
        activityVisible: true,
        showOnlineStatus: true,
        allowDirectMessages: true,
        allowWorkspaceInvites: true,
        dataProcessingConsent: true,
        analyticsConsent: true,
        marketingConsent: true,
        shareUsageData: true,
      },
    });

    // Log the activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'Updated privacy settings',
        details: JSON.stringify(validatedData),
      },
    });

    return NextResponse.json(updatedSettings);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      );
    }
    
    appLogger.error('Error updating privacy settings:', error);
    return NextResponse.json(
      { error: 'Failed to update privacy settings' },
      { status: 500 }
    );
  }
}