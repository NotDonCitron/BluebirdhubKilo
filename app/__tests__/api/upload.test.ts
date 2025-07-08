import { POST } from '@/app/api/upload/route';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';
import { storage } from '@/lib/storage';
import { sendUploadNotification } from '@/lib/notifications';
import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/lib/db', () => ({
  db: {
    workspace: {
      findFirst: jest.fn(),
    },
    file: {
      create: jest.fn(),
    },
  },
}));

jest.mock('@/lib/storage', () => ({
  storage: {
    read: jest.fn(),
    write: jest.fn(),
    delete: jest.fn(),
    exists: jest.fn(),
    getMetadata: jest.fn(),
  },
}));

jest.mock('@/lib/notifications', () => ({
  sendUploadNotification: jest.fn(),
}));

jest.mock('@/lib/auth', () => ({
  authOptions: {},
}));

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: jest.fn(() => 'test-uuid-123'),
  },
});

describe('/api/upload', () => {
  const mockSession = {
    user: { id: 'user123' },
  };

  const mockWorkspace = {
    id: 'workspace123',
    name: 'Test Workspace',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (db.workspace.findFirst as jest.Mock).mockResolvedValue(mockWorkspace);
    (storage.write as jest.Mock).mockResolvedValue(undefined);
    (storage.read as jest.Mock).mockResolvedValue(Buffer.from('test content'));
    (storage.delete as jest.Mock).mockResolvedValue(undefined);
    (sendUploadNotification as jest.Mock).mockResolvedValue(undefined);
  });

  describe('Authentication', () => {
    test('should reject unauthenticated requests', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/upload?action=chunk', {
        method: 'POST',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    test('should reject requests without user ID', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({ user: {} });

      const request = new NextRequest('http://localhost/api/upload?action=chunk', {
        method: 'POST',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('Action Parameter Validation', () => {
    test('should require action parameter', async () => {
      const request = new NextRequest('http://localhost/api/upload', {
        method: 'POST',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing action parameter');
    });

    test('should reject invalid action parameter', async () => {
      const request = new NextRequest('http://localhost/api/upload?action=invalid', {
        method: 'POST',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid action');
    });
  });

  describe('Chunk Upload (action=chunk)', () => {
    const createChunkRequest = (formData: FormData) => {
      return new NextRequest('http://localhost/api/upload?action=chunk', {
        method: 'POST',
        body: formData,
      });
    };

    const createFormData = (overrides: Record<string, any> = {}) => {
      const formData = new FormData();
      const chunk = new File(['chunk data'], 'chunk');
      
      formData.append('chunk', chunk);
      formData.append('fileName', overrides.fileName || 'test.txt');
      formData.append('fileId', overrides.fileId || 'file123');
      formData.append('chunkIndex', overrides.chunkIndex?.toString() || '0');
      formData.append('totalChunks', overrides.totalChunks?.toString() || '3');
      formData.append('workspaceId', overrides.workspaceId || 'workspace123');

      return formData;
    };

    test('should successfully upload first chunk', async () => {
      const formData = createFormData();
      const request = createChunkRequest(formData);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.uploadId).toBe('file123');
      expect(data.chunkIndex).toBe(0);
      expect(data.received).toBe(1);
      expect(data.total).toBe(3);

      expect(storage.write).toHaveBeenCalledWith(
        'temp/file123',
        expect.any(Buffer)
      );
      expect(sendUploadNotification).toHaveBeenCalledWith(
        'upload_started',
        expect.objectContaining({
          id: 'file123',
          name: 'test.txt',
        })
      );
    });

    test('should handle subsequent chunks', async () => {
      // First chunk
      const formData1 = createFormData({ chunkIndex: 0 });
      await POST(createChunkRequest(formData1));

      // Second chunk
      const formData2 = createFormData({ chunkIndex: 1 });
      const request2 = createChunkRequest(formData2);

      const response = await POST(request2);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(2);

      expect(storage.read).toHaveBeenCalledWith('temp/file123');
      expect(storage.write).toHaveBeenCalledTimes(2);
    });

    test('should reject chunk without upload session for non-zero index', async () => {
      const formData = createFormData({ chunkIndex: 1, fileId: 'nonexistent' });
      const request = createChunkRequest(formData);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Upload session not found. Please restart upload.');
    });

    test('should validate workspace access', async () => {
      (db.workspace.findFirst as jest.Mock).mockResolvedValue(null);

      const formData = createFormData();
      const request = createChunkRequest(formData);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Workspace not found or access denied');
    });

    test('should reject files exceeding size limit', async () => {
      const formData = createFormData({ totalChunks: 600 }); // > 500MB at 1MB chunks
      const request = createChunkRequest(formData);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('File too large');
    });

    test('should validate required parameters', async () => {
      const formData = new FormData();
      // Missing required fields
      const request = createChunkRequest(formData);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required upload parameters');
    });

    test('should handle concurrent chunks for same upload', async () => {
      const formData1 = createFormData({ chunkIndex: 0 });
      const formData2 = createFormData({ chunkIndex: 1 });

      // Start first chunk
      await POST(createChunkRequest(formData1));

      // Upload second chunk (should work with existing session)
      const response = await POST(createChunkRequest(formData2));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(2);
    });

    test('should send progress notifications at milestones', async () => {
      // Upload chunks to trigger 20% milestone
      for (let i = 0; i < 5; i++) {
        const formData = createFormData({ chunkIndex: i, totalChunks: 5 });
        await POST(createChunkRequest(formData));
      }

      expect(sendUploadNotification).toHaveBeenCalledWith(
        'upload_progress',
        expect.objectContaining({
          progress: expect.any(Number),
        })
      );
    });

    test('should handle upload ownership validation', async () => {
      // Create upload with different user
      const formData1 = createFormData();
      await POST(createChunkRequest(formData1));

      // Try to upload chunk with different user
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'different-user' },
      });

      const formData2 = createFormData({ chunkIndex: 1 });
      const response = await POST(createChunkRequest(formData2));
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('Complete Upload (action=complete)', () => {
    const createCompleteRequest = (body: any) => {
      return new NextRequest('http://localhost/api/upload?action=complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    };

    test('should successfully complete upload', async () => {
      // First create an upload session
      const formData = createFormData({ totalChunks: 2 });
      await POST(new NextRequest('http://localhost/api/upload?action=chunk', {
        method: 'POST',
        body: formData,
      }));

      // Add second chunk
      const formData2 = createFormData({ chunkIndex: 1, totalChunks: 2 });
      await POST(new NextRequest('http://localhost/api/upload?action=chunk', {
        method: 'POST',
        body: formData2,
      }));

      // Mock file creation
      const mockFile = {
        id: 'test-uuid-123',
        name: 'test.txt',
        size: 1000,
        mimeType: 'text/plain',
        createdAt: new Date(),
      };
      (db.file.create as jest.Mock).mockResolvedValue(mockFile);

      const request = createCompleteRequest({ uploadId: 'file123' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe('test-uuid-123');
      expect(data.name).toBe('test.txt');

      expect(storage.read).toHaveBeenCalledWith('temp/file123');
      expect(storage.write).toHaveBeenCalledWith(
        'workspaces/workspace123/files/test-uuid-123.txt',
        expect.any(Buffer)
      );
      expect(storage.delete).toHaveBeenCalledWith('temp/file123');
      expect(sendUploadNotification).toHaveBeenCalledWith(
        'upload_completed',
        expect.objectContaining({
          id: 'test-uuid-123',
        })
      );
    });

    test('should reject completion for non-existent upload', async () => {
      const request = createCompleteRequest({ uploadId: 'nonexistent' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Upload session not found');
    });

    test('should reject completion for incomplete upload', async () => {
      // Create upload with missing chunks
      const formData = createFormData({ totalChunks: 3 });
      await POST(new NextRequest('http://localhost/api/upload?action=chunk', {
        method: 'POST',
        body: formData,
      }));

      const request = createCompleteRequest({ uploadId: 'file123' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Upload incomplete');
      expect(data.missingChunks).toEqual([1, 2]);
      expect(data.received).toBe(1);
      expect(data.total).toBe(3);
    });

    test('should validate upload ownership on completion', async () => {
      // Create upload with one user
      const formData = createFormData();
      await POST(new NextRequest('http://localhost/api/upload?action=chunk', {
        method: 'POST',
        body: formData,
      }));

      // Try to complete with different user
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'different-user' },
      });

      const request = createCompleteRequest({ uploadId: 'file123' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Unauthorized');
    });

    test('should handle storage errors during completion', async () => {
      // Create complete upload
      const formData = createFormData({ totalChunks: 1 });
      await POST(new NextRequest('http://localhost/api/upload?action=chunk', {
        method: 'POST',
        body: formData,
      }));

      // Mock storage error
      (storage.read as jest.Mock).mockRejectedValue(new Error('Storage error'));

      const request = createCompleteRequest({ uploadId: 'file123' });
      const response = await POST(request);

      expect(response.status).toBe(500);
    });

    test('should handle database errors during completion', async () => {
      // Create complete upload
      const formData = createFormData({ totalChunks: 1 });
      await POST(new NextRequest('http://localhost/api/upload?action=chunk', {
        method: 'POST',
        body: formData,
      }));

      // Mock database error
      (db.file.create as jest.Mock).mockRejectedValue(new Error('Database error'));

      const request = createCompleteRequest({ uploadId: 'file123' });
      const response = await POST(request);

      expect(response.status).toBe(500);
    });
  });

  describe('Upload Status (action=status)', () => {
    const createStatusRequest = (body: any) => {
      return new NextRequest('http://localhost/api/upload?action=status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    };

    test('should return upload status', async () => {
      // Create upload with some chunks
      const formData1 = createFormData({ chunkIndex: 0, totalChunks: 3 });
      await POST(new NextRequest('http://localhost/api/upload?action=chunk', {
        method: 'POST',
        body: formData1,
      }));

      const formData2 = createFormData({ chunkIndex: 2, totalChunks: 3 });
      await POST(new NextRequest('http://localhost/api/upload?action=chunk', {
        method: 'POST',
        body: formData2,
      }));

      const request = createStatusRequest({ uploadId: 'file123' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.uploadId).toBe('file123');
      expect(data.filename).toBe('test.txt');
      expect(data.totalChunks).toBe(3);
      expect(data.receivedChunks).toBe(2);
      expect(data.missingChunks).toEqual([1]);
      expect(data.createdAt).toBeDefined();
      expect(data.lastActivity).toBeDefined();
    });

    test('should reject status request for non-existent upload', async () => {
      const request = createStatusRequest({ uploadId: 'nonexistent' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Upload session not found');
    });

    test('should validate upload ownership for status', async () => {
      // Create upload with one user
      const formData = createFormData();
      await POST(new NextRequest('http://localhost/api/upload?action=chunk', {
        method: 'POST',
        body: formData,
      }));

      // Try to check status with different user
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'different-user' },
      });

      const request = createStatusRequest({ uploadId: 'file123' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Unauthorized');
    });

    test('should handle invalid request body', async () => {
      const request = createStatusRequest({ invalidField: 'value' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request');
    });
  });

  describe('Upload Session Management', () => {
    test('should handle multiple concurrent uploads', async () => {
      // Start two different uploads
      const formData1 = createFormData({ fileId: 'file1', fileName: 'test1.txt' });
      const formData2 = createFormData({ fileId: 'file2', fileName: 'test2.txt' });

      const response1 = await POST(new NextRequest('http://localhost/api/upload?action=chunk', {
        method: 'POST',
        body: formData1,
      }));

      const response2 = await POST(new NextRequest('http://localhost/api/upload?action=chunk', {
        method: 'POST',
        body: formData2,
      }));

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);

      const data1 = await response1.json();
      const data2 = await response2.json();

      expect(data1.uploadId).toBe('file1');
      expect(data2.uploadId).toBe('file2');
    });

    test('should update last activity on chunk upload', async () => {
      const formData1 = createFormData({ chunkIndex: 0 });
      await POST(new NextRequest('http://localhost/api/upload?action=chunk', {
        method: 'POST',
        body: formData1,
      }));

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 10));

      const formData2 = createFormData({ chunkIndex: 1 });
      await POST(new NextRequest('http://localhost/api/upload?action=chunk', {
        method: 'POST',
        body: formData2,
      }));

      const statusRequest = new NextRequest('http://localhost/api/upload?action=status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uploadId: 'file123' }),
      });

      const response = await POST(statusRequest);
      const data = await response.json();

      expect(new Date(data.lastActivity).getTime()).toBeGreaterThan(
        new Date(data.createdAt).getTime()
      );
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed form data', async () => {
      const request = new NextRequest('http://localhost/api/upload?action=chunk', {
        method: 'POST',
        body: 'invalid form data',
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
    });

    test('should handle malformed JSON in status/complete requests', async () => {
      const request = new NextRequest('http://localhost/api/upload?action=status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json',
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
    });

    test('should handle storage write errors', async () => {
      (storage.write as jest.Mock).mockRejectedValue(new Error('Storage error'));

      const formData = createFormData();
      const request = new NextRequest('http://localhost/api/upload?action=chunk', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
    });

    test('should handle notification errors gracefully', async () => {
      (sendUploadNotification as jest.Mock).mockRejectedValue(new Error('Notification error'));

      const formData = createFormData();
      const request = new NextRequest('http://localhost/api/upload?action=chunk', {
        method: 'POST',
        body: formData,
      });

      // Should still succeed despite notification error
      const response = await POST(request);
      expect(response.status).toBe(200);
    });
  });

  describe('File Type and Size Validation', () => {
    test('should handle files with no extension', async () => {
      const formData = createFormData({ fileName: 'noextension' });
      const request = new NextRequest('http://localhost/api/upload?action=chunk', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });

    test('should handle very small files', async () => {
      const formData = createFormData({ totalChunks: 1 });
      const chunk = new File(['x'], 'small.txt'); // 1 byte file
      formData.set('chunk', chunk);

      const request = new NextRequest('http://localhost/api/upload?action=chunk', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });

    test('should handle files at size limit', async () => {
      const formData = createFormData({ totalChunks: 500 }); // Exactly 500MB at 1MB chunks
      const request = new NextRequest('http://localhost/api/upload?action=chunk', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });
  });
});