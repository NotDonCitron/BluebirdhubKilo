"use client";

import { useMemo, useCallback } from "react";
import { useFileUpload } from "./use-file-upload";

interface EnhancedUploadProgress {
  // Bestehende Eigenschaften aus UploadProgress
  fileId: string;
  fileName: string;
  fileSize: number;
  uploadedBytes: number;
  progress: number;
  status: "pending" | "uploading" | "paused" | "failed" | "completed" | "error";
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
  
  // Zusätzliche Eigenschaften für Test-UI
  id: string;                    // Alias für fileId
  file?: File;                   // Original File-Objekt
  speed?: number;                // Upload-Geschwindigkeit (bytes/s)
  timeRemaining?: number;        // Verbleibende Zeit (sekunden)
  currentChunk: number;          // Aktueller Chunk-Index
  maxRetries: number;            // Maximale Wiederholungen
  response?: any;                // Server-Antwort
  uploadSession?: string;        // Upload-Session-ID
  averageSpeed?: number;         // Durchschnittliche Geschwindigkeit
  estimatedCompletion?: Date;    // Geschätzte Fertigstellung
}

interface EnhancedUploadOptions {
  url?: string;
  headers?: HeadersInit;
  chunkSize?: number;
  maxRetries?: number;
  retryDelay?: number;
  onProgress?: (progress: EnhancedUploadProgress) => void;
  onComplete?: (fileId: string, response: any) => void;
  onError?: (fileId: string, error: Error) => void;
  workspaceId?: string;
}

const DEFAULT_UPLOAD_CONFIG = {
  url: '/api/upload',
  chunkSize: 1024 * 1024, // 1MB
  maxRetries: 3,
  retryDelay: 1000,
  headers: {
    'Content-Type': 'multipart/form-data',
  },
};

// Performance-Berechnungen
const calculateSpeed = (upload: any): number => {
  if (!upload.startTime || upload.uploadedBytes === 0) return 0;
  
  const elapsedTime = (Date.now() - upload.startTime) / 1000; // in Sekunden
  if (elapsedTime === 0) return 0;
  
  return upload.uploadedBytes / elapsedTime; // bytes/s
};

const calculateTimeRemaining = (upload: any, speed: number): number => {
  if (speed === 0 || upload.uploadedBytes >= upload.fileSize) return 0;
  
  const remainingBytes = upload.fileSize - upload.uploadedBytes;
  return remainingBytes / speed; // Sekunden
};

const calculateAverageSpeed = (upload: any): number => {
  // Einfache gleitende Durchschnittsberechnung über die letzten 10 Chunks
  if (!upload.speedHistory || upload.speedHistory.length === 0) return 0;
  
  const recentSpeeds = upload.speedHistory.slice(-10);
  return recentSpeeds.reduce((sum: number, speed: number) => sum + speed, 0) / recentSpeeds.length;
};

