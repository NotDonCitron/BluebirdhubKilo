import { renderHook, act, waitFor } from '@testing-library/react';
import { useFileUpload } from '@/hooks/use-file-upload';
import { toast } from 'react-hot-toast';

// Mock dependencies
jest.mock('react-hot-toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    __esModule: true,
  },
}));

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
});

// Mock fetch
global.fetch = jest.fn();

// Mock File constructor
global.File = class File {
  constructor(
    public bits: BlobPart[],
    public name: string,
    public options: FilePropertyBag = {}
  ) {
    this.size = bits.reduce((acc, bit) => acc + (bit as any).length || 0, 0);
    this.type = options.type || '';
    this.lastModified = options.lastModified || Date.now();
  }
  
  public size: number;
  public type: string;
  public lastModified: number;
  
  slice(start?: number, end?: number): Blob {
    const slicedBits = this.bits.slice(start, end);
    return new Blob(slicedBits, { type: this.type });
  }
  
  arrayBuffer(): Promise<ArrayBuffer> {
    return Promise.resolve(new ArrayBuffer(this.size));
  }
} as any;

// Mock Blob
global.Blob = class Blob {
  constructor(public bits: BlobPart[] = [], public options: BlobPropertyBag = {}) {
    this.size = bits.reduce((acc, bit) => acc + (bit as any).length || 0, 0);
    this.type = options.type || '';
  }
  
  public size: number;
  public type: string;
  
  slice(start?: number, end?: number): Blob {
    return new Blob(this.bits.slice(start, end), { type: this.type });
  }
  
  arrayBuffer(): Promise<ArrayBuffer> {
    return Promise.resolve(new ArrayBuffer(this.size));
  }
} as any;

// Mock FormData
global.FormData = class FormData {
  private data: Map<string, any> = new Map();
  
  append(key: string, value: any) {
    this.data.set(key, value);
  }
  
  get(key: string) {
    return this.data.get(key);
  }
  
  has(key: string) {
    return this.data.has(key);
  }
} as any;

