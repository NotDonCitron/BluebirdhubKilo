import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { storage } from "@/lib/storage";
import { sendUploadNotification } from "@/lib/notifications";
import { z } from "zod";
import path from "path";
import crypto from "crypto";

// Constants
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
const CHUNK_SIZE = 1024 * 1024; // 1MB
const UPLOAD_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours

// Request schemas

const completeSchema = z.object({
  uploadId: z.string(),
});

const statusSchema = z.object({
  uploadId: z.string(),
});

// In-memory upload tracking (should be moved to Redis in production)
const activeUploads = new Map<string, {
  userId: string;
  workspaceId: string;
  filename: string;
  fileType: string;
  totalChunks: number;
  receivedChunks: Set<number>;
  tempPath: string;
  createdAt: Date;
  lastActivity: Date;
}>();

// Cleanup expired uploads periodically
setInterval(() => {
  const now = Date.now();
  for (const [uploadId, upload] of activeUploads.entries()) {
    if (now - upload.lastActivity.getTime() > UPLOAD_TIMEOUT) {
      // Clean up temp file
      storage.delete(upload.tempPath).catch(console.error);
      activeUploads.delete(uploadId);
    }
  }
}, 60 * 60 * 1000); // Check every hour

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    if (!action) {
      return NextResponse.json({ error: "Missing action parameter" }, { status: 400 });
    }

    switch (action) {
      case "chunk":
        return handleChunkUpload(request, session.user.id);
      case "complete":
        return handleCompleteUpload(request, session.user.id);
      case "status":
        return handleUploadStatus(request, session.user.id);
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function handleChunkUpload(request: NextRequest, userId: string) {
  try {
    const formData = await request.formData();
    const chunk = formData.get("chunk") as File;
    const fileName = formData.get("fileName") as string;
    const fileId = formData.get("fileId") as string;
    const chunkIndex = parseInt(formData.get("chunkIndex") as string);
    const totalChunks = parseInt(formData.get("totalChunks") as string);
    // fileSize extracted but not used in chunk processing
    const workspaceId = formData.get("workspaceId") as string;

    if (!chunk || !fileName || !fileId || isNaN(chunkIndex) || isNaN(totalChunks)) {
      return NextResponse.json(
        { error: "Missing required upload parameters" },
        { status: 400 }
      );
    }

    // Map to expected schema format
    const parsedMetadata = {
      uploadId: fileId,
      chunkIndex,
      totalChunks,
      filename: fileName,
      fileType: chunk.type || "application/octet-stream",
      workspaceId: workspaceId || ""
    };
    const { uploadId, filename, fileType } = parsedMetadata;

    // Verify workspace access
    const workspace = await db.workspace.findFirst({
      where: {
        id: workspaceId,
        members: {
          some: {
            userId,
          },
        },
      },
    });

    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace not found or access denied" },
        { status: 403 }
      );
    }

    // Initialize or get upload session
    let upload = activeUploads.get(uploadId);
    if (!upload) {
      if (chunkIndex !== 0) {
        return NextResponse.json(
          { error: "Upload session not found. Please restart upload." },
          { status: 400 }
        );
      }

      // Calculate total file size
      const totalSize = totalChunks * CHUNK_SIZE;
      if (totalSize > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` },
          { status: 400 }
        );
      }

      const tempPath = `temp/${uploadId}`;
      upload = {
        userId,
        workspaceId,
        filename,
        fileType,
        totalChunks,
        receivedChunks: new Set(),
        tempPath,
        createdAt: new Date(),
        lastActivity: new Date(),
      };
      activeUploads.set(uploadId, upload);

      // Send upload started notification
      await sendUploadNotification('upload_started', {
        id: uploadId,
        name: filename,
        size: totalSize,
        uploadedBy: userId,
        workspaceId,
      });
    }

    // Verify upload ownership
    if (upload.userId !== userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    // Update last activity
    upload.lastActivity = new Date();

    // Read chunk data
    const chunkBuffer = Buffer.from(await chunk.arrayBuffer());

    // Append chunk to temp file using storage provider
    if (chunkIndex === 0) {
      // First chunk - create new file
      await storage.write(upload.tempPath, chunkBuffer);
    } else {
      // Append to existing file
      const existingData = await storage.read(upload.tempPath);
      const combinedBuffer = Buffer.concat([existingData, chunkBuffer]);
      await storage.write(upload.tempPath, combinedBuffer);
    }

    upload.receivedChunks.add(chunkIndex);

    // Send progress notification every 10% or on significant milestones
    const progress = (upload.receivedChunks.size / totalChunks) * 100;
    const shouldNotify = progress % 20 === 0 || progress >= 90 || chunkIndex === 0;
    
    if (shouldNotify) {
      await sendUploadNotification('upload_progress', {
        id: uploadId,
        name: upload.filename,
        size: totalChunks * CHUNK_SIZE,
        progress: Math.round(progress),
        uploadedBy: upload.userId,
        workspaceId: upload.workspaceId,
      });
    }

    return NextResponse.json({
      uploadId,
      chunkIndex,
      received: upload.receivedChunks.size,
      total: totalChunks,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid metadata", details: error.errors },
        { status: 400 }
      );
    }
    throw error;
  }
}

async function handleCompleteUpload(request: NextRequest, userId: string) {
  try {
    const body = await request.json();
    const { uploadId } = completeSchema.parse(body);

    const upload = activeUploads.get(uploadId);
    if (!upload) {
      return NextResponse.json(
        { error: "Upload session not found" },
        { status: 404 }
      );
    }

    if (upload.userId !== userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    // Verify all chunks received
    if (upload.receivedChunks.size !== upload.totalChunks) {
      const missingChunks = [];
      for (let i = 0; i < upload.totalChunks; i++) {
        if (!upload.receivedChunks.has(i)) {
          missingChunks.push(i);
        }
      }
      return NextResponse.json(
        { 
          error: "Upload incomplete", 
          missingChunks,
          received: upload.receivedChunks.size,
          total: upload.totalChunks
        },
        { status: 400 }
      );
    }

    // Generate unique filename
    const fileExtension = path.extname(upload.filename);
    const fileId = crypto.randomUUID();
    const storedFilename = `${fileId}${fileExtension}`;
    const filePath = `workspaces/${upload.workspaceId}/files/${storedFilename}`;

    // Move temp file to final location
    const fileData = await storage.read(upload.tempPath);
    await storage.write(filePath, fileData);

    // Delete temp file
    await storage.delete(upload.tempPath);

    // Calculate file size
    const fileSize = fileData.length;

    // Create file record in database
    const file = await db.file.create({
      data: {
        id: fileId,
        name: upload.filename,
        originalName: upload.filename,
        size: fileSize,
        mimeType: upload.fileType,
        url: filePath,
        workspaceId: upload.workspaceId,
        uploadedById: userId,
      },
    });

    // Send upload completed notification
    await sendUploadNotification('upload_completed', {
      id: file.id,
      name: file.name,
      size: file.size,
      uploadedBy: userId,
      workspaceId: upload.workspaceId,
    });

    // Clean up upload session
    activeUploads.delete(uploadId);

    return NextResponse.json({
      id: file.id,
      name: file.name,
      size: file.size,
      mimeType: file.mimeType,
      uploadedAt: file.createdAt,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.errors },
        { status: 400 }
      );
    }
    throw error;
  }
}

async function handleUploadStatus(request: NextRequest, userId: string) {
  try {
    const body = await request.json();
    const { uploadId } = statusSchema.parse(body);

    const upload = activeUploads.get(uploadId);
    if (!upload) {
      return NextResponse.json(
        { error: "Upload session not found" },
        { status: 404 }
      );
    }

    if (upload.userId !== userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    const missingChunks = [];
    for (let i = 0; i < upload.totalChunks; i++) {
      if (!upload.receivedChunks.has(i)) {
        missingChunks.push(i);
      }
    }

    return NextResponse.json({
      uploadId,
      filename: upload.filename,
      totalChunks: upload.totalChunks,
      receivedChunks: upload.receivedChunks.size,
      missingChunks,
      createdAt: upload.createdAt,
      lastActivity: upload.lastActivity,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.errors },
        { status: 400 }
      );
    }
    throw error;
  }
}