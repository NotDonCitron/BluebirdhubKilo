import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { appLogger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    // Verify this is called by Vercel Cron
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    appLogger.info("Starting cleanup of expired sessions...");
    
    // Delete expired sessions
    const result = await prisma.session.deleteMany({
      where: {
        expires: {
          lt: new Date(),
        },
      },
    });
    
    // Delete old verification tokens (older than 24 hours)
    const verificationResult = await prisma.verificationToken.deleteMany({
      where: {
        expires: {
          lt: new Date(),
        },
      },
    });
    
    // Clean up old activity logs (older than 90 days)
    const activityResult = await prisma.activityLog.deleteMany({
      where: {
        createdAt: {
          lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        },
      },
    });
    
    const cleanupResult = {
      success: true,
      expiredSessions: result.count,
      expiredTokens: verificationResult.count,
      oldActivityLogs: activityResult.count,
      timestamp: new Date().toISOString(),
    };
    
    appLogger.info("Session cleanup complete:", cleanupResult);
    
    return NextResponse.json(cleanupResult);
  } catch (error) {
    appLogger.error("Session cleanup failed:", error);
    return NextResponse.json(
      { 
        error: "Cleanup failed", 
        details: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
}

// Also allow POST for manual triggering
export async function POST(request: NextRequest) {
  return GET(request);
}