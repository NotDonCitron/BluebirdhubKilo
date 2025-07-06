import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { put, del, head, list } from "@vercel/blob";
import { createClient } from "@supabase/supabase-js";

/**
 * Storage Provider Interface
 * Defines the contract for storage implementations
 */
export interface StorageProvider {
  /**
   * Write a file to storage
   */
  write(key: string, buffer: Buffer): Promise<void>;
  
  /**
   * Read a file from storage
   */
  read(key: string): Promise<Buffer>;
  
  /**
   * Delete a file from storage
   */
  delete(key: string): Promise<void>;
  
  /**
   * Check if a file exists
   */
  exists(key: string): Promise<boolean>;
  
  /**
   * Get file metadata
   */
  getMetadata(key: string): Promise<{
    size: number;
    lastModified: Date;
    contentType?: string;
  }>;
  
  /**
   * List files with optional prefix
   */
  list(prefix?: string): Promise<string[]>;
  
  /**
   * Get a signed URL for temporary access
   */
  getSignedUrl(key: string, expiresIn: number): Promise<string>;
}

/**
 * Local File System Storage Provider
 * Implements storage using the local file system
 */
export class LocalFileSystemProvider implements StorageProvider {
  private basePath: string;
  
  constructor(basePath: string = process.env.UPLOAD_DIR || "uploads") {
    this.basePath = path.resolve(basePath);
  }
  
  /**
   * Ensure the directory exists
   */
  private async ensureDir(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }
  
  /**
   * Get the full file path for a key
   */
  private getFilePath(key: string): string {
    // Sanitize the key to prevent path traversal
    const sanitizedKey = key.replace(/[^a-zA-Z0-9-_./]/g, "");
    return path.join(this.basePath, sanitizedKey);
  }
  
  async write(key: string, buffer: Buffer): Promise<void> {
    const filePath = this.getFilePath(key);
    const dir = path.dirname(filePath);
    
    await this.ensureDir(dir);
    // Use Uint8Array view of the buffer for compatibility
    await fs.writeFile(filePath, new Uint8Array(buffer));
  }
  
  async read(key: string): Promise<Buffer> {
    const filePath = this.getFilePath(key);
    return await fs.readFile(filePath);
  }
  
  async delete(key: string): Promise<void> {
    const filePath = this.getFilePath(key);
    try {
      await fs.unlink(filePath);
    } catch (error: unknown) {
      const err = error as NodeJS.ErrnoException | Error;
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }
  }
  
  async exists(key: string): Promise<boolean> {
    const filePath = this.getFilePath(key);
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
  
  async getMetadata(key: string): Promise<{
    size: number;
    lastModified: Date;
    contentType?: string;
  }> {
    const filePath = this.getFilePath(key);
    const stats = await fs.stat(filePath);
    
    return {
      size: stats.size,
      lastModified: stats.mtime,
    };
  }
  
  async list(prefix?: string): Promise<string[]> {
    const searchPath = prefix 
      ? path.join(this.basePath, prefix)
      : this.basePath;
    
    const files: string[] = [];
    
    async function walk(dir: string): Promise<void> {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          await walk(fullPath);
        } else {
          const relativePath = path.relative(searchPath, fullPath);
          files.push(relativePath.replace(/\\/g, "/"));
        }
      }
    }
    
    try {
      await walk(searchPath);
    } catch (error: unknown) {
      const err = error as NodeJS.ErrnoException | Error;
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }
    
    return files;
  }
  
  async getSignedUrl(key: string, expiresIn: number): Promise<string> {
    // For local storage, generate a temporary access token
    const token = crypto.randomBytes(32).toString("hex");
    const expires = Date.now() + expiresIn * 1000;
    
    // In a real implementation, you would store this token
    // and validate it when serving the file
    return `/api/files/signed?key=${encodeURIComponent(key)}&token=${token}&expires=${expires}`;
  }
}

/**
 * S3-Compatible Storage Provider (Stub for future implementation)
 */
