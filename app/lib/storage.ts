import fs from 'fs/promises';
import path from 'path';

export interface StorageProvider {
  read(key: string): Promise<Buffer>;
  write(key: string, data: Buffer): Promise<void>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  getMetadata(key: string): Promise<{ size: number; lastModified: Date }>;
  createDir(dir: string): Promise<void>;
}

class LocalStorageProvider implements StorageProvider {
  private basePath: string;

  constructor(basePath: string = './uploads') {
    this.basePath = path.resolve(basePath);
  }

  private getFilePath(key: string): string {
    // Ensure the key doesn't contain dangerous path traversal
    const sanitizedKey = key.replace(/\.\./g, '').replace(/^\/+/, '');
    return path.join(this.basePath, sanitizedKey);
  }

  async read(key: string): Promise<Buffer> {
    const filePath = this.getFilePath(key);
    try {
      return await fs.readFile(filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error(`File not found: ${key}`);
      }
      throw error;
    }
  }

  async write(key: string, data: Buffer): Promise<void> {
    const filePath = this.getFilePath(key);
    const dir = path.dirname(filePath);
    
    // Ensure directory exists
    await this.createDir(dir);
    
    await fs.writeFile(filePath, data);
  }

  async delete(key: string): Promise<void> {
    const filePath = this.getFilePath(key);
    try {
      await fs.unlink(filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // File doesn't exist, consider it deleted
        return;
      }
      throw error;
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

  async getMetadata(key: string): Promise<{ size: number; lastModified: Date }> {
    const filePath = this.getFilePath(key);
    try {
      const stats = await fs.stat(filePath);
      return {
        size: stats.size,
        lastModified: stats.mtime,
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error(`File not found: ${key}`);
      }
      throw error;
    }
  }

  async createDir(dir: string): Promise<void> {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
        // Directory already exists
        return;
      }
      throw error;
    }
  }
}

// Choose storage provider based on environment
function createStorageProvider(): StorageProvider {
  if (process.env.NODE_ENV === 'production' && process.env.GOOGLE_CLOUD_PROJECT_ID) {
    // Use Cloud Storage in production
    const { CloudStorageProvider } = require('./storage/cloud-storage');
    return new CloudStorageProvider();
  } else {
    // Use local storage for development
    return new LocalStorageProvider(process.env.STORAGE_PATH || './uploads');
  }
}

export const storage = createStorageProvider();