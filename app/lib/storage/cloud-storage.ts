import { Storage } from '@google-cloud/storage';
import { StorageProvider } from '../storage';

export class CloudStorageProvider implements StorageProvider {
  private storage: Storage;
  private bucketName: string;

  constructor(bucketName?: string) {
    this.storage = new Storage({
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
      // For App Engine, authentication is automatic
      // For local development, set GOOGLE_APPLICATION_CREDENTIALS
    });
    
    this.bucketName = bucketName || process.env.CLOUD_STORAGE_BUCKET || 'abacushub-files';
  }

  private getBucket() {
    return this.storage.bucket(this.bucketName);
  }

  private getFile(key: string) {
    // Sanitize key to prevent path traversal
    const sanitizedKey = key.replace(/\.\./g, '').replace(/^\/+/, '');
    return this.getBucket().file(sanitizedKey);
  }

  async read(key: string): Promise<Buffer> {
    try {
      const file = this.getFile(key);
      const [buffer] = await file.download();
      return buffer;
    } catch (error: any) {
      if (error.code === 404) {
        throw new Error(`File not found: ${key}`);
      }
      throw new Error(`Failed to read file ${key}: ${error.message}`);
    }
  }

  async write(key: string, data: Buffer): Promise<void> {
    try {
      const file = this.getFile(key);
      await file.save(data, {
        metadata: {
          cacheControl: 'public, max-age=3600',
          contentType: this.detectContentType(key),
        },
        resumable: false, // For small files, use simple upload
      });
    } catch (error: any) {
      throw new Error(`Failed to write file ${key}: ${error.message}`);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const file = this.getFile(key);
      await file.delete();
    } catch (error: any) {
      if (error.code !== 404) {
        throw new Error(`Failed to delete file ${key}: ${error.message}`);
      }
      // File doesn't exist, consider deletion successful
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const file = this.getFile(key);
      const [exists] = await file.exists();
      return exists;
    } catch (error) {
      return false;
    }
  }

  async getMetadata(key: string): Promise<{ size: number; lastModified: Date }> {
    try {
      const file = this.getFile(key);
      const [metadata] = await file.getMetadata();
      
      return {
        size: parseInt(metadata.size || '0'),
        lastModified: new Date(metadata.updated || metadata.timeCreated),
      };
    } catch (error: any) {
      if (error.code === 404) {
        throw new Error(`File not found: ${key}`);
      }
      throw new Error(`Failed to get metadata for ${key}: ${error.message}`);
    }
  }

  async createDir(dir: string): Promise<void> {
    // Cloud Storage doesn't require directory creation
    // Directories are created implicitly when files are uploaded
    return Promise.resolve();
  }

  /**
   * Generate a signed URL for direct client uploads
   */
  async getSignedUploadUrl(key: string, contentType?: string, expiresIn: number = 3600): Promise<string> {
    try {
      const file = this.getFile(key);
      
      const [url] = await file.getSignedUrl({
        version: 'v4',
        action: 'write',
        expires: Date.now() + expiresIn * 1000,
        contentType: contentType || this.detectContentType(key),
      });
      
      return url;
    } catch (error: any) {
      throw new Error(`Failed to generate signed URL for ${key}: ${error.message}`);
    }
  }

  /**
   * Generate a signed URL for file downloads
   */
  async getSignedDownloadUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const file = this.getFile(key);
      
      const [url] = await file.getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: Date.now() + expiresIn * 1000,
      });
      
      return url;
    } catch (error: any) {
      throw new Error(`Failed to generate signed download URL for ${key}: ${error.message}`);
    }
  }

  private detectContentType(key: string): string {
    const ext = key.split('.').pop()?.toLowerCase();
    
    const mimeTypes: Record<string, string> = {
      // Images
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      svg: 'image/svg+xml',
      
      // Documents
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ppt: 'application/vnd.ms-powerpoint',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      
      // Text
      txt: 'text/plain',
      csv: 'text/csv',
      json: 'application/json',
      xml: 'application/xml',
      
      // Audio/Video
      mp4: 'video/mp4',
      webm: 'video/webm',
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      
      // Archives
      zip: 'application/zip',
      rar: 'application/x-rar-compressed',
      '7z': 'application/x-7z-compressed',
    };
    
    return mimeTypes[ext || ''] || 'application/octet-stream';
  }
}