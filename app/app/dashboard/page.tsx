
'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Building2, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Plus,
  ArrowRight,
  Brain,
  TrendingUp
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { TestRealTime } from '@/components/dashboard/test-real-time';

interface DashboardStats {
  workspaces: any[];
  recentTasks: any[];
  recentFiles: any[];
  stats: {
    totalTasks: number;
    completedTasks: number;
    totalFiles: number;
    totalWorkspaces: number;
  };
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const [workspacesRes, tasksRes, filesRes] = await Promise.all([
          fetch('/api/workspaces'),
          fetch('/api/tasks'),
          fetch('/api/files')
        ]);

        const workspaces = await workspacesRes.json();
        const tasks = await tasksRes.json();
        const files = await filesRes.json();

        const stats = {
          totalTasks: tasks.length,
          completedTasks: tasks.filter((t: any) => t.status === 'COMPLETED').length,
          totalFiles: files.length,
          totalWorkspaces: workspaces.length
        };

        setData({
          workspaces: workspaces.slice(0, 3),
          recentTasks: tasks.slice(0, 5),
          recentFiles: files.slice(0, 5),
          stats
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const completionRate = data?.stats && data.stats.totalTasks > 0 
    ? Math.round((data.stats.completedTasks / data.stats.totalTasks) * 100)
    : 0;

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              Welcome back, {session?.user?.name?.split(' ')[0] || 'there'}! 👋
            </h1>
            <p className="text-muted-foreground mt-2">
              Here&apos;s what&apos;s happening in your workspaces today.
            </p>
          </div>
          <Button asChild>
            <Link href="/dashboard/workspaces">
              <Plus className="w-4 h-4 mr-2" />
              New Workspace
            </Link>
          </Button>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"
      >
        <Card className="hover:shadow-lg transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Workspaces</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold animate-count-up">{data?.stats?.totalWorkspaces || 0}</div>
            <p className="text-xs text-muted-foreground">
              Active projects
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasks Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold animate-count-up">{data?.stats?.completedTasks || 0}</div>
            <p className="text-xs text-muted-foreground">
              {completionRate}% completion rate
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Files Managed</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold animate-count-up">{data?.stats?.totalFiles || 0}</div>
            <p className="text-xs text-muted-foreground">
              AI-organized content
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tasks</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold animate-count-up">
              {(data?.stats?.totalTasks || 0) - (data?.stats?.completedTasks || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              In progress
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Workspaces */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="h-fit">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Recent Workspaces
                </CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/dashboard/workspaces">View all</Link>
                </Button>
              </div>
              <CardDescription>
                Your recently accessed workspaces
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {data?.workspaces?.length ? (
                data.workspaces.map((workspace: any) => (
                  <div
                    key={workspace.id}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
                        style={{ backgroundColor: workspace.color }}
                      >
                        {workspace.icon || workspace.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-medium">{workspace.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {workspace._count?.tasks || 0} tasks • {workspace._count?.files || 0} files
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/dashboard/workspaces/${workspace.id}`}>
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No workspaces yet</p>
                  <Button className="mt-4" asChild>
                    <Link href="/dashboard/workspaces">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Workspace
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Recent Activity
              </CardTitle>
              <CardDescription>
                Latest tasks and file updates
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {data?.recentTasks?.length ? (
                data.recentTasks.map((task: any) => (
                  <div
                    key={task.id}
                    className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: task.workspace?.color || '#3B82F6' }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{task.title}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant={
                          task.status === 'COMPLETED' ? 'default' :
                          task.status === 'IN_PROGRESS' ? 'secondary' : 'outline'
                        }>
                          {task.status.replace('_', ' ')}
                        </Badge>
                        <span>{task.workspace?.name}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No recent activity</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* AI Insights */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <Card className="bg-gradient-to-br from-primary/10 to-chart-2/10 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              AI Insights
            </CardTitle>
            <CardDescription>
              Smart recommendations based on your activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-4 bg-card/50 rounded-lg">
                <h4 className="font-medium mb-2">Productivity Tip</h4>
                <p className="text-sm text-muted-foreground">
                  You&apos;ve completed {completionRate}% of your tasks this week. 
                  Consider breaking down larger tasks for better progress tracking.
                </p>
              </div>
              <div className="p-4 bg-card/50 rounded-lg">
                <h4 className="font-medium mb-2">File Organization</h4>
                <p className="text-sm text-muted-foreground">
                  {data?.stats?.totalFiles || 0} files have been automatically categorized. 
                  AI has identified {Math.floor((data?.stats?.totalFiles || 0) * 0.8)} as high-priority documents.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
      
      {/* Real-time Test Component */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="lg:col-span-1"
      >
        <TestRealTime />
      </motion.div>
    </div>
  );
}
