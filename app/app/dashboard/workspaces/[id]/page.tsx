
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Settings,
  Plus,
  CheckSquare,
  FileText,
  Users,
  Calendar,
  Upload,
  MessageSquare
} from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

interface WorkspaceMember {
  id: string;
  user: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };
  role: string;
}

interface Workspace {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon?: string;
  members: WorkspaceMember[];
  _count: {
    tasks: number;
    files: number;
  };
}

export default function WorkspaceDetailPage() {
  const params = useParams();
  const workspaceId = params.id as string;
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (workspaceId) {
      fetchWorkspace();
    }
  }, [workspaceId, fetchWorkspace]);

  const fetchWorkspace = useCallback(async () => {
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}`);
      if (response.ok) {
        const data = await response.json();
        setWorkspace(data);
      } else {
        throw new Error('Failed to fetch workspace');
      }
    } catch (error) {
      console.error('Error fetching workspace:', error);
      toast({
        title: 'Error',
        description: 'Failed to load workspace',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [workspaceId, toast]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'IN_PROGRESS': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'CANCELLED': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'HIGH': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'MEDIUM': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      default: return 'bg-green-500/10 text-green-500 border-green-500/20';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium mb-2">Workspace not found</h3>
        <p className="text-muted-foreground">The workspace you're looking for doesn't exist or you don't have access to it.</p>
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
        className="flex items-start justify-between"
      >
        <div className="flex items-center space-x-4">
          <div
            className="w-16 h-16 rounded-xl flex items-center justify-center text-white text-2xl"
            style={{ backgroundColor: workspace.color }}
          >
            {workspace.icon || workspace.name.charAt(0)}
          </div>
          <div>
            <h1 className="text-3xl font-bold">{workspace.name}</h1>
            {workspace.description && (
              <p className="text-muted-foreground mt-1">{workspace.description}</p>
            )}
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {(workspace.members?.length || 0) + 1} members
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Created {new Date(workspace.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href="/dashboard/tasks">
                  <CheckSquare className="w-4 h-4 mr-2" />
                  New Task
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/files">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload File
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Users className="w-4 h-4 mr-2" />
                Invite Member
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid gap-6 md:grid-cols-4"
      >
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{workspace.tasks?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              {workspace.tasks?.filter((t: any) => t.status === 'COMPLETED').length || 0} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Files</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{workspace.files?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              AI-categorized content
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(workspace.members?.length || 0) + 1}</div>
            <p className="text-xs text-muted-foreground">
              Active collaborators
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activity</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(workspace.tasks?.reduce((acc: number, task: any) => acc + (task._count?.comments || 0), 0) || 0) +
               (workspace.files?.reduce((acc: number, file: any) => acc + (file._count?.comments || 0), 0) || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total comments
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Tabs defaultValue="tasks" className="space-y-6">
          <TabsList>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="files">Files</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
          </TabsList>

          <TabsContent value="tasks" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Recent Tasks</h3>
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard/tasks">View All</Link>
              </Button>
            </div>
            {workspace.tasks?.length > 0 ? (
              <div className="grid gap-4">
                {workspace.tasks.slice(0, 5).map((task: any) => (
                  <Card key={task.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-2">
                          <h4 className="font-medium">{task.title}</h4>
                          {task.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {task.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2">
                            <Badge className={`border ${getStatusColor(task.status)}`}>
                              {task.status.replace('_', ' ')}
                            </Badge>
                            <Badge className={`border ${getPriorityColor(task.priority)}`}>
                              {task.priority}
                            </Badge>
                            {task.dueDate && (
                              <span className="text-xs text-muted-foreground">
                                Due {new Date(task.dueDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        {task.assignments?.length > 0 && (
                          <div className="flex -space-x-2 ml-4">
                            {task.assignments.slice(0, 3).map((assignment: any) => (
                              <Avatar key={assignment.user.id} className="w-6 h-6 border-2 border-background">
                                <AvatarImage src={assignment.user.image} />
                                <AvatarFallback className="text-xs">
                                  {assignment.user.name.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No tasks yet. Create your first task to get started.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="files" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Recent Files</h3>
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard/files">View All</Link>
              </Button>
            </div>
            {workspace.files?.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {workspace.files.slice(0, 6).map((file: any) => (
                  <Card key={file.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <FileText className="w-5 h-5 text-blue-500" />
                          <span className="font-medium text-sm truncate">{file.originalName}</span>
                        </div>
                        {file.aiMetadata?.[0] && (
                          <div className="space-y-1">
                            <Badge variant="secondary" className="text-xs">
                              {file.aiMetadata[0].category}
                            </Badge>
                            {file.aiMetadata[0].summary && (
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {file.aiMetadata[0].summary}
                              </p>
                            )}
                          </div>
                        )}
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{file.uploadedBy.name}</span>
                          <span>{new Date(file.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No files yet. Upload your first files to get started.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="members" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Team Members</h3>
              <Button variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Invite Member
              </Button>
            </div>
            <div className="grid gap-4">
              {/* Workspace Owner */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar>
                        <AvatarImage src={workspace.owner?.image} />
                        <AvatarFallback>
                          {workspace.owner?.name?.charAt(0) || 'O'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="font-medium">{workspace.owner?.name}</h4>
                        <p className="text-sm text-muted-foreground">{workspace.owner?.email}</p>
                      </div>
                    </div>
                    <Badge>Owner</Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Members */}
              {workspace.members?.map((member: any) => (
                <Card key={member.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Avatar>
                          <AvatarImage src={member.user?.image} />
                          <AvatarFallback>
                            {member.user?.name?.charAt(0) || 'M'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-medium">{member.user?.name}</h4>
                          <p className="text-sm text-muted-foreground">{member.user?.email}</p>
                        </div>
                      </div>
                      <Badge variant="secondary">{member.role}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}
