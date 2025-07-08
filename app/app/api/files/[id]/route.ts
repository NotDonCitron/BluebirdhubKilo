import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-config";
import { prisma } from "@/lib/db";
import { storage } from "@/lib/storage";
import { appLogger } from '@/lib/logger';

// Helper to stream file to response with range support
async function streamFile(
  key: string,
  mimeType: string,
  fileName: string,
  range?: string
): Promise<NextResponse> {
  try {
    // Get file metadata
    const metadata = await storage.getMetadata(key);
    const fileSize = metadata.size;

    if (range) {
      // Handle range requests for video/audio streaming
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0] || '0', 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      // For range requests, we need to read only the requested portion
      const buffer = await storage.read(key);
      const chunk = buffer.subarray(start, end + 1);

      return new NextResponse(chunk, {
        status: 206,
        headers: {
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunkSize.toString(),
          "Content-Type": mimeType || "application/octet-stream",
          "Content-Disposition": `inline; filename="${encodeURIComponent(fileName)}"`,
          "Cache-Control": "private, max-age=3600",
        },
      });
    } else {
      // Stream entire file
      const buffer = await storage.read(key);
      
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          "Content-Length": fileSize.toString(),
          "Content-Type": mimeType || "application/octet-stream",
          "Content-Disposition": `inline; filename="${encodeURIComponent(fileName)}"`,
          "Cache-Control": "private, max-age=3600",
          "Accept-Ranges": "bytes", // Indicate we support range requests
        },
      });
    }
  } catch (error) {
    appLogger.error("Error streaming file:", error);
    throw error;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const fileId = params.id;
    
    // Get file from database with workspace info
    const file = await prisma.file.findUnique({
      where: { id: fileId },
      include: {
        workspace: {
          include: {
            members: {
              where: { userId: session.user.id },
            },
          },
        },
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Check permissions
    // User can access if:
    // 1. They uploaded the file
    // 2. They are a member of the workspace
    // 3. The file has no workspace (personal file)
    const canAccess =
      file.uploadedById === session.user.id ||
      (file.workspace && file.workspace.members.length > 0) ||
      !file.workspaceId;

    if (!canAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Extract storage key from URL
    if (!file.url) {
      return NextResponse.json({ error: "Invalid file URL" }, { status: 400 });
    }

    const storageKey = file.url;

    // Check if file exists in storage
    const exists = await storage.exists(storageKey);
    if (!exists) {
      appLogger.error("File not found in storage:", storageKey);
      return NextResponse.json(
        { error: "File not found in storage" },
        { status: 404 }
      );
    }

    // Handle range requests
    const range = request.headers.get("range");
    
    // Stream file with proper headers
    const response = await streamFile(
      storageKey,
      file.mimeType,
      file.name,
      range || undefined
    );

    // Log file access for auditing
    appLogger.info(`File accessed: ${file.name} by user: ${session.user.email}`);

    return response;
  } catch (error) {
    appLogger.error("Error serving file:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE endpoint for file removal
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const fileId = params.id;

    // Get file from database
    const file = await prisma.file.findUnique({
      where: { id: fileId },
      include: {
        workspace: {
          include: {
            members: {
              where: { 
                userId: session.user.id,
                role: { in: ["OWNER", "ADMIN"] }
              },
            },
          },
        },
      },
    });

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Check permissions - only file owner or workspace admin/owner can delete
    const canDelete =
      file.uploadedById === session.user.id ||
      (file.workspace && file.workspace.members.length > 0);

    if (!canDelete) {
      return NextResponse.json(
        { error: "You don't have permission to delete this file" },
        { status: 403 }
      );
    }

    // Delete from database (this will also trigger any cascading deletes)
    await prisma.file.delete({
      where: { id: fileId },
    });

    // Note: Physical file deletion is handled by a cleanup job to prevent data loss
    // This allows for recovery in case of accidental deletion

    return NextResponse.json({
      success: true,
      message: "File deleted successfully",
    });
  } catch (error) {
    appLogger.error("Error deleting file:", error);
    return NextResponse.json(
      { error: "Failed to delete file" },
      { status: 500 }
    );
  }
}
