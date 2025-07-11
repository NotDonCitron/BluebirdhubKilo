
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/db';
import { rateLimiters, getClientIdentifier } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Apply general API rate limiting
    const identifier = getClientIdentifier(request, session.user.id);
    if (!rateLimiters.api(identifier)) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded',
          message: 'Too many API requests, please try again later.'
        },
        { 
          status: 429,
          headers: { 'Retry-After': '900' } // 15 minutes
        }
      );
    }

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const assignedToMe = searchParams.get('assignedToMe');

    const whereCondition: any = {
      workspace: {
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
      }
    };

    if (workspaceId) {
      whereCondition.workspaceId = workspaceId;
    }

    if (status) {
      whereCondition.status = status;
    }

    if (priority) {
      whereCondition.priority = priority;
    }

    if (assignedToMe === 'true') {
      whereCondition.assignments = {
        some: {
          userId: session.user.id
        }
      };
    }

    const tasks = await prisma.task.findMany({
      where: whereCondition,
      include: {
        createdBy: {
          select: { id: true, name: true, email: true, image: true }
        },
        workspace: {
          select: { id: true, name: true, color: true, icon: true }
        },
        assignments: {
          include: {
            user: {
              select: { id: true, name: true, email: true, image: true }
            }
          }
        },
        _count: {
          select: { comments: true }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, description, status, priority, dueDate, workspaceId, assignedUserIds } = await request.json();

    if (!title || !workspaceId) {
      return NextResponse.json(
        { error: 'Title and workspace are required' },
        { status: 400 }
      );
    }

    // Check if user has access to workspace
    const workspace = await prisma.workspace.findFirst({
      where: {
        id: workspaceId,
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
      }
    });

    if (!workspace) {
      return NextResponse.json(
        { error: 'Workspace not found or unauthorized' },
        { status: 404 }
      );
    }

    const task = await prisma.task.create({
      data: {
        title,
        description,
        status: status || 'TODO',
        priority: priority || 'MEDIUM',
        dueDate: dueDate ? new Date(dueDate) : null,
        workspaceId,
        createdById: session.user.id,
        assignments: assignedUserIds?.length ? {
          create: assignedUserIds.map((userId: string) => ({
            userId
          }))
        } : undefined
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true, image: true }
        },
        workspace: {
          select: { id: true, name: true, color: true, icon: true }
        },
        assignments: {
          include: {
            user: {
              select: { id: true, name: true, email: true, image: true }
            }
          }
        },
        _count: {
          select: { comments: true }
        }
      }
    });

    return NextResponse.json(task);
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
