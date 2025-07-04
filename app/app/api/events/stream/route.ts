import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { addConnection, removeConnection } from '@/lib/sse-utils';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    const userId = session.user.id;

    // Create a readable stream for SSE
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        
        // Send initial connection message
        const initialMessage = {
          type: 'connection',
          data: {
            message: 'Connected to BlueBirdHub real-time updates',
            userId: userId,
            timestamp: new Date().toISOString(),
          },
        };

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(initialMessage)}\n\n`)
        );

        // Store the connection
        const writer = controller as any;
        addConnection(userId, writer);

        // Send heartbeat every 30 seconds
        const heartbeatInterval = setInterval(() => {
          try {
            const heartbeat = {
              type: 'heartbeat',
              data: {
                timestamp: new Date().toISOString(),
              },
            };
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(heartbeat)}\n\n`)
            );
          } catch (error) {
            console.error('Heartbeat error:', error);
            clearInterval(heartbeatInterval);
            removeConnection(userId);
          }
        }, 30000);

        // Handle client disconnect
        request.signal.addEventListener('abort', () => {
          clearInterval(heartbeatInterval);
          removeConnection(userId);
          try {
            controller.close();
          } catch (error) {
            // Connection already closed
          }
        });
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
      },
    });
  } catch (error) {
    console.error('SSE connection error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}