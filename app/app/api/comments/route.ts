
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { content, taskId, fileId } = await request.json();

    if (!content || (!taskId && !fileId)) {
      return NextResponse.json(
        { error: 'Content and either taskId or fileId are required' },
        { status: 400 }
      );
    }

    let comment;

    if (taskId) {
      // Verify user has access to the task
      const task = await prisma.task.findFirst({
        where: {
          id: taskId,
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

      comment = await prisma.taskComment.create({
        data: {
          content,
          taskId,
          userId: session.user.id
        },
        include: {
          user: {
            select: { id: true, name: true, email: true, image: true }
          }
        }
      });
    } else if (fileId) {
      // Verify user has access to the file
      const file = await prisma.file.findFirst({
        where: {
          id: fileId,
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

      if (!file) {
        return NextResponse.json(
          { error: 'File not found or unauthorized' },
          { status: 404 }
        );
      }

      comment = await prisma.fileComment.create({
        data: {
          content,
          fileId,
          userId: session.user.id
        },
        include: {
          user: {
            select: { id: true, name: true, email: true, image: true }
          }
        }
      });
    }

    return NextResponse.json(comment);
  } catch (error) {
    console.error('Error creating comment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
