import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get session count (mock data for now)
    const activeSessionsCount = 1; // Current session

    // Calculate storage used (mock data for now)
    const filesData = await prisma.file.aggregate({
      where: { 
        workspace: {
          members: {
            some: { userId: session.user.id }
          }
        }
      },
      _sum: {
        size: true,
      },
    });

    const storageUsed = Number(filesData._sum.size) || 0;
    const storageLimit = 5 * 1024 * 1024 * 1024; // 5GB limit

    // Get last login from activity logs
    const lastLoginActivity = await prisma.activityLog.findFirst({
      where: {
        userId: session.user.id,
        action: { contains: 'logged in' },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      id: user.id,
      email: user.email,
      createdAt: user.createdAt.toISOString(),
      lastLoginAt: lastLoginActivity?.createdAt.toISOString() || null,
      activeSessionsCount,
      storageUsed,
      storageLimit,
    });
  } catch (error) {
    console.error('Error fetching account info:', error);
    return NextResponse.json(
      { error: 'Failed to fetch account information' },
      { status: 500 }
    );
  }
}