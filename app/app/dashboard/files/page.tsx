
'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Upload,
  Search,
  MoreVertical,
  FileText,
  Image,
  File,
  Download,
  Eye,
  Tag,
  Calendar,
  User,
  Trash2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useDropzone } from 'react-dropzone';

interface FileData {
  id: string;
  name: string;
  originalName: string;
  mimeType: string;
  size: bigint;
  url: string;
  createdAt: string;
  workspace: {
    id: string;
    name: string;
    color: string;
  };
  uploadedBy: {
    id: string;
    name: string;
    image?: string;
  };
  tags: Array<{
    id: string;
    tag: string;
    color: string;
  }>;
  _count: {
    comments: number;
  };
}

interface WorkspaceData {
  id: string;
  name: string;
  color: string;
}

export default function FilesPage() {
  const [files, setFiles] = useState<FileData[]>([]);
  const [workspaces, setWorkspaces] = useState<WorkspaceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [workspaceFilter, setWorkspaceFilter] = useState('all');
  const [selectedWorkspace, setSelectedWorkspace] = useState('');
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    try {
      const [filesRes, workspacesRes] = await Promise.all([
        fetch('/api/files'),
        fetch('/api/workspaces')
      ]);

      const [filesData, workspacesData] = await Promise.all([
        filesRes.json(),
        workspacesRes.json()
      ]);

      setFiles(filesData);
      setWorkspaces(workspacesData);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);


  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!selectedWorkspace) {
      toast({
        title: 'Error',
        description: 'Please select a workspace first',
        variant: 'destructive',
      });
      return;
    }

    for (const file of acceptedFiles) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('workspaceId', selectedWorkspace);

        const response = await fetch('/api/files', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const newFile = await response.json();
          setFiles(prev => [newFile, ...prev]);
          toast({
            title: 'Success',
            description: `${file.name} uploaded successfully`,
          });
        } else {
          throw new Error('Upload failed');
        }
      } catch (error) {
        console.error('Error uploading file:', error);
        toast({
          title: 'Error',
          description: `Failed to upload ${file.name}`,
          variant: 'destructive',
        });
      }
    }
    setIsUploadDialogOpen(false);
  }, [selectedWorkspace, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    disabled: !selectedWorkspace
  });

  const handleDeleteFile = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this file?')) {
      return;
    }

    try {
      const response = await fetch(`/api/files/${fileId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setFiles(files.filter(file => file.id !== fileId));
        toast({
          title: 'Success',
          description: 'File deleted successfully',
        });
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete file',
        variant: 'destructive',
      });
    }
  };


  const filteredFiles = files.filter(file => {
    if (searchQuery && !file.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !file.originalName.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (workspaceFilter !== 'all' && file.workspace.id !== workspaceFilter) {
      return false;
    }
    return true;
  });

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      // eslint-disable-next-line jsx-a11y/alt-text
      return <Image className="w-8 h-8 text-blue-500" />;
    } else if (mimeType.includes('pdf')) {
      return <FileText className="w-8 h-8 text-red-500" />;
    } else {
      return <File className="w-8 h-8 text-gray-500" />;
    }
  };

  const formatFileSize = (bytes: bigint) => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = Number(bytes);
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold">Files</h1>
          <p className="text-muted-foreground">
            Manage and organize your files
          </p>
        </div>
        
        <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Upload className="w-4 h-4 mr-2" />
              Upload Files
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Upload Files</DialogTitle>
              <DialogDescription>
                Upload files to your workspace.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Workspace</label>
                <Select value={selectedWorkspace} onValueChange={setSelectedWorkspace}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select workspace" />
                  </SelectTrigger>
                  <SelectContent>
                    {workspaces.map((workspace: WorkspaceData) => (
                      <SelectItem key={workspace.id} value={workspace.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-sm"
                            style={{ backgroundColor: workspace.color }}
                          />
                          {workspace.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                  isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
                } ${!selectedWorkspace ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <input {...getInputProps()} />
                <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                {isDragActive ? (
                  <p className="text-primary">Drop files here...</p>
                ) : (
                  <div>
                    <p className="text-muted-foreground mb-2">
                      Drag & drop files here, or click to select
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Supports all file types
                    </p>
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="flex flex-col sm:flex-row gap-4"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={workspaceFilter} onValueChange={setWorkspaceFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Workspace" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Workspaces</SelectItem>
            {workspaces.map((workspace: WorkspaceData) => (
              <SelectItem key={workspace.id} value={workspace.id}>
                {workspace.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </motion.div>

      {/* Files Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {filteredFiles.length > 0 ? (
          filteredFiles.map((file, index) => (
            <motion.div
              key={file.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.05 }}
              whileHover={{ y: -5 }}
            >
              <Card className="h-full hover:shadow-lg transition-all duration-300 group">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      {getFileIcon(file.mimeType)}
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-sm truncate">{file.originalName}</CardTitle>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: file.workspace.color }}
                          />
                          <span>{file.workspace.name}</span>
                        </div>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Eye className="w-4 h-4 mr-2" />
                          Preview
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => handleDeleteFile(file.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">

                  {file.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {file.tags.slice(0, 3).map((tag) => (
                        <Badge
                          key={tag.id}
                          variant="outline"
                          className="text-xs"
                          style={{ 
                            borderColor: tag.color,
                            color: tag.color
                          }}
                        >
                          <Tag className="w-2 h-2 mr-1" />
                          {tag.tag}
                        </Badge>
                      ))}
                      {file.tags.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{file.tags.length - 3} more
                        </Badge>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {file.uploadedBy.name}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(file.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{formatFileSize(file.size)}</span>
                    <span>{file._count.comments} comments</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {searchQuery || workspaceFilter !== 'all'
                ? 'No files found'
                : 'No files yet'
              }
            </h3>
            <p className="text-muted-foreground mb-6">
              {searchQuery || workspaceFilter !== 'all'
                ? 'Try adjusting your filters or search terms'
                : 'Upload your first files to get started'
              }
            </p>
            {!(searchQuery || workspaceFilter !== 'all') && (
              <Button onClick={() => setIsUploadDialogOpen(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Upload Files
              </Button>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
