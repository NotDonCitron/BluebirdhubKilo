import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/app/lib/storage";

export async function GET(request: NextRequest) {
  try {
    const storageType = process.env.STORAGE_TYPE || 'local';
    
    // Try to test storage connection
    const testKey = `test-${Date.now()}.txt`;
    const testData = Buffer.from('Hello, World!');
    
    // Test write
    await storage.write(testKey, testData);
    
    // Test read
    const readData = await storage.read(testKey);
    
    // Test delete
    await storage.delete(testKey);
    
    return NextResponse.json({
      status: 'connected',
      type: storageType,
      testPassed: true,
      config: {
        supabaseUrl: process.env.SUPABASE_URL ? 'Set' : 'Not set',
        supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Not set',
        bucket: process.env.SUPABASE_STORAGE_BUCKET || 'Not set'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Storage debug error:', error);
    return NextResponse.json({
      status: 'error',
      type: process.env.STORAGE_TYPE || 'local',
      error: error instanceof Error ? error.message : 'Unknown error',
      config: {
        supabaseUrl: process.env.SUPABASE_URL ? 'Set' : 'Not set',
        supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Not set',
        bucket: process.env.SUPABASE_STORAGE_BUCKET || 'Not set'
      },
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}