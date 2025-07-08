import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-config";
import { prisma } from "@/lib/db";
import { storage } from "@/app/lib/storage";
import { appLogger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Reconstruct the storage key from path segments
    const storageKey = params.path.join("/");
    const fileUrl = `/uploads/${storageKey}`;
    
    // Find the file in database by URL
    const file = await prisma.file.findFirst({
      where: { url: fileUrl },
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
    const canAccess =
      file.uploadedById === session.user.id ||
      (file.workspace && file.workspace.members.length > 0) ||
      !file.workspaceId;

    if (!canAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Check if file exists in storage
    const exists = await storage.exists(storageKey);
    if (!exists) {
      appLogger.error("File not found in storage:", storageKey);
      return NextResponse.json(
        { error: "File not found in storage" },
        { status: 404 }
      );
    }

    // Get file metadata
    const metadata = await storage.getMetadata(storageKey);
    
    // Handle range requests
    const range = request.headers.get("range");
    
    if (range) {
      // Handle range requests for video/audio streaming
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0] || '0', 10);
      const end = parts[1] ? parseInt(parts[1], 10) : metadata.size - 1;
      const chunkSize = end - start + 1;

      // Read the requested range
      const buffer = await storage.read(storageKey);
      const chunk = buffer.subarray(start, end + 1);

      return new NextResponse(chunk, {
        status: 206,
        headers: {
          "Content-Range": `bytes ${start}-${end}/${metadata.size}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunkSize.toString(),
          "Content-Type": file.mimeType || "application/octet-stream",
          "Content-Disposition": `inline; filename="${encodeURIComponent(file.name)}"`,
          "Cache-Control": "private, max-age=3600",
        },
      });
    } else {
      // Stream entire file
      const buffer = await storage.read(storageKey);
      
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          "Content-Length": metadata.size.toString(),
          "Content-Type": file.mimeType || "application/octet-stream",
          "Content-Disposition": `inline; filename="${encodeURIComponent(file.name)}"`,
          "Cache-Control": "private, max-age=3600",
          "Accept-Ranges": "bytes",
        },
      });
    }
  } catch (error) {
    appLogger.error("Error serving file:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}