const generateUploadSession = (): string => {
  return `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export function useEnhancedFileUpload() {
  const baseHook = useFileUpload();
  
  // Erweiterte Upload-Daten mit Performance-Metriken
  const enhancedUploads = useMemo(() => {
    return Array.from(baseHook.uploads.values()).map((upload): EnhancedUploadProgress => {
      const speed = calculateSpeed(upload);
      const timeRemaining = calculateTimeRemaining(upload, speed);
      const averageSpeed = calculateAverageSpeed(upload);
      
      // Get the file from uploadQueues using the baseHook's internal reference
      // We need to access the file from the base hook's uploadQueues
      const file = (baseHook as any).uploadQueues?.current?.get?.(upload.fileId);
      
      return {
        ...upload,
        id: upload.fileId,
        file: file || {
          name: upload.fileName,
          size: upload.fileSize,
          type: upload.fileType || 'application/octet-stream',
          lastModified: upload.lastModified || Date.now()
        } as File,
        currentChunk: upload.uploadedChunks.length,
        maxRetries: 3, // Standard-Wert
        speed,
        timeRemaining,
        averageSpeed,
        uploadSession: generateUploadSession(),
        estimatedCompletion: timeRemaining > 0 ? new Date(Date.now() + timeRemaining * 1000) : undefined,
        status: upload.status === "failed" ? "error" : upload.status as any,
      };
    });
  }, [baseHook.uploads, baseHook]);
  
  // Map-basierte Uploads für einfachere Zugriffe
  const uploadsMap = useMemo(() => {
    return new Map(enhancedUploads.map(upload => [upload.id, upload]));
  }, [enhancedUploads]);
  
  // Erweiterte uploadFile-Funktion mit Standard-Konfiguration
  const uploadFile = useCallback((file: File, options: EnhancedUploadOptions = {}) => {
    const { onProgress, onComplete, onError, ...restOptions } = options;
    const mergedOptions = {
      ...DEFAULT_UPLOAD_CONFIG,
      ...restOptions,
      // Convert callbacks to base types
      onProgress: onProgress ? (progress: any) => onProgress(progress) : undefined,
      onComplete,
      onError
    };
    return baseHook.uploadFile(file, mergedOptions);
  }, [baseHook.uploadFile]);
  
  // Erweiterte resumeUpload-Funktion
  const resumeUpload = useCallback((fileId: string, options: EnhancedUploadOptions = {}) => {
    const { onProgress, onComplete, onError, ...restOptions } = options;
    const mergedOptions = {
      ...DEFAULT_UPLOAD_CONFIG,
      ...restOptions,
      // Convert callbacks to base types
      onProgress: onProgress ? (progress: any) => onProgress(progress) : undefined,
      onComplete,
      onError
    };
    return baseHook.resumeUpload(fileId, mergedOptions);
  }, [baseHook.resumeUpload]);
  
  // Erweiterte retryUpload-Funktion
  const retryUpload = useCallback((fileId: string, options: EnhancedUploadOptions = {}) => {
    const { onProgress, onComplete, onError, ...restOptions } = options;
    const mergedOptions = {
      ...DEFAULT_UPLOAD_CONFIG,
      ...restOptions,
      // Convert callbacks to base types
      onProgress: onProgress ? (progress: any) => onProgress(progress) : undefined,
      onComplete,
      onError
    };
    return baseHook.retryUpload(fileId, mergedOptions);
  }, [baseHook.retryUpload]);
  
  // Utility-Funktionen
  const getUploadById = useCallback((id: string) => {
    return uploadsMap.get(id);
  }, [uploadsMap]);
  
  const getUploadsByStatus = useCallback((status: EnhancedUploadProgress['status']) => {
    return enhancedUploads.filter(upload => upload.status === status);
  }, [enhancedUploads]);
  
  const getTotalProgress = useCallback(() => {
    if (enhancedUploads.length === 0) return 0;
    
    const totalSize = enhancedUploads.reduce((sum, upload) => sum + upload.fileSize, 0);
    const totalUploaded = enhancedUploads.reduce((sum, upload) => sum + upload.uploadedBytes, 0);
    
    return totalSize > 0 ? (totalUploaded / totalSize) * 100 : 0;
  }, [enhancedUploads]);
  
  const getOverallStats = useCallback(() => {
    const total = enhancedUploads.length;
    const completed = getUploadsByStatus('completed').length;
    const failed = getUploadsByStatus('error').length + getUploadsByStatus('failed').length;
    const uploading = getUploadsByStatus('uploading').length;
    const paused = getUploadsByStatus('paused').length;
    
    const totalSize = enhancedUploads.reduce((sum, upload) => sum + upload.fileSize, 0);
    const totalUploaded = enhancedUploads.reduce((sum, upload) => sum + upload.uploadedBytes, 0);
    const averageSpeed = enhancedUploads
      .filter(upload => upload.speed && upload.speed > 0)
      .reduce((sum, upload) => sum + (upload.speed || 0), 0) / Math.max(1, enhancedUploads.length);
    
    return {
      total,
      completed,
      failed,
      uploading,
      paused,
      totalSize,
      totalUploaded,
      averageSpeed,
      successRate: total > 0 ? (completed / total) * 100 : 0,
    };
  }, [enhancedUploads, getUploadsByStatus]);
  
  return {
    // Erweiterte Datenstrukturen
    uploads: enhancedUploads,
    uploadsMap,
    
    // Original-Funktionen mit Erweiterungen
    uploadFile,
    pauseUpload: baseHook.pauseUpload,
    resumeUpload,
    cancelUpload: baseHook.cancelUpload,
    retryUpload,
    clearCompleted: baseHook.clearCompleted,
    
    // Netzwerk-Status
    isOnline: baseHook.isOnline,
    
    // Utility-Funktionen
    getUploadById,
    getUploadsByStatus,
    getTotalProgress,
    getOverallStats,
    
    // Konfiguration
    defaultConfig: DEFAULT_UPLOAD_CONFIG,
  };
}

export type { EnhancedUploadProgress, EnhancedUploadOptions };