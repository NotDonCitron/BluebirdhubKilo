
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const task = await prisma.task.findFirst({
      where: {
        id: params.id,
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
        comments: {
          include: {
            user: {
              select: { id: true, name: true, email: true, image: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error('Error fetching task:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, description, status, priority, dueDate, assignedUserIds } = await request.json();

    const task = await prisma.task.findFirst({
      where: {
        id: params.id,
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
      }
    });

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found or unauthorized' },
        { status: 404 }
      );
    }

    // Update assignments if provided
    if (assignedUserIds !== undefined) {
      await prisma.taskAssignment.deleteMany({
        where: { taskId: params.id }
      });

      if (assignedUserIds.length > 0) {
        await prisma.taskAssignment.createMany({
          data: assignedUserIds.map((userId: string) => ({
            taskId: params.id,
            userId
          }))
        });
      }
    }

    const updatedTask = await prisma.task.update({
      where: { id: params.id },
      data: {
        title,
        description,
        status,
        priority,
        dueDate: dueDate ? new Date(dueDate) : null
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

    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const task = await prisma.task.findFirst({
      where: {
        id: params.id,
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
      }
    });

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found or unauthorized' },
        { status: 404 }
      );
    }

    await prisma.task.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