export class S3StorageProvider implements StorageProvider {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(_config: {
    endpoint?: string;
    region: string;
    bucket: string;
    accessKeyId: string;
    secretAccessKey: string;
  }) {
    // TODO: Initialize S3 client
    throw new Error("S3 storage provider not yet implemented");
  }
  
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async write(_key: string, _buffer: Buffer): Promise<void> {
    throw new Error("Not implemented");
  }
  
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async read(_key: string): Promise<Buffer> {
    throw new Error("Not implemented");
  }
  
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async delete(_key: string): Promise<void> {
    throw new Error("Not implemented");
  }
  
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async exists(_key: string): Promise<boolean> {
    throw new Error("Not implemented");
  }
  
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getMetadata(_key: string): Promise<{
    size: number;
    lastModified: Date;
    contentType?: string;
  }> {
    throw new Error("Not implemented");
  }
  
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async list(_prefix?: string): Promise<string[]> {
    throw new Error("Not implemented");
  }
  
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getSignedUrl(_key: string, _expiresIn: number): Promise<string> {
    throw new Error("Not implemented");
  }
}

/**
 * Supabase Storage Provider
 * Implements storage using Supabase Storage buckets
 */
export class SupabaseStorageProvider implements StorageProvider {
  private supabase: ReturnType<typeof createClient>;
  private bucket: string;
  
  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL || "https://lutlwrjbetraagitvgmf.supabase.co";
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx1dGx3cmpiZXRyYWFnaXR2Z21mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDc5NDM1NCwiZXhwIjoyMDY2MzcwMzU0fQ.UUJ78cNezG5A7kkrvHidcclfQ8_GRETfcOcrJAN6Xow";
    this.bucket = process.env.SUPABASE_STORAGE_BUCKET || "abacushub-files";
    
    this.supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  
  async write(key: string, buffer: Buffer): Promise<void> {
    const { error } = await this.supabase.storage
      .from(this.bucket)
      .upload(key, buffer, {
        contentType: this.getMimeType(key),
        upsert: true,
      });
      
    if (error) {
      const err = error as Error;
      throw new Error(`Failed to upload file: ${err.message}`);
    }
  }
  
  async read(key: string): Promise<Buffer> {
    const { data, error } = await this.supabase.storage
      .from(this.bucket)
      .download(key);
      
    if (error) {
      const err = error as Error;
      throw new Error(`Failed to read file: ${err.message}`);
    }
    
    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
  
  async delete(key: string): Promise<void> {
    const { error } = await this.supabase.storage
      .from(this.bucket)
      .remove([key]);
      
    if (error) {
      const err = error as Error;
      throw new Error(`Failed to delete file: ${err.message}`);
    }
  }
  
  async exists(key: string): Promise<boolean> {
    const { data, error } = await this.supabase.storage
      .from(this.bucket)
      .list(path.dirname(key), {
        search: path.basename(key),
        limit: 1,
      });
      
    if (error) {
      return false;
    }
    
    return data && data.length > 0;
  }
  
  async getMetadata(key: string): Promise<{
    size: number;
    lastModified: Date;
    contentType?: string;
  }> {
    const { data, error } = await this.supabase.storage
      .from(this.bucket)
      .list(path.dirname(key), {
        search: path.basename(key),
        limit: 1,
      });
      
    if (error || !data || data.length === 0) {
      throw new Error(`File not found: ${key}`);
    }
    
    const file = data[0];
    return {
      size: file.metadata?.size || 0,
      lastModified: new Date(file.updated_at || file.created_at),
      contentType: file.metadata?.mimetype,
    };
  }
  
  async list(prefix?: string): Promise<string[]> {
    const { data, error } = await this.supabase.storage
      .from(this.bucket)
      .list(prefix || "", {
        limit: 1000,
        offset: 0,
      });
      
    if (error) {
      const err = error as Error;
      throw new Error(`Failed to list files: ${err.message}`);
    }
    
    return data?.map((file: { name: string }) => 
      prefix ? `${prefix}/${file.name}` : file.name
    ) || [];
  }
  
  async getSignedUrl(key: string, expiresIn: number): Promise<string> {
    const { data, error } = await this.supabase.storage
      .from(this.bucket)
      .createSignedUrl(key, expiresIn);
      
    if (error) {
      const err = error as Error;
      throw new Error(`Failed to create signed URL: ${err.message}`);
    }
    
    return data.signedUrl;
  }
  
  async getPublicUrl(key: string): Promise<string> {
    const { data } = this.supabase.storage
      .from(this.bucket)
      .getPublicUrl(key);
      
    return data.publicUrl;
  }
  
  private getMimeType(key: string): string {
    const ext = path.extname(key).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.txt': 'text/plain',
      '.mp4': 'video/mp4',
      '.mp3': 'audio/mpeg',
    };
    
    return mimeTypes[ext] || 'application/octet-stream';
  }
}

