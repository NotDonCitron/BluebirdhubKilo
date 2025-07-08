# AbacusHub File Upload API Documentation

## Overview

The AbacusHub File Upload API provides a robust, chunked upload system with resume capability, network resilience, and comprehensive error handling. This documentation covers all endpoints, usage patterns, and integration examples.

## API Endpoints

### Base URL
- **Development**: `http://localhost:3000/api/upload`
- **Production**: `https://your-domain.com/api/upload`

### Authentication
All upload endpoints require authentication via NextAuth.js session cookies.

## 1. Chunk Upload Endpoint

### `POST /api/upload?action=chunk`

Uploads a single chunk of a file as part of a chunked upload process.

#### Request Format
```http
POST /api/upload?action=chunk
Content-Type: multipart/form-data

FormData:
- action: "chunk"
- fileId: string (unique identifier for the file)
- chunkIndex: number (0-based index of the chunk)
- totalChunks: number (total number of chunks)
- chunk: File (the chunk data)
- fileName: string (original filename)
- fileSize: number (total file size in bytes)
- workspaceId: string (optional - workspace ID if uploading to workspace)
```

#### Response Format
```json
{
  "success": true,
  "uploadedChunks": 5,
  "totalChunks": 10
}
```

#### Error Responses
```json
// 400 Bad Request
{
  "error": "Invalid chunk data"
}

// 401 Unauthorized
{
  "error": "Unauthorized"
}

// 413 Payload Too Large
{
  "error": "Chunk too large"
}

// 429 Too Many Requests
{
  "error": "Rate limited"
}

// 500 Internal Server Error
{
  "error": "Upload failed",
  "details": "Error message"
}
```

## 2. Complete Upload Endpoint

### `POST /api/upload?action=complete`

Finalizes the upload by combining all chunks into the final file.

#### Request Format
```http
POST /api/upload?action=complete
Content-Type: multipart/form-data

FormData:
- action: "complete"
- fileId: string
- fileName: string
- fileSize: number
- mimeType: string
- totalChunks: number
- workspaceId: string (optional)
- folderId: string (optional)
```

#### Response Format
```json
{
  "success": true,
  "file": {
    "id": "file-uuid",
    "name": "document.pdf",
    "originalName": "document.pdf",
    "size": 2048576,
    "mimeType": "application/pdf",
    "url": "/uploads/files/uuid-document.pdf",
    "uploadedBy": {
      "id": "user-uuid",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "workspace": {
      "id": "workspace-uuid",
      "name": "My Workspace",
      "color": "#3b82f6"
    },
    "createdAt": "2023-12-01T12:00:00Z",
    "updatedAt": "2023-12-01T12:00:00Z"
  }
}
```

#### Error Responses
```json
// 400 Bad Request - Missing chunks
{
  "error": "Missing chunks",
  "uploadedChunks": 8,
  "totalChunks": 10
}

// 400 Bad Request - Invalid data
{
  "error": "Invalid file data"
}
```

## 3. Upload Status Endpoint

### `POST /api/upload?action=status`

Checks the current status of an upload in progress.

#### Request Format
```http
POST /api/upload?action=status
Content-Type: multipart/form-data

FormData:
- action: "status"
- fileId: string
```

#### Response Format
```json
{
  "uploadedChunks": [0, 1, 2, 5, 7],
  "totalChunks": 10
}
```

### `GET /api/upload?fileId=<fileId>`

Alternative GET method for checking upload status.

#### Request Format
```http
GET /api/upload?fileId=abc123-document.pdf-1234567890
```

#### Response Format
```json
{
  "fileId": "abc123-document.pdf-1234567890",
  "uploadedChunks": [0, 1, 2, 5, 7]
}
```

## Client-Side Integration

### React Hook Usage

The `useFileUpload` hook provides a complete client-side integration:

```typescript
import { useFileUpload } from '@/hooks/use-file-upload';

function FileUploadComponent() {
  const { 
    uploads, 
    uploadFile, 
    pauseUpload, 
    resumeUpload, 
    cancelUpload,
    retryUpload,
    clearCompleted,
    isOnline 
  } = useFileUpload();

  const handleUpload = async (file: File, workspaceId?: string) => {
    await uploadFile(file, {
      url: '/api/upload',
      workspaceId,
      chunkSize: 1024 * 1024, // 1MB chunks
      maxRetries: 5,
      retryDelay: 1000,
      onProgress: (progress) => {
        console.log(`Upload progress: ${progress.progress}%`);
      },
      onComplete: (fileId, response) => {
        console.log('Upload completed:', response);
      },
      onError: (fileId, error) => {
        console.error('Upload failed:', error);
      }
    });
  };

  return (
    <div>
      <input
        type="file"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUpload(file);
        }}
      />
      
      {uploads.map((upload) => (
        <div key={upload.fileId}>
          <div>{upload.fileName}</div>
          <div>Progress: {upload.progress}%</div>
          <div>Status: {upload.status}</div>
          
          {upload.status === 'uploading' && (
            <button onClick={() => pauseUpload(upload.fileId)}>
              Pause
            </button>
          )}
          
          {upload.status === 'paused' && (
            <button onClick={() => resumeUpload(upload.fileId, options)}>
              Resume
            </button>
          )}
          
          {upload.status === 'failed' && (
            <button onClick={() => retryUpload(upload.fileId, options)}>
              Retry
            </button>
          )}
          
          <button onClick={() => cancelUpload(upload.fileId)}>
            Cancel
          </button>
        </div>
      ))}
      
      <div>Network Status: {isOnline ? 'Online' : 'Offline'}</div>
    </div>
  );
}
```

