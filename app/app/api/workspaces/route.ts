
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/db';

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
    console.error('Error fetching workspaces:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  console.log('🏢 === WORKSPACE CREATION START ===');
  console.log('Timestamp:', new Date().toISOString());
  
  try {
    console.log('🔐 Getting session...');
    const session = await getServerSession(authOptions);
    
    console.log('📊 Session data:', {
      exists: !!session,
      user: session?.user ? {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: session.user.role,
        hasId: !!session.user.id,
        hasEmail: !!session.user.email
      } : null,
      sessionKeys: session ? Object.keys(session) : [],
      userKeys: session?.user ? Object.keys(session.user) : []
    });

    if (!session?.user?.id) {
      console.log('❌ Authorization failed - no session or user ID');
      console.log('Session exists:', !!session);
      console.log('User exists:', !!session?.user);
      console.log('User ID exists:', !!session?.user?.id);
      
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('✅ Session authorized, parsing request body...');
    const { name, description, color, icon } = await request.json();
    
    console.log('📝 Request data:', { 
      name, 
      description, 
      color: color || '#3B82F6', 
      icon,
      hasName: !!name 
    });

    if (!name) {
      console.log('❌ Validation failed - missing workspace name');
      return NextResponse.json(
        { error: 'Workspace name is required' },
        { status: 400 }
      );
    }

    console.log('💾 Creating workspace in database...');
    console.log('Owner ID:', session.user.id);

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

    console.log('✅ Workspace created successfully:', {
      id: workspace.id,
      name: workspace.name,
      ownerId: workspace.ownerId
    });

    console.log('🏢 === WORKSPACE CREATION SUCCESS ===');
    return NextResponse.json(workspace);
  } catch (error) {
    console.error('💥 === WORKSPACE CREATION ERROR ===');
    console.error('Error type:', error?.constructor?.name);
    console.error('Error message:', (error as Error)?.message);
    console.error('Error code:', (error as unknown as { code?: string })?.code);
    console.error('Error meta:', (error as unknown as { meta?: unknown })?.meta);
    console.error('Full error:', error);
    console.error('Error stack:', (error as Error)?.stack);
    console.error('💥 === END ERROR ===');
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: (error as Error)?.message,
        code: (error as unknown as { code?: string })?.code
      },
      { status: 500 }
    );
  }
}
