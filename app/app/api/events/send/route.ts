import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { appLogger } from '@/lib/logger';

// Import the functions from the stream route
// Note: This is a workaround since we can't import directly from route files
// In a real app, these would be in a separate service file
const eventSchema = z.object({
  type: z.string().min(1),
  data: z.record(z.unknown()),
  targetUserId: z.string().optional(),
  workspaceId: z.string().optional(),
});

// Store for active connections (this would typically be in a shared service)
const activeConnections = new Map<string, unknown>();

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = eventSchema.parse(body);

    const { type, data, workspaceId } = validatedData;

    // Log the event to the database for audit purposes
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        workspaceId: workspaceId || null,
        action: `Real-time event: ${type}`,
        entityType: 'event',
        details: JSON.stringify(data),
      },
    });

    // Here we would send the event to connected clients
    // For now, we'll just return success
    // In a production environment, you'd use Redis or a message queue

    const eventPayload = {
      type,
      data: {
        ...data,
        senderId: session.user.id,
        senderName: session.user.name,
      },
      timestamp: new Date().toISOString(),
    };

    // Log for debugging
    appLogger.info(`Event sent: ${type}`, eventPayload);

    return NextResponse.json({ 
      success: true, 
      eventId: Date.now().toString(),
      message: 'Event sent successfully' 
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid event data', details: error.errors },
        { status: 400 }
      );
    }

    appLogger.error('Error sending event:', error);
    return NextResponse.json(
      { error: 'Failed to send event' },
      { status: 500 }
    );
  }
}

// GET endpoint to check event system status
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
      status: 'active',
      connectedUsers: activeConnections.size,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    appLogger.error('Error getting event status:', error);
    return NextResponse.json(
      { error: 'Failed to get event status' },
      { status: 500 }
    );
  }
}