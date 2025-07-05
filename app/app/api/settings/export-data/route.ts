import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/db';

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Gather all user data
    const userData = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        settings: true,
        activityLogs: true,
        workspaceMemberships: {
          include: {
            workspace: {
              select: {
                id: true,
                name: true,
                description: true,
                createdAt: true,
              },
            },
          },
        },
        assignedTasks: {
          include: {
            workspace: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        comments: {
          include: {
            task: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
    });

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get files from workspaces the user is a member of
    const userFiles = await prisma.file.findMany({
      where: {
        workspace: {
          members: {
            some: { userId: session.user.id },
          },
        },
      },
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Remove sensitive information and format the data
    const exportData = {
      user: {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        createdAt: userData.createdAt,
        updatedAt: userData.updatedAt,
      },
      settings: userData.settings,
      workspaces: userData.workspaceMemberships.map(membership => ({
        id: membership.workspace.id,
        name: membership.workspace.name,
        description: membership.workspace.description,
        role: membership.role,
        joinedAt: membership.createdAt,
      })),
      tasks: userData.assignedTasks.map(task => ({
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate,
        createdAt: task.createdAt,
        workspace: task.workspace,
      })),
      files: userFiles.map(file => ({
        id: file.id,
        name: file.name,
        type: file.type,
        size: file.size,
        uploadedAt: file.createdAt,
        workspace: file.workspace,
      })),
      comments: userData.comments.map(comment => ({
        id: comment.id,
        content: comment.content,
        createdAt: comment.createdAt,
        task: comment.task,
      })),
      activityLogs: userData.activityLogs.map(log => ({
        id: log.id,
        action: log.action,
        createdAt: log.createdAt,
        ipAddress: log.ipAddress,
      })),
      exportedAt: new Date().toISOString(),
    };

    // Log the export activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'Exported personal data',
        details: JSON.stringify({ exportSize: JSON.stringify(exportData).length }),
      },
    });

    // Create JSON response
    const jsonData = JSON.stringify(exportData, null, 2);
    
    return new NextResponse(jsonData, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="bluebirdhub-data-${userData.id}-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (error) {
    console.error('Error exporting user data:', error);
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    );
  }
}