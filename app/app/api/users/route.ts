
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');

    let users;

    if (workspaceId) {
      // Get users who are members of the specific workspace
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
        },
        include: {
          owner: {
            select: { id: true, name: true, email: true, image: true, role: true }
          },
          members: {
            include: {
              user: {
                select: { id: true, name: true, email: true, image: true, role: true }
              }
            }
          }
        }
      });

      if (!workspace) {
        return NextResponse.json(
          { error: 'Workspace not found or unauthorized' },
          { status: 404 }
        );
      }

      // Combine owner and members
      users = [
        { ...workspace.owner, workspaceRole: 'OWNER' },
        ...workspace.members.map(member => ({
          ...member.user,
          workspaceRole: member.role
        }))
      ];

      // Remove duplicates (in case owner is also in members)
      users = users.filter((user, index, self) => 
        index === self.findIndex(u => u.id === user.id)
      );
    } else {
      // Get all users for admin purposes
      if (session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      const allUsers = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          role: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' }
      });

      users = allUsers;
    }

    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
