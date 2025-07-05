# File Upload API Documentation

## Overview

The AbacusHub file upload API provides chunked file upload capabilities with comprehensive error recovery, resume functionality, and real-time notifications. It supports files up to 500MB with automatic retry mechanisms and progress tracking.

## Architecture

### Key Features

- **Chunked Uploads**: Files are split into 1MB chunks for reliable transfer
- **Resume Capability**: Interrupted uploads can be resumed from the last successful chunk
- **Error Recovery**: Intelligent retry logic with exponential backoff
- **Real-time Notifications**: Progress updates via Server-Sent Events
- **Authentication**: NextAuth.js integration with workspace-based access control
- **Storage Abstraction**: File system storage with S3-compatible interface

### Upload Flow

1. **Start Upload**: Client initiates chunked upload
2. **Chunk Transfer**: Upload chunks sequentially with retry logic
3. **Progress Updates**: Real-time notifications sent to connected clients
4. **Completion**: Server assembles chunks and creates database record
5. **Cleanup**: Temporary files removed and notifications sent

## API Endpoints

### Upload Chunks
```http
POST /api/upload?action=chunk
Content-Type: multipart/form-data
```

**Form Data:**
- `chunk` (File): The file chunk to upload
- `fileName` (string): Original filename
- `fileId` (string): Unique upload session ID
- `chunkIndex` (number): Zero-based chunk index
- `totalChunks` (number): Total number of chunks
- `fileSize` (number): Total file size in bytes
- `workspaceId` (string, optional): Target workspace ID

**Response:**
```json
{
  "uploadId": "file.txt-12345-1234567890",
  "chunkIndex": 0,
  "received": 1,
  "total": 10
}
```

**Error Responses:**
- `400` - Missing required parameters or invalid chunk
- `401` - Authentication required
- `403` - Workspace access denied
- `413` - Chunk too large
- `429` - Rate limited
- `500` - Server error

### Complete Upload
```http
POST /api/upload?action=complete
Content-Type: application/json
```

**Request Body:**
```json
{
  "uploadId": "file.txt-12345-1234567890"
}
```

**Response:**
```json
{
  "id": "clx1y2z3w4v5u6t7s8r9q0",
  "name": "document.pdf",
  "size": 1048576,
  "mimeType": "application/pdf",
  "uploadedAt": "2023-07-01T12:00:00.000Z"
}
```

**Error Responses:**
- `400` - Upload incomplete or missing chunks
- `404` - Upload session not found
- `403` - Unauthorized access to upload session

### Check Upload Status
```http
POST /api/upload?action=status
Content-Type: application/json
```

**Request Body:**
```json
{
  "uploadId": "file.txt-12345-1234567890"
}
```

**Response:**
```json
{
  "uploadId": "file.txt-12345-1234567890",
  "filename": "document.pdf",
  "totalChunks": 10,
  "receivedChunks": 7,
  "missingChunks": [3, 8, 9],
  "createdAt": "2023-07-01T12:00:00.000Z",
  "lastActivity": "2023-07-01T12:05:00.000Z"
}
```

## File Serving

### Download/View File
```http
GET /api/files/{fileId}
```

**Headers:**
- `Range` (optional): For partial content requests

**Response:**
- `200` - Full file content
- `206` - Partial content (with Range header)
- `401` - Authentication required
- `403` - Access denied
- `404` - File not found

**Response Headers:**
- `Content-Type`: File MIME type
- `Content-Length`: File size
- `Content-Disposition`: Inline with filename
- `Accept-Ranges`: bytes
- `Cache-Control`: private, max-age=3600

### Delete File
```http
DELETE /api/files/{fileId}
```

**Response:**
```json
{
  "success": true,
  "message": "File deleted successfully"
}
```

## Client-Side Integration

### Using the Upload Hook

```typescript
import { useFileUpload } from '@/hooks/use-file-upload';

function FileUploadComponent() {
  const { uploadFile, uploads, pauseUpload, resumeUpload } = useFileUpload();
  
  const handleUpload = (file: File) => {
    uploadFile(file, {
      url: '/api/upload',
      workspaceId: 'workspace-id',
      onProgress: (progress) => {
        console.log(`Progress: ${progress.progress}%`);
      },
      onComplete: (fileId, response) => {
        console.log('Upload complete:', response);
      },
      onError: (fileId, error) => {
        console.error('Upload failed:', error);
      },
    });
  };
  
  return (
    <div>
      {uploads.map(upload => (
        <div key={upload.fileId}>
          <span>{upload.fileName}</span>
          <progress value={upload.progress} max={100} />
          {upload.status === 'paused' && (
            <button onClick={() => resumeUpload(upload.fileId, options)}>
              Resume
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
```

### Enhanced Upload Hook

```typescript
import { useEnhancedFileUpload } from '@/hooks/use-enhanced-file-upload';

function EnhancedUploadComponent() {
  const { 
    uploads, 
    uploadFile, 
    getTotalProgress, 
    getOverallStats 
  } = useEnhancedFileUpload();
  
  const stats = getOverallStats();
  const totalProgress = getTotalProgress();
  
  return (
    <div>
      <div>Overall Progress: {totalProgress.toFixed(1)}%</div>
      <div>Success Rate: {stats.successRate.toFixed(1)}%</div>
      <div>Average Speed: {(stats.averageSpeed / 1024 / 1024).toFixed(2)} MB/s</div>
    </div>
  );
}
```