/**
 * Vercel Blob Storage Provider
 * Implements storage using Vercel Blob Storage
 */
export class VercelBlobStorageProvider implements StorageProvider {
  private token: string;
  
  constructor() {
    this.token = process.env.BLOB_READ_WRITE_TOKEN || "";
    if (!this.token) {
      throw new Error("BLOB_READ_WRITE_TOKEN environment variable is required for Vercel Blob Storage");
    }
  }
  
  async write(key: string, buffer: Buffer): Promise<void> {
    await put(key, buffer, {
      access: 'public',
      token: this.token,
    });
  }
  
  async read(key: string): Promise<Buffer> {
    // For Vercel Blob, we need to fetch the file from the public URL
    // const metadata = await this.getMetadata(key);
    const response = await fetch(await this.getPublicUrl(key));
    
    if (!response.ok) {
      throw new Error(`Failed to read file: ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
  
  async delete(key: string): Promise<void> {
    await del(key, { token: this.token });
  }
  
  async exists(key: string): Promise<boolean> {
    try {
      await head(key, { token: this.token });
      return true;
    } catch (error: unknown) {
      const err = error as NodeJS.ErrnoException | Error & { status?: number };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (err.message?.includes('not found') || (err as any).status === 404) {
        return false;
      }
      throw error;
    }
  }
  
  async getMetadata(key: string): Promise<{
    size: number;
    lastModified: Date;
    contentType?: string;
  }> {
    const metadata = await head(key, { token: this.token });
    
    return {
      size: metadata.size,
      lastModified: new Date(metadata.uploadedAt),
      contentType: metadata.contentType,
    };
  }
  
  async list(prefix?: string): Promise<string[]> {
    const { blobs } = await list({
      prefix,
      token: this.token,
    });
    
    return blobs.map(blob => blob.pathname);
  }
  
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getSignedUrl(key: string, expiresIn: number): Promise<string> {
    // Vercel Blob Storage files are publicly accessible by default
    // For private access, you would need to implement your own token-based system
    return this.getPublicUrl(key);
  }
  
  private async getPublicUrl(key: string): Promise<string> {
    const metadata = await head(key, { token: this.token });
    return metadata.url;
  }
}

/**
 * Storage Factory
 * Creates the appropriate storage provider based on configuration
 */
export class StorageFactory {
  private static instance: StorageProvider;
  
  static getProvider(): StorageProvider {
    if (!this.instance) {
      const storageType = process.env.STORAGE_TYPE || "local";
      
      switch (storageType) {
        case "local":
          this.instance = new LocalFileSystemProvider();
          break;
        case "supabase":
          this.instance = new SupabaseStorageProvider();
          break;
        case "vercel-blob":
          this.instance = new VercelBlobStorageProvider();
          break;
        case "s3":
          // TODO: Read S3 configuration from environment
          throw new Error("S3 storage not yet configured");
        default:
          throw new Error(`Unknown storage type: ${storageType}`);
      }
    }
    
    return this.instance;
  }
  
  /**
   * Reset the singleton instance (useful for testing)
   */
  static reset(): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.instance = undefined as any;
  }
}

// Export a default storage instance
export const storage = StorageFactory.getProvider();