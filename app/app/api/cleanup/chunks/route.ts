import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/app/lib/storage";

export async function GET(request: NextRequest) {
  try {
    // Verify this is called by Vercel Cron
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log("Starting cleanup of orphaned chunks...");
    
    // List all files in the temp directory
    const tempFiles = await storage.list("temp/");
    
    let cleaned = 0;
    let errors = 0;
    const MAX_CHUNK_AGE = 24 * 60 * 60 * 1000; // 24 hours
    
    for (const file of tempFiles) {
      try {
        const metadata = await storage.getMetadata(`temp/${file}`);
        const age = Date.now() - metadata.lastModified.getTime();
        
        // If chunk is older than MAX_CHUNK_AGE, delete it
        if (age > MAX_CHUNK_AGE) {
          await storage.delete(`temp/${file}`);
          cleaned++;
          console.log(`Deleted orphaned chunk: temp/${file}`);
        }
      } catch (error) {
        console.error(`Failed to clean up chunk temp/${file}:`, error);
        errors++;
      }
    }
    
    const result = {
      success: true,
      cleaned,
      errors,
      timestamp: new Date().toISOString(),
    };
    
    console.log(`Cleanup complete:`, result);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error("Chunk cleanup failed:", error);
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