## Error Handling

### Retry Logic

The upload system implements intelligent retry logic:

- **Exponential Backoff**: Delays increase exponentially (1s, 2s, 4s, 8s...)
- **Error-Specific Delays**: Different minimum delays based on error type
- **Non-Retryable Errors**: Authentication and authorization errors stop retries
- **Maximum Retries**: Default 5 attempts per chunk

### Error Types

1. **Rate Limited (429)**: Minimum 10-second delay
2. **Server Error (5xx)**: Minimum 5-second delay  
3. **Authentication Failed (401)**: No retry
4. **Access Denied (403)**: No retry
5. **Chunk Too Large (413)**: No retry

### Recovery Mechanisms

- **Network Reconnection**: Automatic resume when connection restored
- **Session Persistence**: Upload state saved to localStorage
- **Server Verification**: Status check before resuming uploads
- **File Re-selection**: Prompt user to re-select file for resume

## Real-time Notifications

### Event Types

- `file_upload_started`: Upload session initiated
- `file_upload_progress`: Progress updates (every 20% or significant milestones)
- `file_upload_completed`: Upload finished successfully
- `file_upload_failed`: Upload failed permanently

### Event Data Structure

```typescript
interface UploadNotification {
  type: 'file_upload_started' | 'file_upload_progress' | 'file_upload_completed' | 'file_upload_failed';
  data: {
    fileId: string;
    fileName: string;
    fileSize: number;
    progress?: number;
    error?: string;
    uploadedBy: string;
    timestamp: string;
  };
  workspaceId?: string;
  userId: string;
}
```

## Configuration

### Environment Variables

```env
# File upload limits
MAX_FILE_SIZE=524288000  # 500MB in bytes
MAX_CHUNK_SIZE=5242880   # 5MB maximum chunk size
MIN_CHUNK_SIZE=1048576   # 1MB minimum chunk size

# Storage configuration
STORAGE_PATH=./uploads   # Local storage directory
```

### Upload Constants

```typescript
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
const CHUNK_SIZE = 1024 * 1024; // 1MB
const UPLOAD_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours
const DEFAULT_MAX_RETRIES = 5;
const DEFAULT_RETRY_DELAY = 1000; // 1 second
```

## Security Considerations

### Authentication & Authorization

- All endpoints require valid NextAuth.js session
- Workspace-based access control for file uploads
- File access verified on download requests

### File Validation

- MIME type validation on upload
- File size limits enforced
- Path traversal protection in storage layer

### Rate Limiting

- IP-based rate limiting per endpoint
- Exponential backoff for failed requests
- Connection throttling for abuse prevention

## Storage Layer

### Local File System

```typescript
interface StorageProvider {
  read(key: string): Promise<Buffer>;
  write(key: string, data: Buffer): Promise<void>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  getMetadata(key: string): Promise<{size: number, lastModified: Date}>;
}
```

### File Organization

```
uploads/
├── temp/                    # Temporary upload chunks
│   └── {uploadId}          # Assembled chunk data
└── workspaces/             # Final file storage
    └── {workspaceId}/
        └── files/
            └── {fileId}.ext
```

## Performance Optimization

### Chunking Strategy

- **1MB Default**: Optimal balance of progress granularity and overhead
- **Adaptive Sizing**: Could be adjusted based on connection speed
- **Parallel Uploads**: Multiple files can upload simultaneously

### Caching

- **File Metadata**: Cached for quick access checks
- **Upload Sessions**: In-memory for active transfers
- **File Content**: Browser cache headers for downloads

### Monitoring

- **Upload Success Rate**: Track completion percentage
- **Average Speed**: Monitor transfer performance
- **Error Patterns**: Identify common failure points

## Troubleshooting

### Common Issues

1. **Upload Fails Immediately**
   - Check authentication status
   - Verify workspace permissions
   - Confirm file size limits

2. **Chunks Upload But Complete Fails**
   - Check server storage space
   - Verify all chunks received
   - Review upload timeout settings

3. **Resume Not Working**
   - Ensure localStorage not cleared
   - Check server upload session timeout
   - Verify file still exists for re-selection

### Debug Information

Enable detailed logging:
```typescript
// Client-side
localStorage.setItem('upload-debug', 'true');

// Server-side
console.log('Upload debug:', {
  uploadId,
  receivedChunks: upload.receivedChunks.size,
  totalChunks: upload.totalChunks,
  missingChunks: Array.from({length: upload.totalChunks}, (_, i) => i)
    .filter(i => !upload.receivedChunks.has(i))
});
```

## Migration Notes

### Future S3 Integration

The storage layer is designed for easy migration to S3-compatible services:

```typescript
// Future S3 implementation
class S3StorageProvider implements StorageProvider {
  // Implementation using AWS SDK or compatible library
}

export const storage = process.env.USE_S3 
  ? new S3StorageProvider()
  : new LocalStorageProvider();
```

### Database Schema Changes

If migrating to include file path field:

```sql
ALTER TABLE files ADD COLUMN path TEXT;
UPDATE files SET path = url WHERE path IS NULL;
```