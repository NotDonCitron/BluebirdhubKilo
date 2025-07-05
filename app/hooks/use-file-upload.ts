"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import { toast } from "react-hot-toast";

interface UploadProgress {
  fileId: string;
  fileName: string;
  fileSize: number;
  uploadedBytes: number;
  progress: number;
  status: "pending" | "uploading" | "paused" | "failed" | "completed";
  error?: string;
  retryCount: number;
  chunkSize: number;
  totalChunks: number;
  uploadedChunks: number[];
  startTime: number;
  pausedAt?: number;
  workspaceId?: string;
  fileType?: string;
  lastModified?: number;
}

interface UploadOptions {
  url: string;
  headers?: HeadersInit;
  chunkSize?: number;
  maxRetries?: number;
  retryDelay?: number;
  onProgress?: (progress: UploadProgress) => void;
  onComplete?: (fileId: string, response: any) => void;
  onError?: (fileId: string, error: Error) => void;
  workspaceId?: string;
}

interface StoredFile {
  name: string;
  size: number;
  type: string;
  lastModified: number;
}

const DEFAULT_CHUNK_SIZE = 1024 * 1024; // 1MB chunks
const DEFAULT_MAX_RETRIES = 5;
const DEFAULT_RETRY_DELAY = 1000; // 1 second base delay
const LOCALSTORAGE_KEY = "abacushub_upload_progress";
const NETWORK_CHECK_INTERVAL = 5000; // 5 seconds

