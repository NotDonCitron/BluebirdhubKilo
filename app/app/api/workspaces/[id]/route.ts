
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/db';
import { appLogger } from '@/lib/logger';

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

    const workspace = await prisma.workspace.findFirst({
      where: {
        id: params.id,
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
        tasks: {
          include: {
            createdBy: {
              select: { id: true, name: true, email: true, image: true }
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
        },
        files: {
          include: {
            uploadedBy: {
              select: { id: true, name: true, email: true, image: true }
            },
            folder: true,
            tags: true,
            _count: {
              select: { comments: true }
            }
          },
          orderBy: { updatedAt: 'desc' }
        },
        folders: {
          orderBy: { name: 'asc' }
        }
      }
    });

    if (!workspace) {
      return NextResponse.json(
        { error: 'Workspace not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(workspace);
  } catch (error) {
    appLogger.error('Error fetching workspace:', error);
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

    const { name, description, color, icon } = await request.json();

    const workspace = await prisma.workspace.findFirst({
      where: {
        id: params.id,
        ownerId: session.user.id
      }
    });

    if (!workspace) {
      return NextResponse.json(
        { error: 'Workspace not found or unauthorized' },
        { status: 404 }
      );
    }

    const updatedWorkspace = await prisma.workspace.update({
      where: { id: params.id },
      data: {
        name,
        description,
        color,
        icon
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

    return NextResponse.json(updatedWorkspace);
  } catch (error) {
    appLogger.error('Error updating workspace:', error);
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

    const workspace = await prisma.workspace.findFirst({
      where: {
        id: params.id,
        ownerId: session.user.id
      }
    });

    if (!workspace) {
      return NextResponse.json(
        { error: 'Workspace not found or unauthorized' },
        { status: 404 }
      );
    }

    await prisma.workspace.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ message: 'Workspace deleted successfully' });
  } catch (error) {
    appLogger.error('Error deleting workspace:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
