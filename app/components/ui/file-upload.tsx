"use client";

import { useCallback, useState } from "react";
import { useDropzone, FileRejection } from "react-dropzone";
import { useFileUpload } from "@/hooks/use-file-upload";
import {
  Upload,
  FileText,
  Pause,
  Play,
  X,
  RotateCcw,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { formatBytes } from "@/lib/utils";
import { toast } from "react-hot-toast";

interface UploadResponse {
  fileId: string;
  fileName: string;
  url?: string;
  [key: string]: unknown;
}

interface UploadItem {
  fileId: string;
  fileName: string;
  fileSize: number;
  uploadedBytes: number;
  progress: number;
  status: string;
  error?: string;
  retryCount: number;
  startTime: number;
}

interface FileUploadProps {
  uploadUrl: string;
  maxFiles?: number;
  maxFileSize?: number;
  acceptedFileTypes?: string[];
  onUploadComplete?: (fileId: string, response: UploadResponse) => void;
  onUploadError?: (fileId: string, error: Error) => void;
  headers?: HeadersInit;
}

export function FileUpload({
  uploadUrl,
  maxFiles = 10,
  maxFileSize = 10 * 1024 * 1024 * 1024, // 10GB default
  acceptedFileTypes,
  onUploadComplete,
  onUploadError,
  headers,
}: FileUploadProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const {
    uploads,
    uploadFile,
    pauseUpload,
    resumeUpload,
    cancelUpload,
    retryUpload,
    clearCompleted,
  } = useFileUpload();

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      // Handle rejected files
      rejectedFiles.forEach((file) => {
        const errors = file.errors.map((e) => e.message).join(", ");
        toast.error(`${file.file.name}: ${errors}`);
      });

      // Upload accepted files
      acceptedFiles.forEach((file) => {
        uploadFile(file, {
          url: uploadUrl,
          headers,
          onComplete: onUploadComplete,
          onError: onUploadError,
        });
      });
    },
    [uploadFile, uploadUrl, headers, onUploadComplete, onUploadError]
  );

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    maxFiles,
    maxSize: maxFileSize,
    accept: acceptedFileTypes
      ? acceptedFileTypes.reduce((acc, type) => {
          acc[type] = [];
          return acc;
        }, {} as Record<string, string[]>)
      : undefined,
    onDragEnter: () => setIsDragActive(true),
    onDragLeave: () => setIsDragActive(false),
    onDropAccepted: () => setIsDragActive(false),
    onDropRejected: () => setIsDragActive(false),
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "failed":
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case "uploading":
        return <RotateCcw className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <FileText className="h-5 w-5 text-gray-400" />;
    }
  };

  const getActionButton = (upload: UploadItem) => {
    switch (upload.status) {
      case "uploading":
        return (
          <button
            onClick={() => pauseUpload(upload.fileId)}
            className="p-1 hover:bg-gray-100 rounded"
            title="Pause upload"
          >
            <Pause className="h-4 w-4" />
          </button>
        );
      case "paused":
        return (
          <button
            onClick={() =>
              resumeUpload(upload.fileId, {
                url: uploadUrl,
                headers,
                onComplete: onUploadComplete,
                onError: onUploadError,
              })
            }
            className="p-1 hover:bg-gray-100 rounded"
            title="Resume upload"
          >
            <Play className="h-4 w-4" />
          </button>
        );
      case "failed":
        return (
          <button
            onClick={() =>
              retryUpload(upload.fileId, {
                url: uploadUrl,
                headers,
                onComplete: onUploadComplete,
                onError: onUploadError,
              })
            }
            className="p-1 hover:bg-gray-100 rounded"
            title="Retry upload"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        );
      default:
        return null;
    }
  };

  const formatTimeRemaining = (upload: UploadItem) => {
    if (upload.status !== "uploading" || upload.progress === 0) {
      return "";
    }

    const elapsed = Date.now() - upload.startTime;
    const rate = upload.uploadedBytes / (elapsed / 1000); // bytes per second
    const remaining = upload.fileSize - upload.uploadedBytes;
    const secondsRemaining = remaining / rate;

    if (secondsRemaining < 60) {
      return `${Math.round(secondsRemaining)}s remaining`;
    } else if (secondsRemaining < 3600) {
      return `${Math.round(secondsRemaining / 60)}m remaining`;
    } else {
      return `${Math.round(secondsRemaining / 3600)}h remaining`;
    }
  };

  return (
    <div className="w-full">
      {/* Drop Zone */}
      <div
        {...getRootProps()}
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-all duration-200 ease-in-out
          ${
            isDragActive
              ? "border-blue-500 bg-blue-50"
              : "border-gray-300 hover:border-gray-400"
          }
        `}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2 text-sm text-gray-600">
          {isDragActive
            ? "Drop files here..."
            : "Drag & drop files here, or click to select"}
        </p>
        <p className="mt-1 text-xs text-gray-500">
          {maxFiles > 1 ? `Up to ${maxFiles} files, ` : ""}
          {formatBytes(maxFileSize)} max per file
          {acceptedFileTypes && acceptedFileTypes.length > 0
            ? `, ${acceptedFileTypes.join(", ")}`
            : ""}
        </p>
      </div>

      {/* Upload List */}
      {uploads.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-900">Uploads</h3>
            {uploads.some((u) => u.status === "completed") && (
              <button
                onClick={clearCompleted}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Clear completed
              </button>
            )}
          </div>

          <div className="space-y-2">
            {uploads.map((upload) => (
              <div
                key={upload.fileId}
                className="bg-white rounded-lg border border-gray-200 p-3"
              >
                <div className="flex items-center space-x-3">
                  {getStatusIcon(upload.status)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {upload.fileName}
                      </p>
                      <div className="flex items-center space-x-2">
                        {getActionButton(upload)}
                        {upload.status !== "completed" && (
                          <button
                            onClick={() => cancelUpload(upload.fileId)}
                            className="p-1 hover:bg-gray-100 rounded"
                            title="Cancel upload"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-1 text-xs text-gray-500">
                      {formatBytes(upload.uploadedBytes)} of{" "}
                      {formatBytes(upload.fileSize)}
                      {upload.status === "uploading" &&
                        ` • ${formatTimeRemaining(upload)}`}
                      {upload.retryCount > 0 &&
                        ` • Retry ${upload.retryCount}`}
                    </div>

                    {upload.error && (
                      <p className="mt-1 text-xs text-red-600">
                        {upload.error}
                      </p>
                    )}

                    {/* Progress Bar */}
                    {upload.status !== "completed" && (
                      <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full transition-all duration-300 ${
                            upload.status === "failed"
                              ? "bg-red-500"
                              : upload.status === "paused"
                              ? "bg-yellow-500"
                              : "bg-blue-500"
                          }`}
                          style={{ width: `${upload.progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}