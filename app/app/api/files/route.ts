
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

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');
    const category = searchParams.get('category');
    const search = searchParams.get('search');

    const whereCondition = {
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

    if (category) {
      whereCondition.aiMetadata = {
        some: {
          category: {
            contains: category,
            mode: 'insensitive'
          }
        }
      };
    }

    if (search) {
      whereCondition.OR = [
        {
          name: {
            contains: search,
            mode: 'insensitive'
          }
        },
        {
          originalName: {
            contains: search,
            mode: 'insensitive'
          }
        },
        {
          aiMetadata: {
            some: {
              keywords: {
                hasSome: [search]
              }
            }
          }
        }
      ];
    }

    const files = await prisma.file.findMany({
      where: whereCondition,
      include: {
        uploadedBy: {
          select: { id: true, name: true, email: true, image: true }
        },
        workspace: {
          select: { id: true, name: true, color: true, icon: true }
        },
        folder: true,
        tags: true,
        _count: {
          select: { comments: true }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    return NextResponse.json(files);
  } catch (error) {
    console.error('Error fetching files:', error);
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

    // Apply rate limiting for file uploads
    const identifier = getClientIdentifier(request, session.user.id);
    if (!rateLimiters.upload(identifier)) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded',
          message: 'Too many file uploads, please try again later.'
        },
        { 
          status: 429,
          headers: { 'Retry-After': '3600' } // 1 hour
        }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const workspaceId = formData.get('workspaceId') as string;
    const folderId = formData.get('folderId') as string | null;

    if (!file || !workspaceId) {
      return NextResponse.json(
        { error: 'File and workspace are required' },
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

    // For demo purposes, we'll create a mock file URL
    // In a real app, you'd upload to cloud storage (S3, etc.)
    const mockUrl = `https://files.demo/${Date.now()}-${file.name}`;

    const createdFile = await prisma.file.create({
      data: {
        name: file.name.replace(/\s+/g, '-').toLowerCase(),
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
        url: mockUrl,
        workspaceId,
        folderId: folderId || null,
        uploadedById: session.user.id
      },
      include: {
        uploadedBy: {
          select: { id: true, name: true, email: true, image: true }
        },
        workspace: {
          select: { id: true, name: true, color: true, icon: true }
        },
        folder: true,
        tags: true,
        _count: {
          select: { comments: true }
        }
      }
    });

    // Trigger AI categorization (async)
    fetch(`${process.env.NEXTAUTH_URL}/api/ai/categorize-file`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ fileId: createdFile.id })
    }).catch(console.error);

    return NextResponse.json(createdFile);
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