export function useFileUpload() {
  const [uploads, setUploads] = useState<Map<string, UploadProgress>>(new Map());
  const [isOnline, setIsOnline] = useState(true);
  const abortControllers = useRef<Map<string, AbortController>>(new Map());
  const uploadQueues = useRef<Map<string, File>>(new Map());
  const storedFiles = useRef<Map<string, StoredFile>>(new Map());
  const networkCheckInterval = useRef<NodeJS.Timeout>();
  const autoResumeOptions = useRef<Map<string, UploadOptions>>(new Map());

  // Load upload progress from localStorage on mount
  useEffect(() => {
    const loadStoredProgress = () => {
      try {
        const stored = localStorage.getItem(LOCALSTORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          const restoredUploads = new Map<string, UploadProgress>();
          const restoredFiles = new Map<string, StoredFile>();
          
          Object.entries(parsed).forEach(([fileId, data]: [string, any]) => {
            if (data.progress && data.progress.status !== "completed") {
              restoredUploads.set(fileId, data.progress);
              if (data.file) {
                restoredFiles.set(fileId, data.file);
              }
              if (data.options) {
                autoResumeOptions.current.set(fileId, data.options);
              }
            }
          });
          
          if (restoredUploads.size > 0) {
            setUploads(restoredUploads);
            storedFiles.current = restoredFiles;
            toast.success(`Found ${restoredUploads.size} incomplete upload(s)`);
          }
        }
      } catch (error) {
        console.error("Failed to load stored upload progress:", error);
      }
    };

    loadStoredProgress();
  }, []);

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success("Connection restored");
      
      // Auto-resume paused uploads when coming back online
      uploads.forEach((upload, fileId) => {
        if (upload.status === "paused" && upload.pausedAt) {
          const options = autoResumeOptions.current.get(fileId);
          if (options) {
            const file = uploadQueues.current.get(fileId);
            if (file) {
              resumeUpload(fileId, options);
            }
          }
        }
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.error("Connection lost - uploads paused");
      
      // Pause all active uploads when going offline
      uploads.forEach((upload, fileId) => {
        if (upload.status === "uploading") {
          pauseUpload(fileId);
        }
      });
    };

    // Monitor online/offline events
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Periodic network check (for cases where events don't fire)
    networkCheckInterval.current = setInterval(() => {
      const wasOnline = isOnline;
      const nowOnline = navigator.onLine;
      
      if (wasOnline !== nowOnline) {
        setIsOnline(nowOnline);
        if (nowOnline) {
          handleOnline();
        } else {
          handleOffline();
        }
      }
    }, NETWORK_CHECK_INTERVAL);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (networkCheckInterval.current) {
        clearInterval(networkCheckInterval.current);
      }
    };
  }, [uploads, isOnline]);

  // Persist upload progress to localStorage
  const persistProgress = useCallback(() => {
    try {
      const toStore: Record<string, any> = {};
      
      uploads.forEach((upload, fileId) => {
        if (upload.status !== "completed") {
          const file = uploadQueues.current.get(fileId);
          const options = autoResumeOptions.current.get(fileId);
          
          toStore[fileId] = {
            progress: upload,
            file: file ? {
              name: file.name,
              size: file.size,
              type: file.type,
              lastModified: file.lastModified,
            } : storedFiles.current.get(fileId),
            options: options,
          };
        }
      });
      
      if (Object.keys(toStore).length > 0) {
        localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(toStore));
      } else {
        localStorage.removeItem(LOCALSTORAGE_KEY);
      }
    } catch (error) {
      console.error("Failed to persist upload progress:", error);
    }
  }, [uploads]);

  // Update upload and persist to localStorage
  const updateUpload = useCallback((fileId: string, updates: Partial<UploadProgress>) => {
    setUploads((prev) => {
      const newMap = new Map(prev);
      const current = newMap.get(fileId);
      if (current) {
        newMap.set(fileId, { ...current, ...updates });
      }
      return newMap;
    });
    
    // Persist after update
    setTimeout(persistProgress, 100);
  }, [persistProgress]);

  // Calculate exponential backoff delay with error-specific handling
  const getRetryDelay = useCallback((retryCount: number, baseDelay: number, errorType?: string) => {
    // Exponential backoff with jitter
    let exponentialDelay = baseDelay * Math.pow(2, retryCount);
    
    // Adjust delay based on error type
    if (errorType?.includes("Rate limited")) {
      exponentialDelay = Math.max(exponentialDelay, 10000); // Min 10s for rate limiting
    } else if (errorType?.includes("Server error")) {
      exponentialDelay = Math.max(exponentialDelay, 5000); // Min 5s for server errors
    } else if (errorType?.includes("Authentication failed")) {
      exponentialDelay = Math.max(exponentialDelay, 2000); // Min 2s for auth errors
    }
    
    const jitter = Math.random() * 0.3 * exponentialDelay; // 30% jitter
    return Math.min(exponentialDelay + jitter, 60000); // Cap at 60 seconds
  }, []);

  const generateFileId = useCallback((file: File): string => {
    return `${file.name}-${file.size}-${file.lastModified}`;
  }, []);

  // Verify upload status with server
  const verifyUploadStatus = useCallback(async (fileId: string, options: UploadOptions) => {
    try {
      const response = await fetch(`${options.url}?action=status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
        body: JSON.stringify({ uploadId: fileId }),
      });

      if (response.ok) {
        const status = await response.json();
        return {
          exists: true,
          uploadId: status.uploadId,
          filename: status.filename,
          totalChunks: status.totalChunks,
          receivedChunks: status.receivedChunks,
          missingChunks: status.missingChunks,
          lastActivity: status.lastActivity,
        };
      }
      
      return { exists: false };
    } catch (error) {
      console.error("Failed to verify upload status:", error);
      return { exists: false };
    }
  }, []);

  const uploadChunk = useCallback(
    async (
      file: File,
      chunkIndex: number,
      uploadProgress: UploadProgress,
      options: UploadOptions,
      signal: AbortSignal
    ): Promise<void> => {
      const start = chunkIndex * uploadProgress.chunkSize;
      const end = Math.min(start + uploadProgress.chunkSize, file.size);
      const chunk = file.slice(start, end);

      const formData = new FormData();
      formData.append("action", "chunk");
      formData.append("chunk", chunk);
      formData.append("fileName", file.name);
      formData.append("fileId", uploadProgress.fileId);
      formData.append("chunkIndex", chunkIndex.toString());
      formData.append("totalChunks", uploadProgress.totalChunks.toString());
      formData.append("fileSize", file.size.toString());
      if (options.workspaceId) {
        formData.append("workspaceId", options.workspaceId);
      }

      const response = await fetch(options.url, {
        method: "POST",
        headers: options.headers,
        body: formData,
        signal,
      });

      if (!response.ok) {
        // Enhanced error handling with more specific error types
        if (response.status === 413) {
          throw new Error(`Chunk too large: ${response.statusText}`);
        } else if (response.status === 429) {
          throw new Error(`Rate limited: ${response.statusText}`);
        } else if (response.status >= 500) {
          throw new Error(`Server error: ${response.statusText}`);
        } else if (response.status === 401) {
          throw new Error(`Authentication failed: ${response.statusText}`);
        } else if (response.status === 403) {
          throw new Error(`Access denied: ${response.statusText}`);
        } else {
          throw new Error(`Upload failed: ${response.statusText}`);
        }
      }

      return response.json();
    },
    []
  );

  const uploadFile = useCallback(
    async (file: File, options: UploadOptions) => {
      // Check network status before starting
      if (!navigator.onLine) {
        toast.error("No internet connection. Upload will start when connection is restored.");
        return;
      }

      const fileId = generateFileId(file);
      const chunkSize = options.chunkSize || DEFAULT_CHUNK_SIZE;
      const totalChunks = Math.ceil(file.size / chunkSize);
      
      // Store options for auto-resume
      autoResumeOptions.current.set(fileId, options);
      
      // Check if upload already exists (resume case)
      const existingUpload = uploads.get(fileId);
      const uploadedChunks = existingUpload?.uploadedChunks || [];
      
      const uploadProgress: UploadProgress = {
        fileId,
        fileName: file.name,
        fileSize: file.size,
        uploadedBytes: uploadedChunks.length * chunkSize,
        progress: (uploadedChunks.length / totalChunks) * 100,
        status: "uploading",
        retryCount: existingUpload?.retryCount || 0,
        chunkSize,
        totalChunks,
        uploadedChunks,
        startTime: existingUpload?.startTime || Date.now(),
        workspaceId: options.workspaceId,
        fileType: file.type,
        lastModified: file.lastModified,
      };

      updateUpload(fileId, uploadProgress);
      uploadQueues.current.set(fileId, file);

      const controller = new AbortController();
      abortControllers.current.set(fileId, controller);

      try {
        // Upload chunks that haven't been uploaded yet
        for (let i = 0; i < totalChunks; i++) {
          if (uploadedChunks.includes(i)) {
            continue; // Skip already uploaded chunks
          }

          if (controller.signal.aborted) {
            throw new Error("Upload cancelled");
          }

          let retries = 0;
          while (retries <= (options.maxRetries || DEFAULT_MAX_RETRIES)) {
            try {
              await uploadChunk(file, i, uploadProgress, options, controller.signal);
              
              // Update progress
              uploadedChunks.push(i);
              const newUploadedBytes = Math.min(
                uploadedChunks.length * chunkSize,
                file.size
              );
              const newProgress = (uploadedChunks.length / totalChunks) * 100;
              
              updateUpload(fileId, {
                uploadedChunks: [...uploadedChunks],
                uploadedBytes: newUploadedBytes,
                progress: newProgress,
              });
              
              options.onProgress?.({
                ...uploadProgress,
                uploadedChunks: [...uploadedChunks],
                uploadedBytes: newUploadedBytes,
                progress: newProgress,
              });
              
              break; // Success, move to next chunk
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : "Upload failed";
              retries++;
              
              // Check if error is retryable
              const isRetryable = !errorMessage.includes("Authentication failed") && 
                                !errorMessage.includes("Access denied") && 
                                !errorMessage.includes("Chunk too large");
              
              if (retries > (options.maxRetries || DEFAULT_MAX_RETRIES) || !isRetryable) {
                if (!isRetryable) {
                  console.log(`Non-retryable error for chunk ${i}: ${errorMessage}`);
                }
                throw error;
              }
              
              // Wait before retrying with error-specific exponential backoff
              const delay = getRetryDelay(retries - 1, options.retryDelay || DEFAULT_RETRY_DELAY, errorMessage);
              console.log(`Retrying chunk ${i} after ${Math.round(delay)}ms (attempt ${retries}/${options.maxRetries || DEFAULT_MAX_RETRIES})`);
              await new Promise((resolve) => setTimeout(resolve, delay));
              
              updateUpload(fileId, { retryCount: uploadProgress.retryCount + 1 });
            }
          }
        }

        // Call the complete action to finalize the upload
        const completeFormData = new FormData();
        completeFormData.append("action", "complete");
        completeFormData.append("fileId", fileId);
        completeFormData.append("fileName", file.name);
        completeFormData.append("fileSize", file.size.toString());
        completeFormData.append("mimeType", file.type || "application/octet-stream");
        completeFormData.append("totalChunks", totalChunks.toString());
        if (options.workspaceId) {
          completeFormData.append("workspaceId", options.workspaceId);
        }
        
        const completeResponse = await fetch(options.url, {
          method: "POST",
          headers: options.headers,
          body: completeFormData,
        });

        if (!completeResponse.ok) {
          throw new Error(`Failed to complete upload: ${completeResponse.statusText}`);
        }

        const completeResult = await completeResponse.json();
        
        // Upload completed successfully
        updateUpload(fileId, { status: "completed", progress: 100 });
        toast.success(`File ${file.name} uploaded successfully`);
        
        // Pass the complete file data from the API response
        options.onComplete?.(fileId, completeResult.file || completeResult);
        
        // Clean up
        abortControllers.current.delete(fileId);
        uploadQueues.current.delete(fileId);
        autoResumeOptions.current.delete(fileId);
        storedFiles.current.delete(fileId);
        persistProgress();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Upload failed";
        
        if (errorMessage === "Upload cancelled") {
          updateUpload(fileId, { status: "paused", pausedAt: Date.now() });
          toast("Upload paused");
        } else {
          updateUpload(fileId, { status: "failed", error: errorMessage });
          toast.error(`Upload failed: ${errorMessage}`);
          options.onError?.(fileId, error as Error);
        }
      }
    },
    [generateFileId, updateUpload, uploadChunk, uploads, getRetryDelay, persistProgress]
  );

  const pauseUpload = useCallback((fileId: string) => {
    const controller = abortControllers.current.get(fileId);
    if (controller) {
      controller.abort();
    }
  }, []);

  const resumeUpload = useCallback(
    async (fileId: string, options: UploadOptions) => {
      // Check if we have the file in memory
      let file = uploadQueues.current.get(fileId);
      
      // If not in memory, try to restore from stored file info
      if (!file) {
        const storedFile = storedFiles.current.get(fileId);
        if (storedFile) {
          // Show file picker to re-select the file
          const input = document.createElement("input");
          input.type = "file";
          input.accept = storedFile.type || "*/*";
          
          const fileSelected = new Promise<File | null>((resolve) => {
            input.onchange = (e) => {
              const target = e.target as HTMLInputElement;
              const selectedFile = target.files?.[0];
              
              if (selectedFile &&
                  selectedFile.name === storedFile.name &&
                  selectedFile.size === storedFile.size &&
                  selectedFile.lastModified === storedFile.lastModified) {
                resolve(selectedFile);
              } else {
                toast.error("Please select the same file to resume upload");
                resolve(null);
              }
            };
            
            input.oncancel = () => resolve(null);
          });
          
          input.click();
          file = (await fileSelected) || undefined;
          
          if (!file) {
            return;
          }
          
          // Store the file for future use
          uploadQueues.current.set(fileId, file);
        } else {
          toast.error("Cannot resume upload: file not found");
          return;
        }
      }

      const upload = uploads.get(fileId);
      if (!upload || upload.status !== "paused") {
        return;
      }

      // Verify upload status with server before resuming
      const serverStatus = await verifyUploadStatus(fileId, options);
      if (serverStatus.exists) {
        // Update local state with server status
        const missingChunks = serverStatus.missingChunks || [];
        const receivedChunks = Array.from({ length: serverStatus.totalChunks }, (_, i) => i)
          .filter(i => !missingChunks.includes(i));
        
        updateUpload(fileId, {
          uploadedChunks: receivedChunks,
          uploadedBytes: receivedChunks.length * upload.chunkSize,
          progress: (receivedChunks.length / serverStatus.totalChunks) * 100,
        });
        
        toast.success(`Resuming upload with ${receivedChunks.length}/${serverStatus.totalChunks} chunks already uploaded`);
      } else {
        toast("Server has no record of this upload, starting fresh");
        updateUpload(fileId, {
          uploadedChunks: [],
          uploadedBytes: 0,
          progress: 0,
        });
      }

      // Store options for future auto-resume
      autoResumeOptions.current.set(fileId, options);
      
      uploadFile(file, options);
    },
    [uploads, uploadFile, verifyUploadStatus, updateUpload]
  );

  const cancelUpload = useCallback((fileId: string) => {
    const controller = abortControllers.current.get(fileId);
    if (controller) {
      controller.abort();
    }

    setUploads((prev) => {
      const newMap = new Map(prev);
      newMap.delete(fileId);
      return newMap;
    });

    abortControllers.current.delete(fileId);
    uploadQueues.current.delete(fileId);
    autoResumeOptions.current.delete(fileId);
    storedFiles.current.delete(fileId);
    persistProgress();
    
    toast("Upload cancelled");
  }, [persistProgress]);

  const retryUpload = useCallback(
    (fileId: string, options: UploadOptions) => {
      const file = uploadQueues.current.get(fileId);
      if (!file) {
        toast.error("Cannot retry upload: file not found");
        return;
      }

      const upload = uploads.get(fileId);
      if (!upload || upload.status !== "failed") {
        return;
      }

      // Reset status and retry
      updateUpload(fileId, { status: "uploading", error: undefined });
      uploadFile(file, options);
    },
    [uploads, uploadFile, updateUpload]
  );

  const clearCompleted = useCallback(() => {
    setUploads((prev) => {
      const newMap = new Map(prev);
      for (const [fileId, upload] of newMap) {
        if (upload.status === "completed") {
          newMap.delete(fileId);
          uploadQueues.current.delete(fileId);
        }
      }
      return newMap;
    });
    
    persistProgress();
  }, [persistProgress]);

  // Auto-resume uploads on mount if they were interrupted
  useEffect(() => {
    const autoResume = async () => {
      // Wait a bit for the component to fully mount
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      uploads.forEach((upload, fileId) => {
        if (upload.status === "paused" || upload.status === "failed") {
          const options = autoResumeOptions.current.get(fileId);
          if (options && navigator.onLine) {
            // Try to resume automatically
            resumeUpload(fileId, options);
          }
        }
      });
    };
    
    if (uploads.size > 0) {
      autoResume();
    }
  }, []);

  return {
    uploads: Array.from(uploads.values()),
    uploadFile,
    pauseUpload,
    resumeUpload,
    cancelUpload,
    retryUpload,
    clearCompleted,
    isOnline,
  };
}