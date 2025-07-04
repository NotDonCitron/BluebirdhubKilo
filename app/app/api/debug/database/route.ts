import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    // Check database connection
    await prisma.$connect();
    
    // Count records in each table
    const userCount = await prisma.user.count();
    const fileCount = await prisma.file.count();
    const workspaceCount = await prisma.workspace.count();
    
    // Get recent files
    const recentFiles = await prisma.file.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        uploadedBy: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    return NextResponse.json({
      status: 'connected',
      counts: {
        users: userCount,
        files: fileCount,
        workspaces: workspaceCount
      },
      recentFiles,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Database debug error:', error);
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}