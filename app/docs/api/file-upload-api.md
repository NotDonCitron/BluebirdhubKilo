# AbacusHub File Upload API Documentation

## Overview

The AbacusHub file upload system provides a robust, chunked upload mechanism with resume capability, real-time progress tracking, and comprehensive error handling. This documentation covers all aspects of the file upload API and client-side integration.

## Table of Contents

1. [API Endpoints](#api-endpoints)
2. [Authentication](#authentication)
3. [Request/Response Formats](#requestresponse-formats)
4. [Client-Side Integration](#client-side-integration)
5. [Error Handling](#error-handling)
6. [Usage Examples](#usage-examples)
7. [Performance Optimization](#performance-optimization)
8. [Security Considerations](#security-considerations)
9. [Troubleshooting](#troubleshooting)

---

## API Endpoints

### Base URL
```
https://your-domain.com/api
```

### Upload Endpoints

#### 1. Chunked Upload
**POST** `/api/upload?action=chunk`

Uploads individual chunks of a file. Supports resumable uploads with automatic retry mechanisms.

**Request Format:**
```http
POST /api/upload?action=chunk
Content-Type: multipart/form-data
Authorization: Bearer {session-token}

Form Data:
- chunk: File (binary data)
- fileName: string
- fileId: string (unique identifier)
- chunkIndex: number (0-based)
- totalChunks: number
- fileSize: number
- workspaceId: string (optional)
```

**Response Format:**
```json
{
  "uploadId": "string",
  "chunkIndex": 0,
  "received": 1,
  "total": 10
}
```

**Status Codes:**
- `200 OK` - Chunk uploaded successfully
- `400 Bad Request` - Invalid parameters or chunk data
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions
- `413 Request Entity Too Large` - Chunk size exceeds limit
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server processing error

---

#### 2. Complete Upload
**POST** `/api/upload?action=complete`

Finalizes the upload after all chunks have been received and assembles the complete file.

**Request Format:**
```http
POST /api/upload?action=complete
Content-Type: application/json
Authorization: Bearer {session-token}

{
  "uploadId": "string"
}
```

**Response Format:**
```json
{
  "id": "file-uuid",
  "name": "document.pdf",
  "size": 1048576,
  "mimeType": "application/pdf",
  "uploadedAt": "2025-07-08T10:30:00Z"
}
```

**Status Codes:**
- `200 OK` - Upload completed successfully
- `400 Bad Request` - Missing chunks or invalid upload ID
- `404 Not Found` - Upload session not found
- `403 Forbidden` - Insufficient permissions
- `500 Internal Server Error` - Server processing error

---

#### 3. Upload Status
**POST** `/api/upload?action=status`

Retrieves the current status of an upload session, including missing chunks for resume capability.

**Request Format:**
```http
POST /api/upload?action=status
Content-Type: application/json
Authorization: Bearer {session-token}

{
  "uploadId": "string"
}
```

**Response Format:**
```json
{
  "uploadId": "string",
  "filename": "document.pdf",
  "totalChunks": 10,
  "receivedChunks": 7,
  "missingChunks": [3, 8, 9],
  "createdAt": "2025-07-08T10:00:00Z",
  "lastActivity": "2025-07-08T10:25:00Z"
}
```

**Status Codes:**
- `200 OK` - Status retrieved successfully
- `404 Not Found` - Upload session not found
- `403 Forbidden` - Insufficient permissions
- `500 Internal Server Error` - Server processing error

---

#### 4. Cancel Upload
**POST** `/api/upload?action=cancel`

Cancels an active upload session and cleans up temporary files.

**Request Format:**
```http
POST /api/upload?action=cancel
Content-Type: application/json
Authorization: Bearer {session-token}

{
  "uploadId": "string"
}
```

**Response Format:**
```json
{
  "success": true,
  "message": "Upload cancelled successfully"
}
```

---

### File Management Endpoints

#### 5. List Files
**GET** `/api/files`

Retrieves a list of files with optional filtering and search capabilities.

**Query Parameters:**
- `workspaceId` (optional) - Filter by workspace
- `category` (optional) - Filter by AI-generated category
- `search` (optional) - Search in file names and metadata

**Response Format:**
```json
[
  {
    "id": "file-uuid",
    "name": "document.pdf",
    "originalName": "My Document.pdf",
    "size": 1048576,
    "mimeType": "application/pdf",
    "url": "workspaces/workspace-id/files/file-uuid.pdf",
    "uploadedBy": {
      "id": "user-id",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "workspace": {
      "id": "workspace-id",
      "name": "Project Alpha",
      "color": "#3B82F6"
    },
    "createdAt": "2025-07-08T10:30:00Z",
    "updatedAt": "2025-07-08T10:30:00Z"
  }
]
```

---

#### 6. Get File
**GET** `/api/files/{id}`

Retrieves file metadata and serves the file content with support for range requests.

**Headers:**
- `Range` (optional) - For partial content requests (e.g., `bytes=0-1023`)

**Response Format:**
- File content with appropriate headers
- Supports HTTP range requests for streaming
- Includes caching headers for optimization

---

#### 7. Delete File
**DELETE** `/api/files/{id}`

Permanently deletes a file and its metadata.

**Response Format:**
```json
{
  "success": true,
  "message": "File deleted successfully"
}
```

---

## Authentication

All API endpoints require authentication using NextAuth.js session tokens. The system supports:

- **Session-based authentication** via cookies
- **Bearer token authentication** for API clients
- **Workspace-based authorization** for file access

### Headers Required:
```http
Authorization: Bearer {session-token}
# OR
Cookie: next-auth.session-token={session-token}
```

---

## Request/Response Formats

### Common Response Structure

**Success Response:**
```json
{
  "data": { /* response data */ },
  "status": "success",
  "timestamp": "2025-07-08T10:30:00Z"
}
```

**Error Response:**
```json
{
  "error": "Error message",
  "details": { /* optional error details */ },
  "status": "error",
  "timestamp": "2025-07-08T10:30:00Z"
}
```

### File Upload Progress Response
```json
{
  "fileId": "unique-file-id",
  "fileName": "document.pdf",
  "fileSize": 1048576,
  "uploadedBytes": 524288,
  "progress": 50,
  "status": "uploading",
  "chunkSize": 1048576,
  "totalChunks": 10,
  "uploadedChunks": [0, 1, 2, 3, 4],
  "startTime": 1720436400000,
  "retryCount": 0
}
```

---

## Client-Side Integration

### useFileUpload Hook

The `useFileUpload` hook provides a complete client-side upload solution with automatic retry, resume capability, and progress tracking.

#### Basic Usage

```typescript
import { useFileUpload } from "@/hooks/use-file-upload";

const { uploads, uploadFile, pauseUpload, resumeUpload, cancelUpload } = useFileUpload();

// Upload a file
const handleUpload = (file: File) => {
  uploadFile(file, {
    url: "/api/upload",
    workspaceId: "workspace-id",
    chunkSize: 1024 * 1024, // 1MB chunks
    maxRetries: 5,
    onProgress: (progress) => {
      console.log(`Upload progress: ${progress.progress}%`);
    },
    onComplete: (fileId, response) => {
      console.log("Upload completed:", response);
    },
    onError: (fileId, error) => {
      console.error("Upload failed:", error);
    }
  });
};
```

#### Advanced Configuration

```typescript
const uploadOptions = {
  url: "/api/upload",
  headers: {
    "X-Custom-Header": "value"
  },
  chunkSize: 2 * 1024 * 1024, // 2MB chunks for better performance
  maxRetries: 10,
  retryDelay: 2000, // 2 second base delay
  workspaceId: "workspace-id",
  onProgress: (progress) => {
    // Update UI with progress
    updateProgressBar(progress.progress);
    
    // Show upload speed
    const speed = calculateUploadSpeed(progress);
    showUploadSpeed(speed);
  },
  onComplete: (fileId, response) => {
    // Handle successful upload
    addFileToList(response);
    showSuccessNotification(`File ${response.name} uploaded successfully`);
  },
  onError: (fileId, error) => {
    // Handle upload error
    showErrorNotification(`Upload failed: ${error.message}`);
    logError(error);
  }
};
```

### FileUpload Component

A ready-to-use React component with drag-and-drop functionality:

```typescript
import { FileUpload } from "@/components/ui/file-upload";

<FileUpload
  uploadUrl="/api/upload"
  maxFiles={10}
  maxFileSize={500 * 1024 * 1024} // 500MB
  acceptedFileTypes={["image/*", "application/pdf", ".docx"]}
  onUploadComplete={(fileId, response) => {
    // Handle successful upload
    refreshFileList();
  }}
  onUploadError={(fileId, error) => {
    // Handle upload error
    console.error("Upload failed:", error);
  }}
/>
```

---

## Error Handling

### Client-Side Error Types

1. **Network Errors**
   - Connection timeout
   - Network interruption
   - Server unavailable

2. **Authentication Errors**
   - Invalid session
   - Expired token
   - Insufficient permissions

3. **Validation Errors**
   - File size exceeds limit
   - Invalid file type
   - Missing required parameters

4. **Server Errors**
   - Internal server error
   - Storage unavailable
   - Database connection issues

### Error Recovery Strategies

```typescript
// Automatic retry with exponential backoff
const getRetryDelay = (retryCount: number, errorType: string) => {
  let baseDelay = 1000; // 1 second
  
  // Adjust delay based on error type
  if (errorType.includes("Rate limited")) {
    baseDelay = 10000; // 10 seconds for rate limiting
  } else if (errorType.includes("Server error")) {
    baseDelay = 5000; // 5 seconds for server errors
  }
  
  // Exponential backoff with jitter
  const exponentialDelay = baseDelay * Math.pow(2, retryCount);
  const jitter = Math.random() * 0.3 * exponentialDelay;
  
  return Math.min(exponentialDelay + jitter, 60000); // Cap at 60 seconds
};
```

### Network Resilience

```typescript
// Auto-pause uploads when offline
window.addEventListener("offline", () => {
  uploads.forEach((upload, fileId) => {
    if (upload.status === "uploading") {
      pauseUpload(fileId);
    }
  });
});

// Auto-resume uploads when back online
window.addEventListener("online", () => {
  uploads.forEach((upload, fileId) => {
    if (upload.status === "paused") {
      resumeUpload(fileId, uploadOptions);
    }
  });
});
```

---

## Usage Examples

### Simple File Upload

```typescript
// Basic file upload
const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (file) {
    uploadFile(file, {
      url: "/api/upload",
      workspaceId: "workspace-123",
      onComplete: (fileId, response) => {
        console.log("Upload completed:", response);
      }
    });
  }
};
```

### Large File Upload with Progress

```typescript
const handleLargeFileUpload = (file: File) => {
  // Optimize chunk size based on file size
  const chunkSize = file.size > 100 * 1024 * 1024 ? 
    5 * 1024 * 1024 : // 5MB chunks for files > 100MB
    1024 * 1024; // 1MB chunks for smaller files
  
  uploadFile(file, {
    url: "/api/upload",
    workspaceId: "workspace-123",
    chunkSize,
    maxRetries: 10,
    onProgress: (progress) => {
      // Update progress bar
      setUploadProgress(progress.progress);
      
      // Calculate and show ETA
      const eta = calculateETA(progress);
      setEstimatedTime(eta);
      
      // Show upload speed
      const speed = calculateSpeed(progress);
      setUploadSpeed(speed);
    },
    onComplete: (fileId, response) => {
      setUploadProgress(100);
      showSuccessMessage("File uploaded successfully!");
    },
    onError: (fileId, error) => {
      showErrorMessage(`Upload failed: ${error.message}`);
    }
  });
};
```

### Multiple Concurrent Uploads

```typescript
const handleMultipleFiles = (files: FileList) => {
  const uploadPromises = Array.from(files).map(file => {
    return new Promise((resolve, reject) => {
      uploadFile(file, {
        url: "/api/upload",
        workspaceId: "workspace-123",
        onComplete: (fileId, response) => resolve(response),
        onError: (fileId, error) => reject(error)
      });
    });
  });
  
  Promise.allSettled(uploadPromises).then(results => {
    const successful = results.filter(r => r.status === "fulfilled").length;
    const failed = results.filter(r => r.status === "rejected").length;
    
    showSummary(`${successful} files uploaded successfully, ${failed} failed`);
  });
};
```

### Resume Upload After Page Refresh

```typescript
// The hook automatically handles resume on page refresh
// Upload progress is persisted in localStorage
const ResumeUploadExample = () => {
  const { uploads, resumeUpload } = useFileUpload();
  
  useEffect(() => {
    // Auto-resume incomplete uploads on component mount
    uploads.forEach((upload) => {
      if (upload.status === "paused" && navigator.onLine) {
        resumeUpload(upload.fileId, {
          url: "/api/upload",
          workspaceId: upload.workspaceId,
          onComplete: (fileId, response) => {
            console.log("Resume completed:", response);
          }
        });
      }
    });
  }, [uploads, resumeUpload]);
  
  return <div>Upload will resume automatically</div>;
};
```

### Upload with Real-time Notifications

```typescript
const handleUploadWithNotifications = (file: File) => {
  uploadFile(file, {
    url: "/api/upload",
    workspaceId: "workspace-123",
    onProgress: (progress) => {
      // Send progress to other users via WebSocket
      websocket.send(JSON.stringify({
        type: "upload_progress",
        fileId: progress.fileId,
        progress: progress.progress,
        fileName: progress.fileName
      }));
      
      // Show milestone notifications
      if (progress.progress === 25) {
        toast.info("Upload 25% complete");
      } else if (progress.progress === 50) {
        toast.info("Upload 50% complete");
      } else if (progress.progress === 75) {
        toast.info("Upload 75% complete");
      }
    },
    onComplete: (fileId, response) => {
      // Send completion notification
      websocket.send(JSON.stringify({
        type: "upload_complete",
        fileId,
        fileName: response.name
      }));
      
      toast.success("Upload completed successfully!");
    }
  });
};
```

---

## Performance Optimization

### Chunk Size Optimization

```typescript
// Adaptive chunk size based on file size and network conditions
const getOptimalChunkSize = (fileSize: number, networkSpeed: number) => {
  if (fileSize < 10 * 1024 * 1024) { // < 10MB
    return 512 * 1024; // 512KB chunks
  } else if (fileSize < 100 * 1024 * 1024) { // < 100MB
    return 1024 * 1024; // 1MB chunks
  } else if (fileSize < 1024 * 1024 * 1024) { // < 1GB
    return 2 * 1024 * 1024; // 2MB chunks
  } else {
    return 5 * 1024 * 1024; // 5MB chunks for very large files
  }
};
```

### Concurrent Upload Limits

```typescript
// Limit concurrent uploads to avoid overwhelming the server
const MAX_CONCURRENT_UPLOADS = 3;
const uploadQueue = [];
let activeUploads = 0;

const queueUpload = (file: File, options: UploadOptions) => {
  if (activeUploads < MAX_CONCURRENT_UPLOADS) {
    startUpload(file, options);
  } else {
    uploadQueue.push({ file, options });
  }
};

const startUpload = (file: File, options: UploadOptions) => {
  activeUploads++;
  uploadFile(file, {
    ...options,
    onComplete: (fileId, response) => {
      activeUploads--;
      processQueue();
      options.onComplete?.(fileId, response);
    },
    onError: (fileId, error) => {
      activeUploads--;
      processQueue();
      options.onError?.(fileId, error);
    }
  });
};

const processQueue = () => {
  if (uploadQueue.length > 0 && activeUploads < MAX_CONCURRENT_UPLOADS) {
    const { file, options } = uploadQueue.shift();
    startUpload(file, options);
  }
};
```

### Memory Management

```typescript
// Efficient file reading for large files
const readFileChunk = (file: File, start: number, end: number): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file.slice(start, end));
  });
};

// Cleanup completed uploads to free memory
const cleanupCompletedUploads = () => {
  uploads.forEach((upload, fileId) => {
    if (upload.status === "completed") {
      // Remove from memory after delay
      setTimeout(() => {
        removeUpload(fileId);
      }, 30000); // 30 seconds
    }
  });
};
```

---

## Security Considerations

### Input Validation

```typescript
// Server-side validation
const validateUploadRequest = (formData: FormData) => {
  const fileName = formData.get("fileName") as string;
  const fileSize = parseInt(formData.get("fileSize") as string);
  
  // Validate file name
  if (!fileName || fileName.length > 255) {
    throw new Error("Invalid file name");
  }
  
  // Check for path traversal attempts
  if (fileName.includes("../") || fileName.includes("..\\")) {
    throw new Error("Invalid file name");
  }
  
  // Validate file size
  if (fileSize > MAX_FILE_SIZE) {
    throw new Error("File size exceeds limit");
  }
  
  // Validate file type
  const allowedTypes = ["image/", "application/pdf", "text/"];
  const fileType = formData.get("fileType") as string;
  if (!allowedTypes.some(type => fileType.startsWith(type))) {
    throw new Error("File type not allowed");
  }
};
```

### Rate Limiting

```typescript
// Implement rate limiting per user/IP
const rateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many upload requests, please try again later"
};

// Apply rate limiting to upload endpoints
app.use("/api/upload", rateLimit(rateLimitConfig));
```

### File Type Validation

```typescript
// Validate file type by magic bytes, not just extension
const validateFileType = (buffer: Buffer, declaredType: string) => {
  const actualType = getFileTypeFromBuffer(buffer);
  
  if (actualType !== declaredType) {
    throw new Error("File type mismatch");
  }
};

// Virus scanning integration
const scanFile = async (filePath: string) => {
  // Integrate with antivirus API
  const scanResult = await antivirusAPI.scanFile(filePath);
  
  if (scanResult.infected) {
    throw new Error("File contains malware");
  }
};
```

---

## Troubleshooting

### Common Issues and Solutions

#### 1. Upload Timeouts
**Problem:** Large files timing out during upload
**Solution:** 
- Increase chunk size for faster uploads
- Implement proper retry logic
- Check network connectivity

```typescript
// Increase timeout for large files
const uploadOptions = {
  timeout: 300000, // 5 minutes
  chunkSize: 5 * 1024 * 1024, // 5MB chunks
  maxRetries: 15
};
```

#### 2. Memory Issues
**Problem:** Browser running out of memory with large files
**Solution:**
- Use smaller chunk sizes
- Implement proper cleanup
- Stream file reading

```typescript
// Use streaming for large files
const streamUpload = async (file: File) => {
  const chunkSize = 1024 * 1024; // 1MB chunks
  const totalChunks = Math.ceil(file.size / chunkSize);
  
  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, file.size);
    const chunk = file.slice(start, end);
    
    await uploadChunk(chunk, i, totalChunks);
    
    // Allow garbage collection
    await new Promise(resolve => setTimeout(resolve, 10));
  }
};
```

#### 3. Network Interruptions
**Problem:** Upload fails when network is interrupted
**Solution:**
- Implement automatic retry with exponential backoff
- Save progress to localStorage
- Resume from last successful chunk

```typescript
// Robust network handling
const uploadWithRetry = async (file: File, options: UploadOptions) => {
  let retries = 0;
  const maxRetries = options.maxRetries || 10;
  
  while (retries < maxRetries) {
    try {
      await uploadFile(file, options);
      break; // Success
    } catch (error) {
      retries++;
      
      if (retries >= maxRetries) {
        throw error;
      }
      
      // Wait before retry
      const delay = getRetryDelay(retries, error.message);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};
```

#### 4. CORS Issues
**Problem:** Cross-origin requests blocked
**Solution:**
- Configure CORS headers properly
- Use credentials for authenticated requests

```typescript
// Server-side CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL,
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
```

### Debug Mode

```typescript
// Enable debug logging
const DEBUG_UPLOAD = process.env.NODE_ENV === "development";

const debugLog = (message: string, data?: any) => {
  if (DEBUG_UPLOAD) {
    console.log(`[UPLOAD DEBUG] ${message}`, data);
  }
};

// Usage in upload logic
debugLog("Starting chunk upload", { chunkIndex, totalChunks });
debugLog("Chunk upload completed", { uploadId, progress });
```

### Performance Monitoring

```typescript
// Monitor upload performance
const monitorUpload = (upload: UploadProgress) => {
  const metrics = {
    fileSize: upload.fileSize,
    chunkSize: upload.chunkSize,
    totalChunks: upload.totalChunks,
    uploadTime: Date.now() - upload.startTime,
    avgSpeed: upload.uploadedBytes / ((Date.now() - upload.startTime) / 1000),
    retryCount: upload.retryCount
  };
  
  // Send metrics to analytics service
  analytics.track("upload_performance", metrics);
};
```

---

## API Rate Limits

| Endpoint | Rate Limit | Window |
|----------|------------|---------|
| `/api/upload` | 100 requests | 15 minutes |
| `/api/files` | 200 requests | 15 minutes |
| `/api/files/{id}` | 50 requests | 15 minutes |

## File Size Limits

| File Type | Maximum Size |
|-----------|--------------|
| Images | 50 MB |
| Documents | 100 MB |
| Videos | 500 MB |
| Archives | 200 MB |
| Other | 100 MB |

## Supported File Types

- **Images**: JPG, PNG, GIF, WebP, SVG
- **Documents**: PDF, DOC, DOCX, TXT, RTF
- **Spreadsheets**: XLS, XLSX, CSV
- **Presentations**: PPT, PPTX
- **Archives**: ZIP, RAR, 7Z, TAR
- **Videos**: MP4, MOV, AVI, WebM
- **Audio**: MP3, WAV, OGG, M4A

---

## Changelog

### Version 1.2.0 (2025-07-08)
- Added resume capability for interrupted uploads
- Implemented real-time progress notifications
- Enhanced error handling with specific error types
- Added network resilience features
- Improved performance with adaptive chunk sizing

### Version 1.1.0 (2025-06-15)
- Added chunked upload support
- Implemented file type validation
- Added rate limiting
- Enhanced security measures

### Version 1.0.0 (2025-05-01)
- Initial release
- Basic file upload functionality
- Authentication integration
- File management endpoints

---

## Support

For technical support or questions about the API, please contact:

- **Email**: support@abacushub.com
- **Documentation**: https://docs.abacushub.com/api/upload
- **GitHub Issues**: https://github.com/abacushub/issues
- **Discord**: https://discord.gg/abacushub

---

*This documentation is maintained by the AbacusHub development team and is updated regularly to reflect the latest API changes and improvements.*