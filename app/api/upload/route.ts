import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-config";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "@/lib/db";
import { storage } from "@/app/lib/storage";

// Chunk metadata is stored in memory for the current implementation
// In production, this should be stored in Redis or a database
const chunkMetadata = new Map<string, number[]>();

// Helper to get chunk metadata
function getChunkMetadata(fileId: string): number[] {
  return chunkMetadata.get(fileId) || [];
}

// Helper to save chunk metadata
function saveChunkMetadata(fileId: string, chunks: number[]) {
  chunkMetadata.set(fileId, chunks);
}

// Helper to clean up temporary files
async function cleanupTempFiles(fileId: string) {
  try {
    // Remove chunk files from storage
    const chunks = getChunkMetadata(fileId);
    for (const chunkIndex of chunks) {
      const chunkKey = `temp/${fileId}.chunk.${chunkIndex}`;
      try {
        await storage.delete(chunkKey);
      } catch {
        // Chunk might not exist
      }
    }
    // Clear metadata
    chunkMetadata.delete(fileId);
  } catch {
    // Files might not exist
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse form data
    const formData = await request.formData();
    const action = formData.get("action") as string;
    
    if (action === "chunk") {
      // Handle chunk upload
      const fileId = formData.get("fileId") as string;
      const chunkIndex = parseInt(formData.get("chunkIndex") as string);
      const totalChunks = parseInt(formData.get("totalChunks") as string);
      const chunk = formData.get("chunk") as File;
      
      if (!fileId || isNaN(chunkIndex) || isNaN(totalChunks) || !chunk) {
        return NextResponse.json({ error: "Invalid chunk data" }, { status: 400 });
      }

      // Save chunk to storage
      const chunkKey = `temp/${fileId}.chunk.${chunkIndex}`;
      const buffer = Buffer.from(await chunk.arrayBuffer());
      await storage.write(chunkKey, buffer);

      // Update metadata
      const uploadedChunks = getChunkMetadata(fileId);
      if (!uploadedChunks.includes(chunkIndex)) {
        uploadedChunks.push(chunkIndex);
        saveChunkMetadata(fileId, uploadedChunks);
      }

      return NextResponse.json({
        success: true,
        uploadedChunks: uploadedChunks.length,
        totalChunks,
      });
    } else if (action === "complete") {
      // Handle upload completion
      const fileId = formData.get("fileId") as string;
      const fileName = formData.get("fileName") as string;
      const fileSize = parseInt(formData.get("fileSize") as string);
      const mimeType = formData.get("mimeType") as string;
      const totalChunks = parseInt(formData.get("totalChunks") as string);
      const workspaceId = formData.get("workspaceId") as string;
      const folderId = formData.get("folderId") as string | null;

      if (!fileId || !fileName || isNaN(fileSize) || !mimeType || isNaN(totalChunks)) {
        return NextResponse.json({ error: "Invalid file data" }, { status: 400 });
      }

      // Verify all chunks are uploaded
      const uploadedChunks = await getChunkMetadata(fileId);
      if (uploadedChunks.length !== totalChunks) {
        return NextResponse.json({
          error: "Missing chunks",
          uploadedChunks: uploadedChunks.length,
          totalChunks,
        }, { status: 400 });
      }

      // Combine chunks
      const finalFileName = `${uuidv4()}-${fileName}`;
      const finalKey = `files/${finalFileName}`;
      
      // Read and combine all chunks
      const chunks: Buffer[] = [];
      for (let i = 0; i < totalChunks; i++) {
        const chunkKey = `temp/${fileId}.chunk.${i}`;
        const chunkData = await storage.read(chunkKey);
        chunks.push(chunkData);
      }
      
      const finalBuffer = Buffer.concat(chunks);
      await storage.write(finalKey, finalBuffer);

      // Clean up temporary files
      await cleanupTempFiles(fileId);

      // Save to database with transaction
      let file;
      
      try {
        file = await prisma.$transaction(async (tx) => {
          // Create file record
          // Create file record - build object conditionally to match Prisma types
          const fileData = {
            name: fileName,
            originalName: fileName,
            size: fileSize,
            mimeType,
            url: `/uploads/${finalKey}`,
            uploadedById: session.user.id,
            ...(workspaceId ? { workspaceId } : {}),
            ...(folderId ? { folderId } : {}),
          };

          const createdFile = await tx.file.create({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            data: fileData as any,
            include: {
              uploadedBy: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                },
              },
              workspace: {
                select: {
                  id: true,
                  name: true,
                  color: true,
                  icon: true,
                },
              },
            },
          });

          // Log activity
          await tx.activityLog.create({
            data: {
              userId: session.user.id,
              action: "FILE_UPLOADED",
              entityType: "FILE",
              entityId: createdFile.id,
              details: {
                fileName: fileName,
                fileSize: fileSize,
                mimeType: mimeType,
              },
            },
          });

          return createdFile;
        });
      } catch (dbError) {
        // If database operation fails, clean up the uploaded file
        console.error("Database error, cleaning up uploaded file:", dbError);
        
        try {
          await storage.delete(finalKey);
        } catch (cleanupError) {
          console.error("Failed to clean up file after database error:", cleanupError);
        }
        
        throw dbError;
      }

      return NextResponse.json({
        success: true,
        file,
      });
    } else if (action === "status") {
      // Get upload status
      const fileId = formData.get("fileId") as string;
      
      if (!fileId) {
        return NextResponse.json({ error: "Invalid file ID" }, { status: 400 });
      }

      const uploadedChunks = getChunkMetadata(fileId);
      
      return NextResponse.json({
        uploadedChunks,
      });
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Upload failed", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// Add GET method to check upload status
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get("fileId");

    if (!fileId) {
      return NextResponse.json({ error: "File ID required" }, { status: 400 });
    }

    const uploadedChunks = getChunkMetadata(fileId);
    
    return NextResponse.json({
      fileId,
      uploadedChunks,
    });
  } catch (error) {
    console.error("Status check error:", error);
    return NextResponse.json(
      { error: "Failed to get status" },
      { status: 500 }
    );
  }
}