## Complete Upload Example

### Simple File Upload

```typescript
// Simple upload with minimal configuration
const upload = async (file: File) => {
  await uploadFile(file, {
    url: '/api/upload',
    onComplete: (fileId, response) => {
      console.log('File uploaded successfully:', response.file);
    },
    onError: (fileId, error) => {
      console.error('Upload failed:', error.message);
    }
  });
};
```

### Advanced Upload with Progress Tracking

```typescript
// Advanced upload with custom configuration
const advancedUpload = async (file: File, workspaceId: string) => {
  const startTime = Date.now();
  
  await uploadFile(file, {
    url: '/api/upload',
    workspaceId,
    chunkSize: 2 * 1024 * 1024, // 2MB chunks for large files
    maxRetries: 3,
    retryDelay: 2000,
    onProgress: (progress) => {
      const elapsed = Date.now() - startTime;
      const speed = progress.uploadedBytes / elapsed * 1000; // bytes per second
      const eta = (progress.fileSize - progress.uploadedBytes) / speed;
      
      console.log(`
        Progress: ${progress.progress.toFixed(1)}%
        Speed: ${(speed / 1024 / 1024).toFixed(1)} MB/s
        ETA: ${Math.round(eta)}s
        Chunks: ${progress.uploadedChunks.length}/${progress.totalChunks}
      `);
    },
    onComplete: (fileId, response) => {
      const totalTime = Date.now() - startTime;
      console.log(`Upload completed in ${totalTime}ms`);
      
      // Handle successful upload
      updateFileList(response.file);
    },
    onError: (fileId, error) => {
      console.error('Upload failed:', error);
      
      // Handle error (user notification, retry options, etc.)
      showErrorNotification(`Upload failed: ${error.message}`);
    }
  });
};
```

## Error Handling and Retry Logic

### Automatic Retry with Exponential Backoff

The system automatically retries failed chunks with intelligent backoff:

```typescript
// Retry delays based on error type
const retryDelays = {
  'Rate limited': 10000,      // 10 seconds minimum
  'Server error': 5000,       // 5 seconds minimum
  'Authentication failed': 2000, // 2 seconds minimum
  'Network error': 1000       // 1 second minimum
};

// Exponential backoff with jitter
const delay = baseDelay * Math.pow(2, retryCount) + randomJitter;
```

### Error Types and Handling

```typescript
// Non-retryable errors (fail immediately)
const nonRetryableErrors = [
  'Authentication failed',
  'Access denied',
  'Chunk too large',
  'Invalid file type'
];

// Retryable errors (with exponential backoff)
const retryableErrors = [
  'Network error',
  'Server error',
  'Rate limited',
  'Timeout'
];
```

## Network Resilience

### Offline/Online Detection

```typescript
// Automatic pause/resume on network changes
window.addEventListener('online', () => {
  console.log('Network restored - resuming uploads');
  // Auto-resume paused uploads
});

window.addEventListener('offline', () => {
  console.log('Network lost - pausing uploads');
  // Pause all active uploads
});
```

### Upload Persistence

```typescript
// Uploads are automatically saved to localStorage
const persistedUploads = localStorage.getItem('abacushub_upload_progress');

// Resume uploads after page reload
useEffect(() => {
  const savedUploads = loadPersistedUploads();
  if (savedUploads.length > 0) {
    promptUserToResumeUploads(savedUploads);
  }
}, []);
```

## Performance Optimization

### Chunk Size Optimization

```typescript
// Adaptive chunk size based on file size and network
const getOptimalChunkSize = (fileSize: number, networkSpeed: number) => {
  if (fileSize < 10 * 1024 * 1024) {
    return 512 * 1024; // 512KB for small files
  } else if (fileSize < 100 * 1024 * 1024) {
    return 1024 * 1024; // 1MB for medium files
  } else {
    return 2 * 1024 * 1024; // 2MB for large files
  }
};
```

