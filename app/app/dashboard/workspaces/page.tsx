
'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
  Plus,
  Search,
  MoreVertical,
  Users,
  FileText,
  CheckSquare,
  Calendar,
  Edit,
  Trash2,
  Building2
} from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

interface WorkspaceMember {
  id: string;
  user: {
    id: string;
    name: string;
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
  updatedAt: string;
  owner?: {
    id: string;
    name?: string;
    email: string;
    image?: string;
  };
  members?: WorkspaceMember[];
  _count: {
    tasks: number;
    files: number;
  };
}

export default function WorkspacesPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  const [newWorkspace, setNewWorkspace] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
    icon: '🚀'
  });

  const fetchWorkspaces = useCallback(async () => {
    try {
      const response = await fetch('/api/workspaces');
      const data = await response.json();
      setWorkspaces(data);
    } catch (error) {
      console.error('Error fetching workspaces:', error);
      toast({
        title: 'Error',
        description: 'Failed to load workspaces',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);


  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/workspaces', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newWorkspace),
      });

      if (response.ok) {
        const workspace = await response.json();
        setWorkspaces([workspace, ...workspaces]);
        setIsCreateDialogOpen(false);
        setNewWorkspace({
          name: '',
          description: '',
          color: '#3B82F6',
          icon: '🚀'
        });
        toast({
          title: 'Success',
          description: 'Workspace created successfully',
        });
      } else {
        throw new Error('Failed to create workspace');
      }
    } catch (error) {
      console.error('Error creating workspace:', error);
      toast({
        title: 'Error',
        description: 'Failed to create workspace',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteWorkspace = async (workspaceId: string) => {
    if (!confirm('Are you sure you want to delete this workspace? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/workspaces/${workspaceId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setWorkspaces(workspaces.filter((w: Workspace) => w.id !== workspaceId));
        toast({
          title: 'Success',
          description: 'Workspace deleted successfully',
        });
      } else {
        throw new Error('Failed to delete workspace');
      }
    } catch (error) {
      console.error('Error deleting workspace:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete workspace',
        variant: 'destructive',
      });
    }
  };

  const filteredWorkspaces = workspaces.filter((workspace: Workspace) =>
    workspace.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    workspace.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const colors = [
    '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444',
    '#06B6D4', '#84CC16', '#EC4899', '#6366F1', '#14B8A6'
  ];

  const icons = ['🚀', '💼', '📊', '🎨', '⚡', '🔬', '📱', '🏗️', '📈', '🎯'];

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
          <h1 className="text-3xl font-bold">Workspaces</h1>
          <p className="text-muted-foreground">
            Organize your projects and collaborate with your team
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Workspace
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handleCreateWorkspace}>
              <DialogHeader>
                <DialogTitle>Create New Workspace</DialogTitle>
                <DialogDescription>
                  Set up a new workspace to organize your projects and collaborate with your team.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Workspace Name</Label>
                  <Input
                    id="name"
                    placeholder="Enter workspace name"
                    value={newWorkspace.name}
                    onChange={(e) => setNewWorkspace({ ...newWorkspace, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe your workspace"
                    value={newWorkspace.description}
                    onChange={(e) => setNewWorkspace({ ...newWorkspace, description: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Color</Label>
                    <div className="grid grid-cols-5 gap-2">
                      {colors.map((color) => (
                        <button
                          key={color}
                          type="button"
                          className={`w-8 h-8 rounded-lg border-2 ${
                            newWorkspace.color === color ? 'border-foreground' : 'border-transparent'
                          }`}
                          style={{ backgroundColor: color }}
                          onClick={() => setNewWorkspace({ ...newWorkspace, color })}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Icon</Label>
                    <div className="grid grid-cols-5 gap-2">
                      {icons.map((icon) => (
                        <button
                          key={icon}
                          type="button"
                          className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center text-sm ${
                            newWorkspace.icon === icon ? 'border-foreground' : 'border-muted'
                          }`}
                          onClick={() => setNewWorkspace({ ...newWorkspace, icon })}
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Create Workspace</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="relative"
      >
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search workspaces..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </motion.div>

      {/* Workspaces Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
      >
        {filteredWorkspaces.length > 0 ? (
          filteredWorkspaces.map((workspace: Workspace, index: number) => (
            <motion.div
              key={workspace.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -5 }}
            >
              <Card className="h-full hover:shadow-lg transition-all duration-300 group">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center text-white text-lg"
                        style={{ backgroundColor: workspace.color }}
                      >
                        {workspace.icon || workspace.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg truncate">{workspace.name}</CardTitle>
                        <div className="flex items-center text-xs text-muted-foreground mt-1">
                          <Calendar className="w-3 h-3 mr-1" />
                          {new Date(workspace.updatedAt).toLocaleDateString()}
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
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/workspaces/${workspace.id}`}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => handleDeleteWorkspace(workspace.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {workspace.description && (
                    <CardDescription className="line-clamp-2">
                      {workspace.description}
                    </CardDescription>
                  )}
                  
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="space-y-1">
                      <div className="flex items-center justify-center">
                        <CheckSquare className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="text-sm font-medium">{workspace._count?.tasks || 0}</div>
                      <div className="text-xs text-muted-foreground">Tasks</div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-center">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="text-sm font-medium">{workspace._count?.files || 0}</div>
                      <div className="text-xs text-muted-foreground">Files</div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-center">
                        <Users className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="text-sm font-medium">{(workspace.members && workspace.members.length || 0) + 1}</div>
                      <div className="text-xs text-muted-foreground">Members</div>
                    </div>
                  </div>

                  {workspace.members && workspace.members.length > 0 && (
                    <div className="flex items-center space-x-2">
                      <div className="flex -space-x-2">
                        <Avatar className="w-6 h-6 border-2 border-background">
                          <AvatarImage src={workspace.owner?.image} />
                          <AvatarFallback className="text-xs">
                            {workspace.owner?.name?.charAt(0) || 'O'}
                          </AvatarFallback>
                        </Avatar>
                        {workspace.members && workspace.members.slice(0, 3).map((member: WorkspaceMember) => (
                          <Avatar key={member.id} className="w-6 h-6 border-2 border-background">
                            <AvatarImage src={member.user?.image} />
                            <AvatarFallback className="text-xs">
                              {member.user?.name?.charAt(0) || 'M'}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                        {workspace.members && workspace.members.length > 3 && (
                          <div className="w-6 h-6 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                            <span className="text-xs text-muted-foreground">
                              +{workspace.members.length - 3}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <Button asChild className="w-full">
                    <Link href={`/dashboard/workspaces/${workspace.id}`}>
                      Open Workspace
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <Building2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {searchQuery ? 'No workspaces found' : 'No workspaces yet'}
            </h3>
            <p className="text-muted-foreground mb-6">
              {searchQuery 
                ? 'Try adjusting your search terms'
                : 'Create your first workspace to get started with organizing your projects'
              }
            </p>
            {!searchQuery && (
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Workspace
              </Button>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
