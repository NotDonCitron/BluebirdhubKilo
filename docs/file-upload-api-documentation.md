# AbacusHub File Upload API Documentation

## Table of Contents
1. [Overview](#overview)
2. [Authentication](#authentication)
3. [API Endpoints](#api-endpoints)
   - [Upload API](#upload-api)
   - [Download API](#download-api)
4. [Client Integration](#client-integration)
5. [Error Handling](#error-handling)
6. [Security Considerations](#security-considerations)
7. [Examples](#examples)

## Overview

The AbacusHub File Upload System provides a robust, resumable file upload capability with the following features:

- **Chunked uploads** - Files are uploaded in 1MB chunks for reliability
- **Resume capability** - Failed uploads can be resumed from the last successful chunk
- **Progress tracking** - Real-time upload progress with percentage and speed
- **Network resilience** - Automatic pause/resume on network disconnection
- **Large file support** - Handles files up to 500MB
- **Session persistence** - Upload progress persists across page reloads
- **Workspace isolation** - Files are organized by workspace

### Key Technical Features
- Exponential backoff retry logic with jitter
- localStorage persistence for upload state
- Network status monitoring (online/offline)
- TypeScript type safety throughout
- Streaming file downloads
- Flexible storage backend (local filesystem with S3 ready)

## Authentication

All API endpoints require authentication via Next-Auth session. The session must include:

```typescript
interface Session {
  user: {
    id: string;
    email?: string;
    name?: string;
  }
}
```

Authentication is handled automatically when using the provided React hooks. For direct API calls, ensure the session cookie is included.

## API Endpoints

### Upload API

**Endpoint:** `POST /api/upload`

The upload API supports three actions: initiating chunks, completing uploads, and checking status.

#### Request Body Schema

```typescript
interface UploadRequest {
  action: "chunk" | "complete" | "status";
  uploadId: string;
  workspaceId: string;
  filename?: string;      // Required for "chunk" action (first chunk only)
  fileType?: string;      // Required for "chunk" action (first chunk only)
  totalChunks?: number;   // Required for "chunk" action (first chunk only)
  chunkIndex?: number;    // Required for "chunk" action
}
```

#### Actions

##### 1. Upload Chunk

Uploads a single chunk of the file. The file data should be sent as a `Blob` in the `chunk` field of a FormData object.

**Request:**
```javascript
const formData = new FormData();
formData.append('action', 'chunk');
formData.append('uploadId', 'unique-upload-id');
formData.append('workspaceId', 'workspace-123');
formData.append('filename', 'document.pdf');      // First chunk only
formData.append('fileType', 'application/pdf');  // First chunk only
formData.append('totalChunks', '10');            // First chunk only
formData.append('chunkIndex', '0');
formData.append('chunk', chunkBlob);             // The actual file chunk

const response = await fetch('/api/upload', {
  method: 'POST',
  body: formData,
});
```

**Response (200 OK):**
```json
{
  "uploadId": "unique-upload-id",
  "chunkIndex": 0,
  "chunksReceived": [0],
  "status": "uploading"
}
```

##### 2. Complete Upload

Finalizes the upload after all chunks have been uploaded.

**Request:**
```javascript
const response = await fetch('/api/upload', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'complete',
    uploadId: 'unique-upload-id',
    workspaceId: 'workspace-123'
  }),
});
```

**Response (200 OK):**
```json
{
  "fileId": "clh3k4j5k0001qwerty123456",
  "status": "completed",
  "file": {
    "id": "clh3k4j5k0001qwerty123456",
    "filename": "document.pdf",
    "size": 10485760,
    "type": "application/pdf",
    "workspaceId": "workspace-123",
    "uploadedBy": "user-123",
    "createdAt": "2024-01-07T10:30:00.000Z"
  }
}
```

##### 3. Check Status

Retrieves the current status of an upload session.

**Request:**
```javascript
const response = await fetch('/api/upload', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'status',
    uploadId: 'unique-upload-id',
    workspaceId: 'workspace-123'
  }),
});
```

**Response (200 OK):**
```json
{
  "uploadId": "unique-upload-id",
  "chunksReceived": [0, 1, 2, 3, 5],
  "totalChunks": 10,
  "status": "uploading",
  "missingChunks": [4, 6, 7, 8, 9]
}
```

#### Error Responses

**400 Bad Request:**
```json
{
  "error": "Invalid request",
  "details": "Missing required field: workspaceId"
}
```

**401 Unauthorized:**
```json
{
  "error": "Unauthorized",
  "details": "Authentication required"
}
```

**404 Not Found:**
```json
{
  "error": "Upload session not found"
}
```

**409 Conflict:**
```json
{
  "error": "Chunk already received",
  "chunkIndex": 5,
  "chunksReceived": [0, 1, 2, 3, 4, 5]
}
```

**413 Payload Too Large:**
```json
{
  "error": "File too large",
  "maxSize": "500MB"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Internal server error",
  "details": "Failed to process chunk"
}
```

### Download API

**Endpoint:** `GET /api/files/:id`

Downloads a file by its ID. Supports range requests for partial downloads.

#### Request Headers

- `Range` (optional): Byte range for partial download, e.g., `bytes=0-1023`

#### Response Headers

- `Content-Type`: The MIME type of the file
- `Content-Length`: Size of the response body
- `Content-Disposition`: Suggests filename for download
- `Accept-Ranges`: Indicates support for range requests
- `Content-Range`: Byte range being returned (for partial requests)
- `Cache-Control`: Caching directives

#### Example Request

```javascript
// Full file download
const response = await fetch('/api/files/clh3k4j5k0001qwerty123456');

// Partial download (first 1MB)
const response = await fetch('/api/files/clh3k4j5k0001qwerty123456', {
  headers: {
    'Range': 'bytes=0-1048575'
  }
});
```

#### Success Responses

**200 OK** (Full content):
- Returns the complete file
- Includes all headers mentioned above

**206 Partial Content** (Range request):
- Returns the requested byte range
- Includes `Content-Range` header

#### Error Responses

**401 Unauthorized:**
```json
{
  "error": "Unauthorized"
}
```

**403 Forbidden:**
```json
{
  "error": "Access denied"
}
```

**404 Not Found:**
```json
{
  "error": "File not found"
}
```

**416 Range Not Satisfiable:**
```json
{
  "error": "Requested range not satisfiable"
}
```

## Client Integration

### Using the useFileUpload Hook

The `useFileUpload` hook provides a complete interface for file uploads with all features built-in.

```typescript
import { useFileUpload } from '@/hooks/use-file-upload';

function UploadComponent() {
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

  const handleFileSelect = (file: File) => {
    uploadFile(file, {
      url: '/api/upload',
      workspaceId: 'workspace-123',
      maxRetries: 5,
      onProgress: (progress) => {
        console.log(`Upload ${progress.percentage}% complete`);
      },
      onComplete: (fileId, response) => {
        console.log('Upload completed:', fileId);
      },
      onError: (error) => {
        console.error('Upload failed:', error);
      }
    });
  };

  return (
    <div>
      {!isOnline && <div>Offline - Uploads paused</div>}
      
      {Array.from(uploads.values()).map(upload => (
        <div key={upload.id}>
          <div>{upload.file.name}</div>
          <div>{upload.progress}%</div>
          <div>Status: {upload.status}</div>
          
          {upload.status === 'uploading' && (
            <button onClick={() => pauseUpload(upload.id)}>Pause</button>
          )}
          
          {upload.status === 'paused' && (
            <button onClick={() => resumeUpload(upload.id)}>Resume</button>
          )}
          
          {upload.status === 'error' && (
            <button onClick={() => retryUpload(upload.id)}>Retry</button>
          )}
          
          <button onClick={() => cancelUpload(upload.id)}>Cancel</button>
        </div>
      ))}
    </div>
  );
}
```

### Hook Features

#### Upload States
- `pending`: Upload initialized but not started
- `uploading`: Actively uploading chunks
- `paused`: Manually paused or offline
- `error`: Upload failed (can be retried)
- `completed`: Successfully uploaded
- `cancelled`: Cancelled by user

#### Progress Information
```typescript
interface UploadProgress {
  id: string;
  file: File;
  progress: number;          // 0-100
  uploadedBytes: number;
  totalBytes: number;
  status: UploadStatus;
  error?: string;
  speed?: number;           // Bytes per second
  timeRemaining?: number;   // Seconds
  fileId?: string;          // Available after completion
  startTime: number;
  workspaceId?: string;
}
```

#### Network Monitoring
- Automatic pause when offline
- Automatic resume when back online
- Visual indicator via `isOnline` state
- Toast notifications for status changes

#### Persistence
- Upload progress saved to localStorage
- Survives page refreshes
- Prompts to re-select file for security
- Validates file identity (name, size, lastModified)

## Error Handling

### Network Errors

The system implements exponential backoff with jitter for network errors:

```javascript
// Retry delays: 1s, 2s, 4s, 8s, 16s, 30s (max)
// With ±30% jitter to prevent thundering herd
```

### Common Error Scenarios

1. **Network Disconnection**
   - Uploads automatically pause
   - Resume when connection restored
   - No data loss

2. **Server Errors (5xx)**
   - Automatic retry with backoff
   - User can manually retry
   - Error details in UI

3. **Session Expiration**
   - Upload fails with 401
   - User must re-authenticate
   - Can resume after login

4. **File Too Large**
   - Immediate rejection
   - Clear error message
   - 500MB limit enforced

5. **Duplicate Chunks**
   - Server ignores duplicates
   - Upload continues normally
   - No data corruption

## Security Considerations

1. **Authentication Required**
   - All endpoints require valid session
   - User ID tracked for all uploads

2. **Workspace Isolation**
   - Files scoped to workspaces
   - Access control enforced

3. **File Type Validation**
   - MIME type stored and validated
   - Future: Content scanning integration

4. **Size Limits**
   - 500MB maximum file size
   - 1MB maximum chunk size
   - Configurable limits

5. **Secure File Storage**
   - Files stored outside web root
   - Unique IDs prevent enumeration
   - Future: Encryption at rest

## Examples

### Complete Upload Example

```javascript
// 1. Initialize upload
const fileInput = document.getElementById('file-input');
const file = fileInput.files[0];

// 2. Upload with progress tracking
const { uploadFile } = useFileUpload();

const uploadId = uploadFile(file, {
  url: '/api/upload',
  workspaceId: 'workspace-123',
  onProgress: (progress) => {
    console.log(`Progress: ${progress.progress}%`);
    console.log(`Speed: ${(progress.speed / 1024 / 1024).toFixed(2)} MB/s`);
    console.log(`Time remaining: ${progress.timeRemaining}s`);
  },
  onComplete: (fileId, response) => {
    console.log('Upload complete!', fileId);
    // Now you can use the fileId to download or reference the file
  },
  onError: (error) => {
    console.error('Upload failed:', error);
  }
});
```

### Resume After Page Reload

```javascript
// The hook automatically detects incomplete uploads
const { uploads } = useFileUpload();

// Check for uploads needing file re-selection
useEffect(() => {
  for (const [id, upload] of uploads) {
    if (upload.status === 'pending' && !upload.file) {
      // Prompt user to re-select the file
      promptFileReselection(upload);
    }
  }
}, [uploads]);

function promptFileReselection(upload) {
  // Show UI to re-select file
  // Validate it matches original (name, size, lastModified)
  // Then resume upload
}
```

### Download with Progress

```javascript
async function downloadFile(fileId: string) {
  const response = await fetch(`/api/files/${fileId}`);
  
  if (!response.ok) {
    throw new Error(`Download failed: ${response.statusText}`);
  }
  
  const contentLength = response.headers.get('content-length');
  const total = parseInt(contentLength, 10);
  let loaded = 0;
  
  const reader = response.body.getReader();
  const chunks = [];
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    chunks.push(value);
    loaded += value.length;
    
    const progress = (loaded / total) * 100;
    console.log(`Download progress: ${progress.toFixed(2)}%`);
  }
  
  // Combine chunks and create blob
  const blob = new Blob(chunks);
  const url = URL.createObjectURL(blob);
  
  // Trigger download
  const a = document.createElement('a');
  a.href = url;
  a.download = 'filename.ext';
  a.click();
  
  URL.revokeObjectURL(url);
}
```

### Error Handling Example

```javascript
const { uploadFile } = useFileUpload();

try {
  const uploadId = uploadFile(file, {
    url: '/api/upload',
    workspaceId: 'workspace-123',
    maxRetries: 5,
    onError: (error) => {
      // Handle specific error types
      if (error.message.includes('File too large')) {
        alert('File must be under 500MB');
      } else if (error.message.includes('Unauthorized')) {
        // Redirect to login
        window.location.href = '/login';
      } else {
        // Generic error handling
        console.error('Upload error:', error);
      }
    }
  });
} catch (error) {
  console.error('Failed to start upload:', error);
}
```

## Next Steps

### Planned Enhancements

1. **S3 Integration**
   - Multipart uploads for better performance
   - Direct browser-to-S3 uploads
   - Presigned URLs for security

2. **Virus Scanning**
   - Automatic scanning after upload
   - Quarantine suspicious files
   - ClamAV or cloud service integration

3. **Image Processing**
   - Automatic thumbnail generation
   - Format conversion
   - EXIF data handling

4. **Advanced Features**
   - Folder uploads
   - Drag-and-drop zones
   - Upload from URL
   - Compression before upload

### Production Considerations

1. **Redis Integration**
   ```javascript
   // Replace in-memory upload tracking
   const uploadSession = await redis.get(`upload:${uploadId}`);
   ```

2. **Distributed Locking**
   ```javascript
   // Prevent concurrent chunk processing
   const lock = await redis.lock(`upload:${uploadId}:chunk:${chunkIndex}`);
   ```

3. **Monitoring**
   - Upload success/failure rates
   - Average upload speeds
   - Storage usage by workspace
   - Failed upload debugging

4. **Performance Optimization**
   - CDN for downloads
   - Parallel chunk uploads
   - Adaptive chunk sizing
   - Connection pooling