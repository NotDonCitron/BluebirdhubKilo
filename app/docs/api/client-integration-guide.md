# Client-Side Integration Guide

## Overview

This guide provides comprehensive examples for integrating the AbacusHub file upload system into your React applications. The system is built around the `useFileUpload` hook and `FileUpload` component, offering features like chunked uploads, resume capability, and real-time progress tracking.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Hook Usage Patterns](#hook-usage-patterns)
3. [Component Integration](#component-integration)
4. [Advanced Scenarios](#advanced-scenarios)
5. [Error Handling](#error-handling)
6. [Performance Optimization](#performance-optimization)
7. [Custom Implementations](#custom-implementations)
8. [Testing Strategies](#testing-strategies)

---

## Quick Start

### Basic Setup

```typescript
import { useFileUpload } from "@/hooks/use-file-upload";
import { FileUpload } from "@/components/ui/file-upload";

function MyUploadComponent() {
  const { uploads, uploadFile } = useFileUpload();
  
  const handleFileSelect = (file: File) => {
    uploadFile(file, {
      url: "/api/upload",
      workspaceId: "workspace-123",
      onComplete: (fileId, response) => {
        console.log("Upload completed:", response);
      }
    });
  };
  
  return (
    <FileUpload
      uploadUrl="/api/upload"
      onUploadComplete={(fileId, response) => {
        console.log("File uploaded:", response);
      }}
    />
  );
}
```

### Environment Setup

```typescript
// types/upload.ts
export interface UploadConfig {
  apiUrl: string;
  maxFileSize: number;
  chunkSize: number;
  supportedTypes: string[];
}

// config/upload.ts
export const uploadConfig: UploadConfig = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL || "/api",
  maxFileSize: 500 * 1024 * 1024, // 500MB
  chunkSize: 1024 * 1024, // 1MB
  supportedTypes: [
    "image/*",
    "application/pdf",
    "text/*",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ]
};
```

---

## Hook Usage Patterns

### 1. Basic Upload Hook

```typescript
import { useFileUpload } from "@/hooks/use-file-upload";

function BasicUploadExample() {
  const { uploads, uploadFile, isOnline } = useFileUpload();
  
  const handleUpload = (file: File) => {
    uploadFile(file, {
      url: "/api/upload",
      workspaceId: "workspace-123",
      onProgress: (progress) => {
        console.log(`Progress: ${progress.progress}%`);
      },
      onComplete: (fileId, response) => {
        console.log("Upload completed:", response);
      },
      onError: (fileId, error) => {
        console.error("Upload failed:", error);
      }
    });
  };
  
  return (
    <div>
      <input 
        type="file" 
        onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
        disabled={!isOnline}
      />
      
      {uploads.map(upload => (
        <div key={upload.fileId}>
          {upload.fileName}: {upload.progress}%
        </div>
      ))}
    </div>
  );
}
```

### 2. Upload with Progress Tracking

```typescript
import { useState } from "react";
import { useFileUpload, UploadProgress } from "@/hooks/use-file-upload";

function ProgressTrackingExample() {
  const { uploads, uploadFile } = useFileUpload();
  const [uploadStats, setUploadStats] = useState<Map<string, {
    speed: number;
    eta: number;
    startTime: number;
  }>>(new Map());
  
  const calculateStats = (progress: UploadProgress) => {
    const now = Date.now();
    const elapsed = now - progress.startTime;
    const speed = progress.uploadedBytes / (elapsed / 1000); // bytes per second
    const remainingBytes = progress.fileSize - progress.uploadedBytes;
    const eta = remainingBytes / speed;
    
    setUploadStats(prev => new Map(prev).set(progress.fileId, {
      speed,
      eta,
      startTime: progress.startTime
    }));
  };
  
  const handleUpload = (file: File) => {
    uploadFile(file, {
      url: "/api/upload",
      workspaceId: "workspace-123",
      onProgress: (progress) => {
        calculateStats(progress);
      },
      onComplete: (fileId, response) => {
        setUploadStats(prev => {
          const newMap = new Map(prev);
          newMap.delete(fileId);
          return newMap;
        });
      }
    });
  };
  
  const formatSpeed = (bytesPerSecond: number) => {
    const mbps = bytesPerSecond / (1024 * 1024);
    return `${mbps.toFixed(1)} MB/s`;
  };
  
  const formatETA = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h`;
  };
  
  return (
    <div>
      <input type="file" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} />
      
      {uploads.map(upload => {
        const stats = uploadStats.get(upload.fileId);
        return (
          <div key={upload.fileId} className="upload-item">
            <div className="upload-info">
              <span>{upload.fileName}</span>
              <span>{upload.progress.toFixed(1)}%</span>
            </div>
            
            <div className="upload-progress">
              <div 
                className="progress-bar"
                style={{ width: `${upload.progress}%` }}
              />
            </div>
            
            {stats && (
              <div className="upload-stats">
                <span>Speed: {formatSpeed(stats.speed)}</span>
                <span>ETA: {formatETA(stats.eta)}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

### 3. Upload Queue Management

```typescript
import { useCallback, useState } from "react";
import { useFileUpload } from "@/hooks/use-file-upload";

function QueueManagementExample() {
  const { uploads, uploadFile, pauseUpload, resumeUpload, cancelUpload } = useFileUpload();
  const [uploadQueue, setUploadQueue] = useState<File[]>([]);
  const [maxConcurrent, setMaxConcurrent] = useState(3);
  
  const addToQueue = useCallback((files: File[]) => {
    setUploadQueue(prev => [...prev, ...files]);
  }, []);
  
  const processQueue = useCallback(() => {
    const activeUploads = uploads.filter(u => u.status === "uploading").length;
    const availableSlots = maxConcurrent - activeUploads;
    
    if (availableSlots > 0 && uploadQueue.length > 0) {
      const filesToUpload = uploadQueue.slice(0, availableSlots);
      setUploadQueue(prev => prev.slice(availableSlots));
      
      filesToUpload.forEach(file => {
        uploadFile(file, {
          url: "/api/upload",
          workspaceId: "workspace-123",
          onComplete: () => {
            // Process queue again when upload completes
            setTimeout(processQueue, 100);
          },
          onError: () => {
            // Process queue again even if upload fails
            setTimeout(processQueue, 100);
          }
        });
      });
    }
  }, [uploads, uploadQueue, maxConcurrent, uploadFile]);
  
  // Process queue when conditions change
  useEffect(() => {
    processQueue();
  }, [processQueue]);
  
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    addToQueue(files);
  };
  
  return (
    <div>
      <div className="upload-controls">
        <input type="file" multiple onChange={handleFileSelect} />
        <label>
          Max concurrent uploads:
          <input 
            type="number" 
            value={maxConcurrent} 
            onChange={(e) => setMaxConcurrent(parseInt(e.target.value))}
            min="1"
            max="10"
          />
        </label>
      </div>
      
      <div className="queue-status">
        <p>Queue: {uploadQueue.length} files waiting</p>
        <p>Active: {uploads.filter(u => u.status === "uploading").length} uploads</p>
      </div>
      
      <div className="upload-list">
        {uploads.map(upload => (
          <div key={upload.fileId} className="upload-item">
            <span>{upload.fileName}</span>
            <span>{upload.status}</span>
            <span>{upload.progress.toFixed(1)}%</span>
            
            <div className="upload-actions">
              {upload.status === "uploading" && (
                <button onClick={() => pauseUpload(upload.fileId)}>
                  Pause
                </button>
              )}
              {upload.status === "paused" && (
                <button onClick={() => resumeUpload(upload.fileId, {
                  url: "/api/upload",
                  workspaceId: "workspace-123"
                })}>
                  Resume
                </button>
              )}
              <button onClick={() => cancelUpload(upload.fileId)}>
                Cancel
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 4. Resume Capability

```typescript
import { useEffect } from "react";
import { useFileUpload } from "@/hooks/use-file-upload";
import { toast } from "react-hot-toast";

function ResumeCapabilityExample() {
  const { uploads, resumeUpload, clearCompleted } = useFileUpload();
  
  // Auto-resume paused uploads when component mounts
  useEffect(() => {
    const pausedUploads = uploads.filter(u => u.status === "paused");
    
    if (pausedUploads.length > 0) {
      toast.success(`Found ${pausedUploads.length} paused uploads. Resuming...`);
      
      pausedUploads.forEach(upload => {
        resumeUpload(upload.fileId, {
          url: "/api/upload",
          workspaceId: upload.workspaceId || "workspace-123",
          onComplete: (fileId, response) => {
            toast.success(`${response.name} upload completed`);
          },
          onError: (fileId, error) => {
            toast.error(`Resume failed: ${error.message}`);
          }
        });
      });
    }
  }, []); // Run once on mount
  
  const handleResumeAll = () => {
    const pausedUploads = uploads.filter(u => u.status === "paused");
    
    pausedUploads.forEach(upload => {
      resumeUpload(upload.fileId, {
        url: "/api/upload",
        workspaceId: upload.workspaceId || "workspace-123"
      });
    });
  };
  
  const handleClearCompleted = () => {
    clearCompleted();
    toast.success("Completed uploads cleared");
  };
  
  return (
    <div>
      <div className="resume-controls">
        <button onClick={handleResumeAll}>
          Resume All Paused
        </button>
        <button onClick={handleClearCompleted}>
          Clear Completed
        </button>
      </div>
      
      <div className="upload-list">
        {uploads.map(upload => (
          <div key={upload.fileId} className={`upload-item ${upload.status}`}>
            <div className="upload-info">
              <span>{upload.fileName}</span>
              <span className="status">{upload.status}</span>
            </div>
            
            <div className="upload-progress">
              <div 
                className="progress-bar"
                style={{ width: `${upload.progress}%` }}
              />
              <span>{upload.progress.toFixed(1)}%</span>
            </div>
            
            {upload.status === "paused" && (
              <div className="pause-info">
                <span>Paused - can be resumed</span>
                <button onClick={() => resumeUpload(upload.fileId, {
                  url: "/api/upload",
                  workspaceId: upload.workspaceId || "workspace-123"
                })}>
                  Resume
                </button>
              </div>
            )}
            
            {upload.error && (
              <div className="error-info">
                <span>Error: {upload.error}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Component Integration

### 1. Custom File Upload Component

```typescript
import React, { useRef, useState } from "react";
import { useFileUpload } from "@/hooks/use-file-upload";
import { Upload, X, Pause, Play, RotateCcw } from "lucide-react";

interface CustomFileUploadProps {
  workspaceId: string;
  onUploadComplete?: (files: any[]) => void;
  maxFiles?: number;
  acceptedTypes?: string[];
}

function CustomFileUpload({ 
  workspaceId, 
  onUploadComplete, 
  maxFiles = 10,
  acceptedTypes = ["*/*"]
}: CustomFileUploadProps) {
  const { uploads, uploadFile, pauseUpload, resumeUpload, cancelUpload } = useFileUpload();
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [completedFiles, setCompletedFiles] = useState<any[]>([]);
  
  const handleFiles = (files: FileList) => {
    Array.from(files).forEach(file => {
      uploadFile(file, {
        url: "/api/upload",
        workspaceId,
        onComplete: (fileId, response) => {
          setCompletedFiles(prev => [...prev, response]);
          
          // Check if all uploads are complete
          const allComplete = uploads.every(u => u.status === "completed");
          if (allComplete && onUploadComplete) {
            onUploadComplete([...completedFiles, response]);
          }
        }
      });
    });
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFiles(files);
    }
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      handleFiles(files);
    }
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "text-green-600";
      case "failed": return "text-red-600";
      case "paused": return "text-yellow-600";
      case "uploading": return "text-blue-600";
      default: return "text-gray-600";
    }
  };
  
  return (
    <div className="custom-file-upload">
      {/* Drop Zone */}
      <div
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-colors duration-200
          ${isDragOver ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"}
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2 text-sm text-gray-600">
          {isDragOver ? "Drop files here..." : "Drag & drop files or click to select"}
        </p>
        <p className="text-xs text-gray-500">
          {acceptedTypes.join(", ")} • Max {maxFiles} files
        </p>
      </div>
      
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptedTypes.join(",")}
        onChange={handleFileSelect}
        className="hidden"
      />
      
      {/* Upload Progress */}
      {uploads.length > 0 && (
        <div className="mt-6 space-y-3">
          <h3 className="text-sm font-medium text-gray-900">Upload Progress</h3>
          
          {uploads.map(upload => (
            <div key={upload.fileId} className="border rounded-lg p-4 bg-white">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">
                      {upload.fileName}
                    </span>
                    <span className={`text-xs font-medium ${getStatusColor(upload.status)}`}>
                      {upload.status}
                    </span>
                  </div>
                  
                  <div className="mt-2 flex items-center space-x-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${upload.progress}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500">
                      {upload.progress.toFixed(1)}%
                    </span>
                  </div>
                  
                  {upload.error && (
                    <p className="mt-1 text-xs text-red-600">
                      {upload.error}
                    </p>
                  )}
                </div>
                
                <div className="ml-4 flex items-center space-x-2">
                  {upload.status === "uploading" && (
                    <button
                      onClick={() => pauseUpload(upload.fileId)}
                      className="p-1 text-gray-400 hover:text-gray-600"
                    >
                      <Pause className="h-4 w-4" />
                    </button>
                  )}
                  
                  {upload.status === "paused" && (
                    <button
                      onClick={() => resumeUpload(upload.fileId, {
                        url: "/api/upload",
                        workspaceId
                      })}
                      className="p-1 text-gray-400 hover:text-gray-600"
                    >
                      <Play className="h-4 w-4" />
                    </button>
                  )}
                  
                  {upload.status === "failed" && (
                    <button
                      onClick={() => {
                        // Retry upload
                        uploadFile(/* file */, {
                          url: "/api/upload",
                          workspaceId
                        });
                      }}
                      className="p-1 text-gray-400 hover:text-gray-600"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </button>
                  )}
                  
                  <button
                    onClick={() => cancelUpload(upload.fileId)}
                    className="p-1 text-gray-400 hover:text-red-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default CustomFileUpload;
```

### 2. Upload Modal Component

```typescript
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useFileUpload } from "@/hooks/use-file-upload";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  onUploadComplete?: (files: any[]) => void;
}

function UploadModal({ isOpen, onClose, workspaceId, onUploadComplete }: UploadModalProps) {
  const { uploads, uploadFile } = useFileUpload();
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  
  const handleUpload = (files: FileList) => {
    Array.from(files).forEach(file => {
      uploadFile(file, {
        url: "/api/upload",
        workspaceId,
        onComplete: (fileId, response) => {
          setUploadedFiles(prev => [...prev, response]);
        }
      });
    });
  };
  
  const handleClose = () => {
    const hasActiveUploads = uploads.some(u => u.status === "uploading");
    
    if (hasActiveUploads) {
      const confirmClose = window.confirm(
        "You have active uploads. Are you sure you want to close? Uploads will continue in the background."
      );
      if (!confirmClose) return;
    }
    
    if (uploadedFiles.length > 0 && onUploadComplete) {
      onUploadComplete(uploadedFiles);
    }
    
    onClose();
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload Files</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <input
              type="file"
              multiple
              onChange={(e) => e.target.files && handleUpload(e.target.files)}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              <div className="space-y-2">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <p className="text-sm text-gray-600">
                  Click to select files or drag and drop
                </p>
              </div>
            </label>
          </div>
          
          {uploads.length > 0 && (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {uploads.map(upload => (
                <div key={upload.fileId} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex-1">
                    <div className="text-sm font-medium">{upload.fileName}</div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${upload.progress}%` }}
                      />
                    </div>
                  </div>
                  <div className="ml-4 text-xs text-gray-500">
                    {upload.progress.toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="flex justify-end space-x-2">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
          >
            {uploads.some(u => u.status === "uploading") ? "Continue in Background" : "Close"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default UploadModal;
```

### 3. Bulk Upload Component

```typescript
import React, { useState, useCallback } from "react";
import { useFileUpload } from "@/hooks/use-file-upload";
import { useDropzone } from "react-dropzone";

interface BulkUploadProps {
  workspaceId: string;
  onBulkUploadComplete?: (results: { successful: any[], failed: any[] }) => void;
}

function BulkUpload({ workspaceId, onBulkUploadComplete }: BulkUploadProps) {
  const { uploads, uploadFile } = useFileUpload();
  const [uploadResults, setUploadResults] = useState<{
    successful: any[];
    failed: any[];
  }>({ successful: [], failed: [] });
  
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const uploadPromises = acceptedFiles.map(file => {
      return new Promise((resolve, reject) => {
        uploadFile(file, {
          url: "/api/upload",
          workspaceId,
          onComplete: (fileId, response) => {
            setUploadResults(prev => ({
              ...prev,
              successful: [...prev.successful, response]
            }));
            resolve(response);
          },
          onError: (fileId, error) => {
            setUploadResults(prev => ({
              ...prev,
              failed: [...prev.failed, { fileName: file.name, error: error.message }]
            }));
            reject(error);
          }
        });
      });
    });
    
    Promise.allSettled(uploadPromises).then(() => {
      if (onBulkUploadComplete) {
        onBulkUploadComplete(uploadResults);
      }
    });
  }, [uploadFile, workspaceId, uploadResults, onBulkUploadComplete]);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    maxFiles: 50
  });
  
  const totalFiles = uploads.length;
  const completedFiles = uploads.filter(u => u.status === "completed").length;
  const failedFiles = uploads.filter(u => u.status === "failed").length;
  const overallProgress = totalFiles > 0 ? (completedFiles / totalFiles) * 100 : 0;
  
  return (
    <div className="bulk-upload">
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-colors duration-200
          ${isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300"}
        `}
      >
        <input {...getInputProps()} />
        <div className="space-y-2">
          <Upload className="mx-auto h-16 w-16 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900">
            {isDragActive ? "Drop files here..." : "Bulk File Upload"}
          </h3>
          <p className="text-sm text-gray-600">
            Drag and drop multiple files or click to select
          </p>
          <p className="text-xs text-gray-500">
            Maximum 50 files per batch
          </p>
        </div>
      </div>
      
      {totalFiles > 0 && (
        <div className="mt-6 space-y-4">
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-900">
                Bulk Upload Progress
              </h4>
              <span className="text-sm text-gray-500">
                {completedFiles} of {totalFiles} completed
              </span>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
            
            <div className="mt-2 flex justify-between text-xs text-gray-500">
              <span>Completed: {completedFiles}</span>
              <span>Failed: {failedFiles}</span>
              <span>Remaining: {totalFiles - completedFiles - failedFiles}</span>
            </div>
          </div>
          
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {uploads.map(upload => (
              <div key={upload.fileId} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div className="flex-1">
                  <div className="text-sm font-medium">{upload.fileName}</div>
                  <div className="flex items-center space-x-2 mt-1">
                    <div className="flex-1 bg-gray-200 rounded-full h-1">
                      <div
                        className={`h-1 rounded-full ${
                          upload.status === "failed" ? "bg-red-500" : "bg-blue-500"
                        }`}
                        style={{ width: `${upload.progress}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500">
                      {upload.progress.toFixed(1)}%
                    </span>
                  </div>
                  {upload.error && (
                    <div className="text-xs text-red-600 mt-1">{upload.error}</div>
                  )}
                </div>
                <div className="ml-4">
                  <span className={`text-xs px-2 py-1 rounded ${
                    upload.status === "completed" ? "bg-green-100 text-green-800" :
                    upload.status === "failed" ? "bg-red-100 text-red-800" :
                    "bg-blue-100 text-blue-800"
                  }`}>
                    {upload.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default BulkUpload;
```

---

## Advanced Scenarios

### 1. Upload with Preprocessing

```typescript
import { useState } from "react";
import { useFileUpload } from "@/hooks/use-file-upload";

function PreprocessUpload() {
  const { uploadFile } = useFileUpload();
  const [isProcessing, setIsProcessing] = useState(false);
  
  const preprocessImage = async (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();
      
      img.onload = () => {
        // Resize image to maximum 1920x1080
        const maxWidth = 1920;
        const maxHeight = 1080;
        let { width, height } = img;
        
        if (width > maxWidth || height > maxHeight) {
          const aspectRatio = width / height;
          
          if (width > height) {
            width = maxWidth;
            height = width / aspectRatio;
          } else {
            height = maxHeight;
            width = height * aspectRatio;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const processedFile = new File([blob], file.name, {
              type: "image/jpeg",
              lastModified: Date.now()
            });
            resolve(processedFile);
          }
        }, "image/jpeg", 0.8);
      };
      
      img.src = URL.createObjectURL(file);
    });
  };
  
  const handleUpload = async (file: File) => {
    setIsProcessing(true);
    
    try {
      let processedFile = file;
      
      // Preprocess images
      if (file.type.startsWith("image/")) {
        processedFile = await preprocessImage(file);
      }
      
      uploadFile(processedFile, {
        url: "/api/upload",
        workspaceId: "workspace-123",
        onComplete: (fileId, response) => {
          console.log("Upload completed:", response);
        }
      });
    } catch (error) {
      console.error("Preprocessing failed:", error);
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <div>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
        disabled={isProcessing}
      />
      {isProcessing && <p>Processing image...</p>}
    </div>
  );
}
```

### 2. Upload with Metadata

```typescript
import { useState } from "react";
import { useFileUpload } from "@/hooks/use-file-upload";

interface FileMetadata {
  title: string;
  description: string;
  tags: string[];
  category: string;
}

function MetadataUpload() {
  const { uploadFile } = useFileUpload();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState<FileMetadata>({
    title: "",
    description: "",
    tags: [],
    category: ""
  });
  
  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setMetadata(prev => ({
      ...prev,
      title: file.name.split('.').slice(0, -1).join('.')
    }));
  };
  
  const handleUpload = () => {
    if (!selectedFile) return;
    
    uploadFile(selectedFile, {
      url: "/api/upload",
      workspaceId: "workspace-123",
      headers: {
        "X-File-Metadata": JSON.stringify(metadata)
      },
      onComplete: (fileId, response) => {
        console.log("Upload with metadata completed:", response);
        setSelectedFile(null);
        setMetadata({
          title: "",
          description: "",
          tags: [],
          category: ""
        });
      }
    });
  };
  
  return (
    <div className="metadata-upload">
      <div className="file-selection">
        <input
          type="file"
          onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
        />
      </div>
      
      {selectedFile && (
        <div className="metadata-form">
          <h3>File Metadata</h3>
          
          <div className="form-group">
            <label>Title:</label>
            <input
              type="text"
              value={metadata.title}
              onChange={(e) => setMetadata(prev => ({ ...prev, title: e.target.value }))}
            />
          </div>
          
          <div className="form-group">
            <label>Description:</label>
            <textarea
              value={metadata.description}
              onChange={(e) => setMetadata(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>
          
          <div className="form-group">
            <label>Tags (comma separated):</label>
            <input
              type="text"
              value={metadata.tags.join(", ")}
              onChange={(e) => setMetadata(prev => ({ 
                ...prev, 
                tags: e.target.value.split(",").map(tag => tag.trim()) 
              }))}
            />
          </div>
          
          <div className="form-group">
            <label>Category:</label>
            <select
              value={metadata.category}
              onChange={(e) => setMetadata(prev => ({ ...prev, category: e.target.value }))}
            >
              <option value="">Select category</option>
              <option value="document">Document</option>
              <option value="image">Image</option>
              <option value="video">Video</option>
              <option value="audio">Audio</option>
              <option value="archive">Archive</option>
            </select>
          </div>
          
          <button onClick={handleUpload}>Upload with Metadata</button>
        </div>
      )}
    </div>
  );
}
```

### 3. Upload with Validation

```typescript
import { useState } from "react";
import { useFileUpload } from "@/hooks/use-file-upload";

interface ValidationRule {
  name: string;
  validate: (file: File) => Promise<boolean>;
  message: string;
}

function ValidatedUpload() {
  const { uploadFile } = useFileUpload();
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  
  const validationRules: ValidationRule[] = [
    {
      name: "fileSize",
      validate: async (file) => file.size <= 10 * 1024 * 1024, // 10MB
      message: "File size must be less than 10MB"
    },
    {
      name: "fileType",
      validate: async (file) => {
        const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];
        return allowedTypes.includes(file.type);
      },
      message: "Only JPEG, PNG, and PDF files are allowed"
    },
    {
      name: "imageResolution",
      validate: async (file) => {
        if (!file.type.startsWith("image/")) return true;
        
        return new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            const isValidResolution = img.width <= 4000 && img.height <= 4000;
            resolve(isValidResolution);
          };
          img.onerror = () => resolve(false);
          img.src = URL.createObjectURL(file);
        });
      },
      message: "Image resolution must be 4000x4000 or smaller"
    },
    {
      name: "fileName",
      validate: async (file) => {
        const validNamePattern = /^[a-zA-Z0-9._-]+$/;
        return validNamePattern.test(file.name);
      },
      message: "File name contains invalid characters"
    }
  ];
  
  const validateFile = async (file: File): Promise<string[]> => {
    const errors: string[] = [];
    
    for (const rule of validationRules) {
      const isValid = await rule.validate(file);
      if (!isValid) {
        errors.push(rule.message);
      }
    }
    
    return errors;
  };
  
  const handleUpload = async (file: File) => {
    setValidationErrors([]);
    
    const errors = await validateFile(file);
    
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }
    
    uploadFile(file, {
      url: "/api/upload",
      workspaceId: "workspace-123",
      onComplete: (fileId, response) => {
        console.log("Validated upload completed:", response);
      }
    });
  };
  
  return (
    <div className="validated-upload">
      <div className="upload-area">
        <input
          type="file"
          onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
        />
      </div>
      
      {validationErrors.length > 0 && (
        <div className="validation-errors">
          <h4>Validation Errors:</h4>
          <ul>
            {validationErrors.map((error, index) => (
              <li key={index} className="error">{error}</li>
            ))}
          </ul>
        </div>
      )}
      
      <div className="validation-rules">
        <h4>File Requirements:</h4>
        <ul>
          <li>Maximum file size: 10MB</li>
          <li>Allowed types: JPEG, PNG, PDF</li>
          <li>Maximum image resolution: 4000x4000</li>
          <li>File name: alphanumeric characters, dots, hyphens, underscores only</li>
        </ul>
      </div>
    </div>
  );
}
```

---

## Error Handling

### 1. Comprehensive Error Handling

```typescript
import { useState } from "react";
import { useFileUpload } from "@/hooks/use-file-upload";
import { toast } from "react-hot-toast";

function ErrorHandlingExample() {
  const { uploadFile } = useFileUpload();
  const [errorLog, setErrorLog] = useState<Array<{
    timestamp: Date;
    fileName: string;
    error: string;
    errorType: string;
  }>>([]);
  
  const classifyError = (error: string): string => {
    if (error.includes("Unauthorized")) return "AUTH_ERROR";
    if (error.includes("too large")) return "SIZE_ERROR";
    if (error.includes("Rate limited")) return "RATE_LIMIT";
    if (error.includes("Network")) return "NETWORK_ERROR";
    if (error.includes("Server error")) return "SERVER_ERROR";
    return "UNKNOWN_ERROR";
  };
  
  const handleError = (fileName: string, error: string) => {
    const errorType = classifyError(error);
    
    setErrorLog(prev => [...prev, {
      timestamp: new Date(),
      fileName,
      error,
      errorType
    }]);
    
    // Handle different error types
    switch (errorType) {
      case "AUTH_ERROR":
        toast.error("Authentication failed. Please log in again.");
        // Redirect to login
        break;
      case "SIZE_ERROR":
        toast.error("File too large. Please select a smaller file.");
        break;
      case "RATE_LIMIT":
        toast.error("Upload rate limit exceeded. Please wait before trying again.");
        break;
      case "NETWORK_ERROR":
        toast.error("Network error. Upload will retry automatically.");
        break;
      case "SERVER_ERROR":
        toast.error("Server error. Please try again later.");
        break;
      default:
        toast.error(`Upload failed: ${error}`);
    }
  };
  
  const handleUpload = (file: File) => {
    uploadFile(file, {
      url: "/api/upload",
      workspaceId: "workspace-123",
      maxRetries: 5,
      retryDelay: 2000,
      onError: (fileId, error) => {
        handleError(file.name, error.message);
      },
      onComplete: (fileId, response) => {
        toast.success(`${file.name} uploaded successfully`);
      }
    });
  };
  
  return (
    <div className="error-handling-example">
      <div className="upload-area">
        <input
          type="file"
          onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
        />
      </div>
      
      {errorLog.length > 0 && (
        <div className="error-log">
          <h3>Error Log</h3>
          <div className="error-list">
            {errorLog.map((entry, index) => (
              <div key={index} className="error-entry">
                <div className="error-header">
                  <span className="timestamp">
                    {entry.timestamp.toLocaleTimeString()}
                  </span>
                  <span className="file-name">{entry.fileName}</span>
                  <span className={`error-type ${entry.errorType.toLowerCase()}`}>
                    {entry.errorType}
                  </span>
                </div>
                <div className="error-message">{entry.error}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

### 2. Retry Logic with Exponential Backoff

```typescript
import { useState } from "react";
import { useFileUpload } from "@/hooks/use-file-upload";

function RetryLogicExample() {
  const { uploadFile } = useFileUpload();
  const [retryStats, setRetryStats] = useState<Map<string, {
    attempts: number;
    lastAttempt: Date;
    nextRetry: Date;
  }>>(new Map());
  
  const calculateRetryDelay = (attemptNumber: number, errorType: string): number => {
    let baseDelay = 1000; // 1 second
    
    // Adjust base delay based on error type
    switch (errorType) {
      case "RATE_LIMIT":
        baseDelay = 10000; // 10 seconds for rate limits
        break;
      case "SERVER_ERROR":
        baseDelay = 5000; // 5 seconds for server errors
        break;
      case "NETWORK_ERROR":
        baseDelay = 2000; // 2 seconds for network errors
        break;
    }
    
    // Exponential backoff with jitter
    const exponentialDelay = baseDelay * Math.pow(2, attemptNumber - 1);
    const jitter = Math.random() * 0.3 * exponentialDelay;
    
    return Math.min(exponentialDelay + jitter, 60000); // Cap at 60 seconds
  };
  
  const handleUpload = (file: File) => {
    const fileId = `${file.name}-${Date.now()}`;
    
    uploadFile(file, {
      url: "/api/upload",
      workspaceId: "workspace-123",
      maxRetries: 10,
      retryDelay: 1000,
      onProgress: (progress) => {
        // Update retry stats
        setRetryStats(prev => {
          const newStats = new Map(prev);
          newStats.set(fileId, {
            attempts: progress.retryCount + 1,
            lastAttempt: new Date(),
            nextRetry: new Date(Date.now() + calculateRetryDelay(progress.retryCount + 1, "NETWORK_ERROR"))
          });
          return newStats;
        });
      },
      onComplete: (fileId, response) => {
        setRetryStats(prev => {
          const newStats = new Map(prev);
          newStats.delete(fileId);
          return newStats;
        });
      },
      onError: (fileId, error) => {
        console.error("Upload failed after retries:", error);
      }
    });
  };
  
  return (
    <div className="retry-logic-example">
      <input
        type="file"
        onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
      />
      
      {retryStats.size > 0 && (
        <div className="retry-stats">
          <h3>Retry Statistics</h3>
          {Array.from(retryStats.entries()).map(([fileId, stats]) => (
            <div key={fileId} className="retry-stat">
              <div>Attempts: {stats.attempts}</div>
              <div>Last Attempt: {stats.lastAttempt.toLocaleTimeString()}</div>
              <div>Next Retry: {stats.nextRetry.toLocaleTimeString()}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## Performance Optimization

### 1. Dynamic Chunk Size Optimization

```typescript
import { useState, useEffect } from "react";
import { useFileUpload } from "@/hooks/use-file-upload";

function OptimizedUpload() {
  const { uploadFile } = useFileUpload();
  const [networkStats, setNetworkStats] = useState({
    speed: 0,
    latency: 0,
    stability: 1
  });
  
  // Monitor network performance
  useEffect(() => {
    const measureNetworkSpeed = async () => {
      const startTime = performance.now();
      
      try {
        const response = await fetch("/api/health", { 
          method: "HEAD",
          cache: "no-cache" 
        });
        
        const endTime = performance.now();
        const latency = endTime - startTime;
        
        setNetworkStats(prev => ({
          ...prev,
          latency,
          stability: Math.min(prev.stability + 0.1, 1)
        }));
      } catch (error) {
        setNetworkStats(prev => ({
          ...prev,
          stability: Math.max(prev.stability - 0.2, 0.1)
        }));
      }
    };
    
    const interval = setInterval(measureNetworkSpeed, 5000);
    return () => clearInterval(interval);
  }, []);
  
  const getOptimalChunkSize = (fileSize: number): number => {
    const { latency, stability } = networkStats;
    
    // Base chunk size
    let chunkSize = 1024 * 1024; // 1MB
    
    // Adjust based on file size
    if (fileSize > 100 * 1024 * 1024) { // > 100MB
      chunkSize = 5 * 1024 * 1024; // 5MB chunks
    } else if (fileSize > 10 * 1024 * 1024) { // > 10MB
      chunkSize = 2 * 1024 * 1024; // 2MB chunks
    }
    
    // Adjust based on network conditions
    if (latency > 1000 || stability < 0.5) {
      // Poor network - use smaller chunks
      chunkSize = Math.max(chunkSize / 2, 256 * 1024); // Minimum 256KB
    } else if (latency < 100 && stability > 0.8) {
      // Good network - use larger chunks
      chunkSize = Math.min(chunkSize * 2, 10 * 1024 * 1024); // Maximum 10MB
    }
    
    return chunkSize;
  };
  
  const handleUpload = (file: File) => {
    const chunkSize = getOptimalChunkSize(file.size);
    
    uploadFile(file, {
      url: "/api/upload",
      workspaceId: "workspace-123",
      chunkSize,
      onProgress: (progress) => {
        // Monitor upload speed
        const elapsed = Date.now() - progress.startTime;
        const speed = progress.uploadedBytes / (elapsed / 1000);
        
        setNetworkStats(prev => ({
          ...prev,
          speed: speed
        }));
      }
    });
  };
  
  return (
    <div className="optimized-upload">
      <div className="network-stats">
        <h3>Network Stats</h3>
        <div>Speed: {(networkStats.speed / 1024 / 1024).toFixed(2)} MB/s</div>
        <div>Latency: {networkStats.latency.toFixed(0)} ms</div>
        <div>Stability: {(networkStats.stability * 100).toFixed(0)}%</div>
      </div>
      
      <input
        type="file"
        onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
      />
    </div>
  );
}
```

### 2. Memory Management for Large Files

```typescript
import { useState, useRef } from "react";
import { useFileUpload } from "@/hooks/use-file-upload";

function MemoryEfficientUpload() {
  const { uploadFile } = useFileUpload();
  const [memoryUsage, setMemoryUsage] = useState(0);
  const fileReaderRef = useRef<FileReader | null>(null);
  
  const monitorMemoryUsage = () => {
    if ('memory' in performance) {
      const memInfo = (performance as any).memory;
      setMemoryUsage(memInfo.usedJSHeapSize / 1024 / 1024); // MB
    }
  };
  
  const handleLargeFileUpload = (file: File) => {
    // Use smaller chunks for large files to reduce memory usage
    const chunkSize = file.size > 100 * 1024 * 1024 ? 
      512 * 1024 : // 512KB for files > 100MB
      1024 * 1024; // 1MB for smaller files
    
    uploadFile(file, {
      url: "/api/upload",
      workspaceId: "workspace-123",
      chunkSize,
      onProgress: (progress) => {
        monitorMemoryUsage();
        
        // Force garbage collection periodically
        if (progress.uploadedChunks.length % 10 === 0) {
          // Allow garbage collection
          setTimeout(() => {
            if (global.gc) {
              global.gc();
            }
          }, 100);
        }
      },
      onComplete: (fileId, response) => {
        // Final cleanup
        if (fileReaderRef.current) {
          fileReaderRef.current.abort();
          fileReaderRef.current = null;
        }
        
        monitorMemoryUsage();
        console.log("Upload completed, memory usage:", memoryUsage, "MB");
      }
    });
  };
  
  return (
    <div className="memory-efficient-upload">
      <div className="memory-stats">
        <h3>Memory Usage</h3>
        <div>{memoryUsage.toFixed(2)} MB</div>
        <div className="memory-bar">
          <div 
            className="memory-usage"
            style={{ width: `${Math.min(memoryUsage / 100 * 100, 100)}%` }}
          />
        </div>
      </div>
      
      <input
        type="file"
        onChange={(e) => e.target.files?.[0] && handleLargeFileUpload(e.target.files[0])}
      />
    </div>
  );
}
```

---

## Custom Implementations

### 1. Custom Upload Hook

```typescript
import { useState, useCallback, useRef } from "react";

interface CustomUploadOptions {
  url: string;
  chunkSize?: number;
  maxRetries?: number;
  headers?: Record<string, string>;
  onProgress?: (progress: number) => void;
  onComplete?: (response: any) => void;
  onError?: (error: Error) => void;
}

function useCustomUpload() {
  const [uploads, setUploads] = useState<Map<string, any>>(new Map());
  const abortControllers = useRef<Map<string, AbortController>>(new Map());
  
  const uploadFile = useCallback(async (file: File, options: CustomUploadOptions) => {
    const fileId = `${file.name}-${Date.now()}`;
    const chunkSize = options.chunkSize || 1024 * 1024;
    const totalChunks = Math.ceil(file.size / chunkSize);
    
    const controller = new AbortController();
    abortControllers.current.set(fileId, controller);
    
    setUploads(prev => new Map(prev).set(fileId, {
      fileId,
      fileName: file.name,
      progress: 0,
      status: "uploading"
    }));
    
    try {
      for (let i = 0; i < totalChunks; i++) {
        if (controller.signal.aborted) {
          throw new Error("Upload cancelled");
        }
        
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        const chunk = file.slice(start, end);
        
        const formData = new FormData();
        formData.append("chunk", chunk);
        formData.append("chunkIndex", i.toString());
        formData.append("totalChunks", totalChunks.toString());
        formData.append("fileId", fileId);
        
        const response = await fetch(`${options.url}?action=chunk`, {
          method: "POST",
          body: formData,
          headers: options.headers,
          signal: controller.signal
        });
        
        if (!response.ok) {
          throw new Error(`Chunk upload failed: ${response.statusText}`);
        }
        
        const progress = ((i + 1) / totalChunks) * 100;
        setUploads(prev => {
          const newMap = new Map(prev);
          const upload = newMap.get(fileId);
          if (upload) {
            upload.progress = progress;
          }
          return newMap;
        });
        
        options.onProgress?.(progress);
      }
      
      // Complete upload
      const completeResponse = await fetch(`${options.url}?action=complete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...options.headers
        },
        body: JSON.stringify({ uploadId: fileId })
      });
      
      if (!completeResponse.ok) {
        throw new Error(`Complete upload failed: ${completeResponse.statusText}`);
      }
      
      const result = await completeResponse.json();
      
      setUploads(prev => {
        const newMap = new Map(prev);
        const upload = newMap.get(fileId);
        if (upload) {
          upload.status = "completed";
          upload.progress = 100;
        }
        return newMap;
      });
      
      options.onComplete?.(result);
      
    } catch (error) {
      setUploads(prev => {
        const newMap = new Map(prev);
        const upload = newMap.get(fileId);
        if (upload) {
          upload.status = "failed";
          upload.error = error.message;
        }
        return newMap;
      });
      
      options.onError?.(error as Error);
    } finally {
      abortControllers.current.delete(fileId);
    }
  }, []);
  
  const cancelUpload = useCallback((fileId: string) => {
    const controller = abortControllers.current.get(fileId);
    if (controller) {
      controller.abort();
    }
  }, []);
  
  return {
    uploads: Array.from(uploads.values()),
    uploadFile,
    cancelUpload
  };
}
```

### 2. Custom Progress Component

```typescript
import React from "react";

interface UploadProgressProps {
  fileName: string;
  progress: number;
  status: "uploading" | "completed" | "failed" | "paused";
  uploadSpeed?: number;
  timeRemaining?: number;
  error?: string;
  onPause?: () => void;
  onResume?: () => void;
  onCancel?: () => void;
}

function CustomUploadProgress({
  fileName,
  progress,
  status,
  uploadSpeed,
  timeRemaining,
  error,
  onPause,
  onResume,
  onCancel
}: UploadProgressProps) {
  const formatSpeed = (bytesPerSecond: number) => {
    if (bytesPerSecond < 1024) return `${bytesPerSecond.toFixed(0)} B/s`;
    if (bytesPerSecond < 1024 * 1024) return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`;
    return `${(bytesPerSecond / 1024 / 1024).toFixed(1)} MB/s`;
  };
  
  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h`;
  };
  
  const getStatusColor = () => {
    switch (status) {
      case "completed": return "bg-green-500";
      case "failed": return "bg-red-500";
      case "paused": return "bg-yellow-500";
      default: return "bg-blue-500";
    }
  };
  
  return (
    <div className="custom-upload-progress">
      <div className="progress-header">
        <span className="file-name">{fileName}</span>
        <span className="progress-percentage">{progress.toFixed(1)}%</span>
      </div>
      
      <div className="progress-bar-container">
        <div className="progress-bar-track">
          <div 
            className={`progress-bar-fill ${getStatusColor()}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      
      <div className="progress-info">
        <div className="progress-stats">
          {uploadSpeed && (
            <span className="upload-speed">
              {formatSpeed(uploadSpeed)}
            </span>
          )}
          {timeRemaining && (
            <span className="time-remaining">
              {formatTime(timeRemaining)} remaining
            </span>
          )}
        </div>
        
        <div className="progress-actions">
          {status === "uploading" && onPause && (
            <button onClick={onPause} className="action-button">
              Pause
            </button>
          )}
          {status === "paused" && onResume && (
            <button onClick={onResume} className="action-button">
              Resume
            </button>
          )}
          {onCancel && (
            <button onClick={onCancel} className="action-button cancel">
              Cancel
            </button>
          )}
        </div>
      </div>
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
    </div>
  );
}
```

---

## Testing Strategies

### 1. Unit Testing Upload Hook

```typescript
import { renderHook, act } from "@testing-library/react";
import { useFileUpload } from "@/hooks/use-file-upload";

// Mock fetch
global.fetch = jest.fn();

describe("useFileUpload", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it("should upload file successfully", async () => {
    const mockFile = new File(["content"], "test.txt", { type: "text/plain" });
    
    // Mock successful chunk upload
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ uploadId: "test-id", chunkIndex: 0 })
    });
    
    // Mock successful complete upload
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: "file-id", name: "test.txt" })
    });
    
    const { result } = renderHook(() => useFileUpload());
    
    await act(async () => {
      result.current.uploadFile(mockFile, {
        url: "/api/upload",
        workspaceId: "workspace-123"
      });
    });
    
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(result.current.uploads).toHaveLength(1);
    expect(result.current.uploads[0].status).toBe("completed");
  });
  
  it("should handle upload errors", async () => {
    const mockFile = new File(["content"], "test.txt", { type: "text/plain" });
    
    // Mock failed chunk upload
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      statusText: "Server Error"
    });
    
    const { result } = renderHook(() => useFileUpload());
    
    await act(async () => {
      result.current.uploadFile(mockFile, {
        url: "/api/upload",
        workspaceId: "workspace-123"
      });
    });
    
    expect(result.current.uploads[0].status).toBe("failed");
    expect(result.current.uploads[0].error).toContain("Server Error");
  });
  
  it("should pause and resume uploads", async () => {
    const mockFile = new File(["content"], "test.txt", { type: "text/plain" });
    
    const { result } = renderHook(() => useFileUpload());
    
    await act(async () => {
      result.current.uploadFile(mockFile, {
        url: "/api/upload",
        workspaceId: "workspace-123"
      });
    });
    
    const fileId = result.current.uploads[0].fileId;
    
    act(() => {
      result.current.pauseUpload(fileId);
    });
    
    expect(result.current.uploads[0].status).toBe("paused");
    
    act(() => {
      result.current.resumeUpload(fileId, {
        url: "/api/upload",
        workspaceId: "workspace-123"
      });
    });
    
    expect(result.current.uploads[0].status).toBe("uploading");
  });
});
```

### 2. Integration Testing

```typescript
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { FileUpload } from "@/components/ui/file-upload";

// Mock the upload hook
jest.mock("@/hooks/use-file-upload", () => ({
  useFileUpload: () => ({
    uploads: [],
    uploadFile: jest.fn(),
    pauseUpload: jest.fn(),
    resumeUpload: jest.fn(),
    cancelUpload: jest.fn()
  })
}));

describe("FileUpload Component", () => {
  const defaultProps = {
    uploadUrl: "/api/upload",
    onUploadComplete: jest.fn()
  };
  
  it("should render file upload area", () => {
    render(<FileUpload {...defaultProps} />);
    
    expect(screen.getByText(/drag & drop files/i)).toBeInTheDocument();
    expect(screen.getByText(/click to select/i)).toBeInTheDocument();
  });
  
  it("should handle file selection", async () => {
    const mockUploadFile = jest.fn();
    const { useFileUpload } = require("@/hooks/use-file-upload");
    useFileUpload.mockReturnValue({
      uploads: [],
      uploadFile: mockUploadFile,
      pauseUpload: jest.fn(),
      resumeUpload: jest.fn(),
      cancelUpload: jest.fn()
    });
    
    render(<FileUpload {...defaultProps} />);
    
    const fileInput = screen.getByRole("button", { hidden: true });
    const file = new File(["content"], "test.txt", { type: "text/plain" });
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    await waitFor(() => {
      expect(mockUploadFile).toHaveBeenCalledWith(file, expect.objectContaining({
        url: "/api/upload"
      }));
    });
  });
  
  it("should display upload progress", () => {
    const mockUploads = [{
      fileId: "test-id",
      fileName: "test.txt",
      progress: 50,
      status: "uploading",
      uploadedBytes: 500,
      fileSize: 1000
    }];
    
    const { useFileUpload } = require("@/hooks/use-file-upload");
    useFileUpload.mockReturnValue({
      uploads: mockUploads,
      uploadFile: jest.fn(),
      pauseUpload: jest.fn(),
      resumeUpload: jest.fn(),
      cancelUpload: jest.fn()
    });
    
    render(<FileUpload {...defaultProps} />);
    
    expect(screen.getByText("test.txt")).toBeInTheDocument();
    expect(screen.getByText("50.0%")).toBeInTheDocument();
  });
});
```

### 3. Performance Testing

```typescript
import { performance } from "perf_hooks";

describe("Upload Performance", () => {
  it("should handle large files efficiently", async () => {
    const largeFile = new File(
      [new ArrayBuffer(50 * 1024 * 1024)], // 50MB
      "large-file.bin",
      { type: "application/octet-stream" }
    );
    
    const startTime = performance.now();
    
    // Mock upload process
    const uploadPromise = new Promise((resolve) => {
      setTimeout(() => {
        resolve({ id: "file-id", name: "large-file.bin" });
      }, 1000); // Simulate 1 second upload
    });
    
    const result = await uploadPromise;
    const endTime = performance.now();
    
    expect(endTime - startTime).toBeLessThan(2000); // Should complete in under 2 seconds
    expect(result).toBeDefined();
  });
  
  it("should handle multiple concurrent uploads", async () => {
    const files = Array.from({ length: 10 }, (_, i) => 
      new File([`content ${i}`], `file-${i}.txt`, { type: "text/plain" })
    );
    
    const startTime = performance.now();
    
    const uploadPromises = files.map(file => 
      new Promise((resolve) => {
        setTimeout(() => {
          resolve({ id: `file-${file.name}`, name: file.name });
        }, Math.random() * 1000);
      })
    );
    
    const results = await Promise.all(uploadPromises);
    const endTime = performance.now();
    
    expect(results).toHaveLength(10);
    expect(endTime - startTime).toBeLessThan(1500); // Should complete concurrently
  });
});
```

---

## Best Practices

### 1. Error Boundaries

```typescript
import React from "react";

interface UploadErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class UploadErrorBoundary extends React.Component<
  React.PropsWithChildren<{}>,
  UploadErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props);
    this.state = { hasError: false };
  }
  
  static getDerivedStateFromError(error: Error): UploadErrorBoundaryState {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Upload error boundary caught error:", error, errorInfo);
    
    // Log error to monitoring service
    if (typeof window !== "undefined") {
      // Send error to monitoring service
      fetch("/api/errors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack
        })
      }).catch(console.error);
    }
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="upload-error-boundary">
          <h2>Upload Error</h2>
          <p>Something went wrong with the file upload component.</p>
          <details>
            <summary>Error Details</summary>
            <pre>{this.state.error?.message}</pre>
          </details>
          <button onClick={() => window.location.reload()}>
            Reload Page
          </button>
        </div>
      );
    }
    
    return this.props.children;
  }
}

// Usage
function App() {
  return (
    <UploadErrorBoundary>
      <FileUpload uploadUrl="/api/upload" />
    </UploadErrorBoundary>
  );
}
```

### 2. Performance Monitoring

```typescript
import { useEffect } from "react";

function useUploadPerformanceMonitoring() {
  const [metrics, setMetrics] = useState<{
    uploadSpeed: number;
    errorRate: number;
    completionRate: number;
    avgUploadTime: number;
  }>({
    uploadSpeed: 0,
    errorRate: 0,
    completionRate: 0,
    avgUploadTime: 0
  });
  
  useEffect(() => {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      
      entries.forEach((entry) => {
        if (entry.name.startsWith("upload-")) {
          // Track upload performance
          const uploadTime = entry.duration;
          const uploadSize = parseFloat(entry.name.split("-")[1]);
          const uploadSpeed = uploadSize / (uploadTime / 1000);
          
          setMetrics(prev => ({
            ...prev,
            uploadSpeed,
            avgUploadTime: (prev.avgUploadTime + uploadTime) / 2
          }));
        }
      });
    });
    
    observer.observe({ entryTypes: ["measure"] });
    
    return () => observer.disconnect();
  }, []);
  
  return metrics;
}
```

### 3. Accessibility

```typescript
import React from "react";

interface AccessibleFileUploadProps {
  uploadUrl: string;
  onUploadComplete?: (files: any[]) => void;
  ariaLabel?: string;
  ariaDescription?: string;
}

function AccessibleFileUpload({ 
  uploadUrl, 
  onUploadComplete, 
  ariaLabel = "File upload",
  ariaDescription = "Select files to upload"
}: AccessibleFileUploadProps) {
  const { uploads, uploadFile } = useFileUpload();
  const [announcement, setAnnouncement] = useState("");
  
  const handleUpload = (files: FileList) => {
    const fileCount = files.length;
    setAnnouncement(`Starting upload of ${fileCount} file${fileCount > 1 ? 's' : ''}`);
    
    Array.from(files).forEach(file => {
      uploadFile(file, {
        url: uploadUrl,
        onProgress: (progress) => {
          if (progress.progress % 25 === 0) {
            setAnnouncement(`${file.name} is ${progress.progress}% complete`);
          }
        },
        onComplete: (fileId, response) => {
          setAnnouncement(`${response.name} upload completed successfully`);
          onUploadComplete?.([response]);
        },
        onError: (fileId, error) => {
          setAnnouncement(`Upload failed for ${file.name}: ${error.message}`);
        }
      });
    });
  };
  
  return (
    <div className="accessible-file-upload">
      <div
        role="button"
        tabIndex={0}
        aria-label={ariaLabel}
        aria-describedby="upload-description"
        className="upload-zone"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            document.getElementById("file-input")?.click();
          }
        }}
      >
        <input
          id="file-input"
          type="file"
          multiple
          onChange={(e) => e.target.files && handleUpload(e.target.files)}
          className="sr-only"
          aria-describedby="upload-description"
        />
        <div id="upload-description" className="upload-description">
          {ariaDescription}
        </div>
      </div>
      
      {/* Screen reader announcements */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>
      
      {/* Upload progress for screen readers */}
      <div role="region" aria-label="Upload progress" className="upload-progress">
        {uploads.map(upload => (
          <div
            key={upload.fileId}
            role="progressbar"
            aria-valuenow={upload.progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${upload.fileName} upload progress`}
          >
            <span className="sr-only">
              {upload.fileName} is {upload.progress.toFixed(1)}% complete
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

This comprehensive client-side integration guide provides developers with everything they need to implement the AbacusHub file upload system in their React applications. The examples cover basic usage, advanced scenarios, error handling, performance optimization, and accessibility considerations.

The guide includes practical, copy-paste ready code examples that developers can immediately use and customize for their specific needs. Each pattern is designed to be production-ready and follows React best practices.