describe('useFileUpload', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
    (global.fetch as jest.Mock).mockClear();
    (toast.success as jest.Mock).mockClear();
    (toast.error as jest.Mock).mockClear();
    navigator.onLine = true;
    
    // Mock window events
    window.addEventListener = jest.fn();
    window.removeEventListener = jest.fn();
  });

  describe('Hook Initialization', () => {
    test('should initialize with empty uploads', () => {
      const { result } = renderHook(() => useFileUpload());
      
      expect(result.current.uploads).toEqual([]);
      expect(result.current.isOnline).toBe(true);
    });

    test('should restore uploads from localStorage', () => {
      const storedData = {
        'file1': {
          progress: {
            fileId: 'file1',
            fileName: 'test.txt',
            fileSize: 1000,
            uploadedBytes: 500,
            progress: 50,
            status: 'paused',
            retryCount: 0,
            chunkSize: 1024,
            totalChunks: 1,
            uploadedChunks: [],
            startTime: Date.now(),
          },
          file: { name: 'test.txt', size: 1000, type: 'text/plain', lastModified: Date.now() },
          options: { url: '/api/upload' },
        },
      };
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(storedData));
      
      const { result } = renderHook(() => useFileUpload());
      
      expect(result.current.uploads).toHaveLength(1);
      expect(result.current.uploads[0].fileId).toBe('file1');
      expect(toast.success).toHaveBeenCalledWith('Found 1 incomplete upload(s)');
    });

    test('should handle corrupted localStorage data', () => {
      mockLocalStorage.getItem.mockReturnValue('invalid json');
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const { result } = renderHook(() => useFileUpload());
      
      expect(result.current.uploads).toEqual([]);
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('File Upload Functionality', () => {
    test('should start file upload successfully', async () => {
      const { result } = renderHook(() => useFileUpload());
      
      const testFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
      const options = {
        url: '/api/upload',
        onProgress: jest.fn(),
        onComplete: jest.fn(),
        workspaceId: 'workspace1',
      };
      
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ uploadId: 'upload1', chunkIndex: 0 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ id: 'file1', name: 'test.txt' }),
        });
      
      await act(async () => {
        await result.current.uploadFile(testFile, options);
      });
      
      expect(result.current.uploads).toHaveLength(1);
      expect(result.current.uploads[0].status).toBe('completed');
      expect(options.onComplete).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('File test.txt uploaded successfully');
    });

    test('should handle chunk upload failure with retry', async () => {
      const { result } = renderHook(() => useFileUpload());
      
      const testFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
      const options = {
        url: '/api/upload',
        maxRetries: 2,
        retryDelay: 100,
        onError: jest.fn(),
      };
      
      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'));
      
      await act(async () => {
        await result.current.uploadFile(testFile, options);
      });
      
      expect(result.current.uploads).toHaveLength(1);
      expect(result.current.uploads[0].status).toBe('failed');
      expect(options.onError).toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalled();
    });

    test('should handle offline scenario', async () => {
      navigator.onLine = false;
      
      const { result } = renderHook(() => useFileUpload());
      
      const testFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
      const options = { url: '/api/upload' };
      
      await act(async () => {
        await result.current.uploadFile(testFile, options);
      });
      
      expect(toast.error).toHaveBeenCalledWith(
        'No internet connection. Upload will start when connection is restored.'
      );
      expect(result.current.uploads).toHaveLength(0);
    });

    test('should handle large file chunking', async () => {
      const { result } = renderHook(() => useFileUpload());
      
      const largeContent = 'x'.repeat(5 * 1024 * 1024); // 5MB
      const testFile = new File([largeContent], 'large.txt', { type: 'text/plain' });
      const options = {
        url: '/api/upload',
        chunkSize: 1024 * 1024, // 1MB chunks
      };
      
      (global.fetch as jest.Mock)
        .mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ uploadId: 'upload1', chunkIndex: 0 }),
        });
      
      await act(async () => {
        await result.current.uploadFile(testFile, options);
      });
      
      expect(result.current.uploads).toHaveLength(1);
      expect(result.current.uploads[0].totalChunks).toBe(5);
      expect(global.fetch).toHaveBeenCalledTimes(6); // 5 chunks + 1 complete
    });
  });

  describe('Upload Progress and Status', () => {
    test('should track upload progress correctly', async () => {
      const { result } = renderHook(() => useFileUpload());
      
      const testFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
      const onProgress = jest.fn();
      const options = {
        url: '/api/upload',
        onProgress,
        chunkSize: 5, // Small chunks for testing
      };
      
      (global.fetch as jest.Mock)
        .mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ uploadId: 'upload1', chunkIndex: 0 }),
        });
      
      await act(async () => {
        await result.current.uploadFile(testFile, options);
      });
      
      expect(onProgress).toHaveBeenCalled();
      const progressCalls = onProgress.mock.calls;
      
      // Check that progress increases over time
      expect(progressCalls[0][0].progress).toBeLessThan(progressCalls[progressCalls.length - 1][0].progress);
    });

    test('should pause upload correctly', async () => {
      const { result } = renderHook(() => useFileUpload());
      
      const testFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
      const options = { url: '/api/upload' };
      
      // Start upload
      act(() => {
        result.current.uploadFile(testFile, options);
      });
      
      // Pause upload
      act(() => {
        result.current.pauseUpload('test.txt-12-' + testFile.lastModified);
      });
      
      await waitFor(() => {
        const upload = result.current.uploads.find(u => u.fileName === 'test.txt');
        expect(upload?.status).toBe('paused');
      });
    });

    test('should cancel upload correctly', async () => {
      const { result } = renderHook(() => useFileUpload());
      
      const testFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
      const options = { url: '/api/upload' };
      
      // Start upload
      act(() => {
        result.current.uploadFile(testFile, options);
      });
      
      const fileId = 'test.txt-12-' + testFile.lastModified;
      
      // Cancel upload
      act(() => {
        result.current.cancelUpload(fileId);
      });
      
      expect(result.current.uploads).toHaveLength(0);
      expect(toast).toHaveBeenCalledWith('Upload cancelled');
    });
  });

  describe('Resume Upload Functionality', () => {
    test('should resume upload from paused state', async () => {
      const { result } = renderHook(() => useFileUpload());
      
      const testFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
      const fileId = 'test.txt-12-' + testFile.lastModified;
      
      // Set up initial paused upload
      act(() => {
        result.current.uploadFile(testFile, { url: '/api/upload' });
        result.current.pauseUpload(fileId);
      });
      
      // Mock server status response
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            uploadId: fileId,
            totalChunks: 3,
            receivedChunks: 1,
            missingChunks: [1, 2],
          }),
        })
        .mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ uploadId: fileId, chunkIndex: 0 }),
        });
      
      await act(async () => {
        await result.current.resumeUpload(fileId, { url: '/api/upload' });
      });
      
      expect(toast.success).toHaveBeenCalledWith(
        expect.stringContaining('Resuming upload with')
      );
    });

    test('should handle resume when server has no record', async () => {
      const { result } = renderHook(() => useFileUpload());
      
      const testFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
      const fileId = 'test.txt-12-' + testFile.lastModified;
      
      // Mock server status response - no record
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
        });
      
      await act(async () => {
        await result.current.resumeUpload(fileId, { url: '/api/upload' });
      });
      
      expect(toast).toHaveBeenCalledWith(
        'Server has no record of this upload, starting fresh'
      );
    });
  });

  describe('Network Status Handling', () => {
    test('should handle online/offline events', async () => {
      const { result } = renderHook(() => useFileUpload());
      
      // Simulate going offline
      act(() => {
        navigator.onLine = false;
        window.dispatchEvent(new Event('offline'));
      });
      
      expect(result.current.isOnline).toBe(false);
      
      // Simulate coming back online
      act(() => {
        navigator.onLine = true;
        window.dispatchEvent(new Event('online'));
      });
      
      expect(result.current.isOnline).toBe(true);
      expect(toast.success).toHaveBeenCalledWith('Connection restored');
    });

    test('should auto-resume uploads when coming back online', async () => {
      const { result } = renderHook(() => useFileUpload());
      
      const testFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
      const fileId = 'test.txt-12-' + testFile.lastModified;
      
      // Set up paused upload
      act(() => {
        result.current.uploadFile(testFile, { url: '/api/upload' });
        result.current.pauseUpload(fileId);
      });
      
      // Mock fetch for resume
      (global.fetch as jest.Mock)
        .mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ uploadId: fileId }),
        });
      
      // Simulate coming back online
      await act(async () => {
        navigator.onLine = true;
        window.dispatchEvent(new Event('online'));
      });
      
      expect(toast.success).toHaveBeenCalledWith('Connection restored');
    });
  });

  describe('Error Handling', () => {
    test('should handle authentication errors', async () => {
      const { result } = renderHook(() => useFileUpload());
      
      const testFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
      const options = { url: '/api/upload', onError: jest.fn() };
      
      (global.fetch as jest.Mock)
        .mockResolvedValue({
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
        });
      
      await act(async () => {
        await result.current.uploadFile(testFile, options);
      });
      
      expect(result.current.uploads[0].status).toBe('failed');
      expect(result.current.uploads[0].error).toContain('Authentication failed');
      expect(options.onError).toHaveBeenCalled();
    });

    test('should handle rate limiting errors', async () => {
      const { result } = renderHook(() => useFileUpload());
      
      const testFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
      const options = { url: '/api/upload', retryDelay: 100 };
      
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
        })
        .mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ uploadId: 'upload1', chunkIndex: 0 }),
        });
      
      await act(async () => {
        await result.current.uploadFile(testFile, options);
      });
      
      expect(result.current.uploads[0].status).toBe('completed');
      expect(global.fetch).toHaveBeenCalledTimes(3); // 1 failed + 1 retry + 1 complete
    });

    test('should handle server errors with exponential backoff', async () => {
      const { result } = renderHook(() => useFileUpload());
      
      const testFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
      const options = { url: '/api/upload', maxRetries: 3, retryDelay: 100 };
      
      (global.fetch as jest.Mock)
        .mockResolvedValue({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
        });
      
      const startTime = Date.now();
      
      await act(async () => {
        await result.current.uploadFile(testFile, options);
      });
      
      const endTime = Date.now();
      const elapsedTime = endTime - startTime;
      
      expect(result.current.uploads[0].status).toBe('failed');
      expect(elapsedTime).toBeGreaterThan(700); // Should have waited for retries
      expect(global.fetch).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
    });
  });

  describe('Utility Functions', () => {
    test('should clear completed uploads', () => {
      const { result } = renderHook(() => useFileUpload());
      
      // Manually set uploads for testing
      act(() => {
        result.current.uploadFile(new File(['test1'], 'test1.txt'), { url: '/api/upload' });
        result.current.uploadFile(new File(['test2'], 'test2.txt'), { url: '/api/upload' });
      });
      
      act(() => {
        result.current.clearCompleted();
      });
      
      const completedUploads = result.current.uploads.filter(u => u.status === 'completed');
      expect(completedUploads).toHaveLength(0);
    });

    test('should retry failed uploads', async () => {
      const { result } = renderHook(() => useFileUpload());
      
      const testFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
      const fileId = 'test.txt-12-' + testFile.lastModified;
      
      // Start upload that will fail
      (global.fetch as jest.Mock)
        .mockResolvedValue({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
        });
      
      await act(async () => {
        await result.current.uploadFile(testFile, { url: '/api/upload' });
      });
      
      expect(result.current.uploads[0].status).toBe('failed');
      
      // Mock successful retry
      (global.fetch as jest.Mock)
        .mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ uploadId: fileId }),
        });
      
      await act(async () => {
        await result.current.retryUpload(fileId, { url: '/api/upload' });
      });
      
      expect(result.current.uploads[0].status).toBe('completed');
    });
  });

  describe('LocalStorage Persistence', () => {
    test('should persist upload progress to localStorage', async () => {
      const { result } = renderHook(() => useFileUpload());
      
      const testFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
      
      await act(async () => {
        await result.current.uploadFile(testFile, { url: '/api/upload' });
      });
      
      // Should call setItem to persist progress
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'abacushub_upload_progress',
        expect.any(String)
      );
    });

    test('should clean up localStorage on completion', async () => {
      const { result } = renderHook(() => useFileUpload());
      
      const testFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
      
      (global.fetch as jest.Mock)
        .mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ uploadId: 'upload1', chunkIndex: 0 }),
        });
      
      await act(async () => {
        await result.current.uploadFile(testFile, { url: '/api/upload' });
      });
      
      // Should remove from localStorage after completion
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('abacushub_upload_progress');
    });
  });
});