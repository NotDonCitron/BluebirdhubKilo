
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/db';
import { appLogger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workspaces = await prisma.workspace.findMany({
      where: {
        OR: [
          { ownerId: session.user.id },
          {
            members: {
              some: {
                userId: session.user.id
              }
            }
          }
        ]
      },
      include: {
        owner: {
          select: { id: true, name: true, email: true, image: true }
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, image: true }
            }
          }
        },
        _count: {
          select: { tasks: true, files: true }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    return NextResponse.json(workspaces);
  } catch (error) {
    appLogger.error('Error fetching workspaces', error as Error, {
      userId: session?.user?.id
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const start = Date.now();
  
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      appLogger.warn('Unauthorized workspace creation attempt', {
        hasSession: !!session,
        hasUser: !!session?.user,
        hasUserId: !!session?.user?.id
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, description, color, icon } = await request.json();
    
    appLogger.info('Workspace creation request', {
      userId: session.user.id,
      hasName: !!name,
      hasDescription: !!description,
      hasColor: !!color,
      hasIcon: !!icon
    });

    if (!name) {
      appLogger.warn('Workspace creation failed - missing name', {
        userId: session.user.id
      });
      return NextResponse.json(
        { error: 'Workspace name is required' },
        { status: 400 }
      );
    }

    const workspace = await prisma.workspace.create({
      data: {
        name,
        description,
        color: color || '#3B82F6',
        icon,
        ownerId: session.user.id
      },
      include: {
        owner: {
          select: { id: true, name: true, email: true, image: true }
        },
        _count: {
          select: { tasks: true, files: true }
        }
      }
    });

    const duration = Date.now() - start;
    appLogger.info('Workspace created successfully', {
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      ownerId: workspace.ownerId,
      duration
    });

    return NextResponse.json(workspace);
  } catch (error) {
    const duration = Date.now() - start;
    appLogger.error('Workspace creation failed', error as Error, {
      userId: session?.user?.id,
      duration
    });
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
