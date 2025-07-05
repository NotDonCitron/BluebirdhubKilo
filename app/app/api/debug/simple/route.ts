import { NextResponse } from "next/server";

export async function GET() {
  try {
    return NextResponse.json({
      status: 'API is working',
      timestamp: new Date().toISOString(),
      env: {
        STORAGE_TYPE: process.env.STORAGE_TYPE || 'not set',
        DATABASE_URL: process.env.DATABASE_URL ? 'set' : 'not set',
        NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'not set',
        SUPABASE_URL: process.env.SUPABASE_URL ? 'set' : 'not set',
        SUPABASE_STORAGE_BUCKET: process.env.SUPABASE_STORAGE_BUCKET || 'not set'
      }
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}