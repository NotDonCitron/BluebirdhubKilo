import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { eventType } = body;

    // Send a test event
    const eventData = {
      type: eventType || 'test_notification',
      data: {
        message: 'This is a test notification from BlueBirdHub!',
        taskTitle: 'Sample Task',
        senderName: session.user.name || 'System',
        workspaceName: 'Test Workspace',
        fileName: 'test-document.pdf',
        entityTitle: 'Sample Entity',
        timestamp: new Date().toISOString(),
      },
    };

    // In a real implementation, this would trigger the SSE broadcast
    console.log('Test event would be sent:', eventData);

    return NextResponse.json({ 
      success: true, 
      message: 'Test event triggered',
      eventData 
    });
  } catch (error) {
    console.error('Error triggering test event:', error);
    return NextResponse.json(
      { error: 'Failed to trigger test event' },
      { status: 500 }
    );
  }
}