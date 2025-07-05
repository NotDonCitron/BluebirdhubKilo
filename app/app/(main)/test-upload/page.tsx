"use client";

import { useState, useCallback } from "react";
import { useEnhancedFileUpload } from "@/hooks/use-enhanced-file-upload";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Upload, 
  Pause, 
  Play, 
  X, 
  RotateCcw, 
  CheckCircle, 
  AlertCircle, 
  Wifi, 
  WifiOff,
  FileText,
  Settings
} from "lucide-react";

export default function TestUploadPage() {
  const { uploads, uploadFile, pauseUpload, resumeUpload, cancelUpload, retryUpload, clearCompleted, isOnline } = useEnhancedFileUpload();
  const [chunkSize, setChunkSize] = useState(1024 * 1024); // 1MB default
  const [showDebug, setShowDebug] = useState(false);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      uploadFile(file, {
        url: '/api/upload',
        chunkSize,
        maxRetries: 3,
        retryDelay: 1000
      });
    });

    // Reset input
    event.target.value = '';
  }, [uploadFile, chunkSize]);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const files = event.dataTransfer.files;
    
    Array.from(files).forEach(file => {
      uploadFile(file, {
        url: '/api/upload',
        chunkSize,
        maxRetries: 3,
        retryDelay: 1000
      });
    });
  }, [uploadFile, chunkSize]);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds)) return '∞';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'failed':
      case 'error': return 'bg-red-500';
      case 'paused': return 'bg-yellow-500';
      case 'uploading': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'failed':
      case 'error': return <AlertCircle className="h-4 w-4" />;
      case 'paused': return <Pause className="h-4 w-4" />;
      case 'uploading': return <Upload className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      <div className="space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  Advanced File Upload Test
                  {isOnline ? (
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      <Wifi className="h-3 w-3 mr-1" />
                      Online
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-red-600 border-red-600">
                      <WifiOff className="h-3 w-3 mr-1" />
                      Offline
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Test chunked uploads with resume capability, network resilience, and real-time progress
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDebug(!showDebug)}
              >
                <Settings className="h-4 w-4 mr-2" />
                {showDebug ? 'Hide' : 'Show'} Debug
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Upload Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium">Chunk Size:</label>
              <select
                value={chunkSize}
                onChange={(e) => setChunkSize(Number(e.target.value))}
                className="px-3 py-1 border rounded-md"
              >
                <option value={256 * 1024}>256 KB</option>
                <option value={512 * 1024}>512 KB</option>
                <option value={1024 * 1024}>1 MB</option>
                <option value={2 * 1024 * 1024}>2 MB</option>
                <option value={5 * 1024 * 1024}>5 MB</option>
              </select>
              <span className="text-sm text-gray-500">
                Current: {formatBytes(chunkSize)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Upload Area */}
        <Card>
          <CardHeader>
            <CardTitle>File Upload</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors"
            >
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <div className="mt-4">
                <label htmlFor="file-upload" className="cursor-pointer">
                  <span className="mt-2 block text-sm font-medium text-gray-900">
                    Drop files here or click to select
                  </span>
                  <input
                    id="file-upload"
                    name="file-upload"
                    type="file"
                    multiple
                    className="sr-only"
                    onChange={handleFileSelect}
                  />
                </label>
                <p className="mt-2 text-xs text-gray-500">
                  Supports multiple files, any type, chunked upload with resume
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upload Management */}
        {uploads.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Active Uploads ({uploads.length})</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearCompleted}
                >
                  Clear Completed
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {Array.from(uploads.values()).map((upload) => (
                <div key={upload.id} className="border rounded-lg p-4 space-y-3">
                  {/* File Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(upload.status)}
                      <span className="font-medium truncate max-w-xs" title={upload.file.name}>
                        {upload.file.name}
                      </span>
                      <Badge 
                        className={`${getStatusColor(upload.status)} text-white`}
                      >
                        {upload.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      {upload.status === 'uploading' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => pauseUpload(upload.id)}
                        >
                          <Pause className="h-4 w-4" />
                        </Button>
                      )}
                      {upload.status === 'paused' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => resumeUpload(upload.id)}
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                      )}
                      {(upload.status === 'error' || upload.status === 'failed') && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => retryUpload(upload.id)}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => cancelUpload(upload.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <Progress value={upload.progress} className="h-2" />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{upload.progress.toFixed(1)}%</span>
                      <span>
                        {formatBytes(upload.uploadedBytes)} / {formatBytes(upload.file.size)}
                      </span>
                    </div>
                  </div>

                  {/* Upload Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Speed:</span>
                      <div className="font-medium">
                        {upload.speed ? `${formatBytes(upload.speed)}/s` : 'Calculating...'}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">Time Remaining:</span>
                      <div className="font-medium">
                        {upload.timeRemaining ? formatTime(upload.timeRemaining) : 'Calculating...'}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">Chunk:</span>
                      <div className="font-medium">
                        {upload.currentChunk} / {upload.totalChunks}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">Retries:</span>
                      <div className="font-medium">
                        {upload.retryCount} / {upload.maxRetries}
                      </div>
                    </div>
                  </div>

                  {/* Error Message */}
                  {upload.error && (
                    <Alert className="border-red-200 bg-red-50">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-red-800">
                        {upload.error}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Success Message */}
                  {upload.status === 'completed' && upload.response && (
                    <Alert className="border-green-200 bg-green-50">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-800">
                        <div>File uploaded successfully!</div>
                        {upload.response.url && (
                          <div className="mt-1">
                            <a 
                              href={upload.response.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="underline"
                            >
                              Download: {upload.response.fileName || upload.file.name}
                            </a>
                          </div>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Debug Information */}
                  {showDebug && (
                    <div className="bg-gray-100 rounded p-3 text-xs font-mono">
                      <div className="font-semibold mb-2">Debug Info:</div>
                      <div>ID: {upload.id}</div>
                      <div>File Size: {formatBytes(upload.file.size)}</div>
                      <div>Chunk Size: {formatBytes(upload.chunkSize)}</div>
                      <div>Total Chunks: {upload.totalChunks}</div>
                      <div>Upload Session: {upload.uploadSession || 'Not started'}</div>
                      <div>Start Time: {upload.startTime ? new Date(upload.startTime).toLocaleTimeString() : 'Not started'}</div>
                      {upload.lastModified && (
                        <div>Last Modified: {new Date(upload.lastModified).toLocaleString()}</div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Network Status & Instructions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Network Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-4">
                {isOnline ? (
                  <>
                    <Wifi className="h-5 w-5 text-green-600" />
                    <span className="text-green-600 font-medium">Connected</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="h-5 w-5 text-red-600" />
                    <span className="text-red-600 font-medium">Disconnected</span>
                  </>
                )}
              </div>
              <p className="text-sm text-gray-600">
                {isOnline 
                  ? "Uploads will proceed normally. Try disconnecting your network to test offline handling."
                  : "Uploads are paused. They will automatically resume when connection is restored."
                }
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Test Features</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Chunked uploads with configurable size
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Pause and resume capability
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Automatic retry with exponential backoff
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Network resilience monitoring
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Real-time progress and speed calculation
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Multiple concurrent uploads
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}