### Concurrent Upload Limits

```typescript
// Limit concurrent uploads to prevent overwhelming the server
const MAX_CONCURRENT_UPLOADS = 3;

const uploadQueue = new Map<string, File>();
const activeUploads = new Set<string>();

const processUploadQueue = async () => {
  while (activeUploads.size < MAX_CONCURRENT_UPLOADS && uploadQueue.size > 0) {
    const [fileId, file] = uploadQueue.entries().next().value;
    uploadQueue.delete(fileId);
    activeUploads.add(fileId);
    
    try {
      await uploadFile(file, options);
    } finally {
      activeUploads.delete(fileId);
    }
  }
};
```

## Security Considerations

### File Validation

```typescript
// Client-side validation (server-side validation is also required)
const validateFile = (file: File) => {
  const maxSize = 500 * 1024 * 1024; // 500MB
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'application/pdf',
    'text/plain'
  ];
  
  if (file.size > maxSize) {
    throw new Error('File too large');
  }
  
  if (!allowedTypes.includes(file.type)) {
    throw new Error('File type not allowed');
  }
};
```

### Authentication

```typescript
// All requests automatically include session cookies
const uploadWithAuth = async (file: File) => {
  // Session is automatically validated on server
  await uploadFile(file, {
    url: '/api/upload',
    // No need to manually add auth headers
  });
};
```

## Testing

### Unit Tests

```typescript
// Test upload hook
import { renderHook, act } from '@testing-library/react';
import { useFileUpload } from '@/hooks/use-file-upload';

test('should upload file successfully', async () => {
  const { result } = renderHook(() => useFileUpload());
  
  const mockFile = new File(['test content'], 'test.txt', {
    type: 'text/plain'
  });
  
  await act(async () => {
    await result.current.uploadFile(mockFile, {
      url: '/api/upload',
      onComplete: jest.fn(),
      onError: jest.fn()
    });
  });
  
  expect(result.current.uploads[0].status).toBe('completed');
});
```

### Integration Tests

```typescript
// Test complete upload workflow
test('should handle chunked upload workflow', async () => {
  const file = new File(['x'.repeat(5000000)], 'large.txt'); // 5MB file
  
  const onProgress = jest.fn();
  const onComplete = jest.fn();
  
  await uploadFile(file, {
    url: '/api/upload',
    chunkSize: 1024 * 1024, // 1MB chunks
    onProgress,
    onComplete
  });
  
  expect(onProgress).toHaveBeenCalledTimes(5); // 5 chunks
  expect(onComplete).toHaveBeenCalledWith(
    expect.any(String),
    expect.objectContaining({
      file: expect.objectContaining({
        name: 'large.txt',
        size: 5000000
      })
    })
  );
});
```

## Troubleshooting

### Common Issues

1. **Upload fails with 413 error**
   - Chunk size too large
   - Reduce chunk size in upload options

2. **Upload stalls at 99%**
   - Final completion request failing
   - Check server logs for completion endpoint errors

3. **Resume not working**
   - File not found in memory
   - User will be prompted to re-select file

4. **High memory usage**
   - Large files being held in memory
   - Consider reducing concurrent uploads

### Debug Information

```typescript
// Enable debug logging
const uploadWithDebug = async (file: File) => {
  await uploadFile(file, {
    url: '/api/upload',
    onProgress: (progress) => {
      console.log('Upload debug:', {
        fileId: progress.fileId,
        progress: progress.progress,
        uploadedChunks: progress.uploadedChunks,
        retryCount: progress.retryCount,
        status: progress.status
      });
    }
  });
};
```

## API Rate Limits

- **Chunk uploads**: 100 requests per minute per user
- **Status checks**: 1000 requests per minute per user
- **Completion requests**: 10 requests per minute per user

## Best Practices

1. **Choose appropriate chunk size** based on file size and network conditions
2. **Implement proper error handling** for all upload scenarios  
3. **Validate files** on both client and server side
4. **Use progress callbacks** to provide user feedback
5. **Handle network interruptions** gracefully
6. **Clean up completed uploads** to prevent memory leaks
7. **Implement upload queuing** for multiple files
8. **Add upload cancellation** for better user experience

## Browser Compatibility

- **Chrome**: 60+ ✅
- **Firefox**: 60+ ✅
- **Safari**: 12+ ✅
- **Edge**: 79+ ✅
- **Mobile browsers**: iOS 12+, Android 7+ ✅

## Conclusion

The AbacusHub Upload API provides a production-ready, resilient file upload system with comprehensive error handling, network resilience, and resume capabilities. The client-side integration through the `useFileUpload` hook makes it easy to implement robust file upload functionality in React applications.

For additional support or feature requests, please refer to the project documentation or contact the development team.