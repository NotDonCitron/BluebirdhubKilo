'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'react-hot-toast';
import { Loader2, Shield, Trash2, AlertTriangle, RefreshCw, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface SecuritySettings {
  twoFactorEnabled: boolean;
  sessionTimeout: number;
  loginNotifications: boolean;
  suspiciousActivityAlerts: boolean;
}

interface AccountInfo {
  id: string;
  email: string;
  createdAt: string;
  lastLoginAt: string;
  activeSessionsCount: number;
  storageUsed: number;
  storageLimit: number;
}

interface ActivityLog {
  id: string;
  action: string;
  timestamp: string;
  ipAddress: string;
  userAgent: string;
}

export function AccountSettings() {
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newEmail, setNewEmail] = useState('');
  const [isChangingEmail, setIsChangingEmail] = useState(false);

  useEffect(() => {
    fetchAccountData();
  }, []);

  const fetchAccountData = async () => {
    try {
      const [accountResponse, securityResponse, activityResponse] = await Promise.all([
        fetch('/api/settings/account'),
        fetch('/api/settings/security'),
        fetch('/api/settings/activity-logs')
      ]);

      if (accountResponse.ok) {
        const accountData = await accountResponse.json();
        setAccountInfo(accountData);
        setNewEmail(accountData.email);
      }

      if (securityResponse.ok) {
        const securityData = await securityResponse.json();
        setSecuritySettings(securityData);
      }

      if (activityResponse.ok) {
        const activityData = await activityResponse.json();
        setActivityLogs(activityData.slice(0, 10)); // Show last 10 activities
      }
    } catch (error) {
      console.error('Error fetching account data:', error);
      toast.error('Failed to load account information');
    } finally {
      setIsLoading(false);
    }
  };

  const updateSecuritySetting = async (key: keyof SecuritySettings, value: string | boolean) => {
    if (!securitySettings) return;

    const updatedSettings = { ...securitySettings, [key]: value };
    setSecuritySettings(updatedSettings);

    try {
      const response = await fetch('/api/settings/security', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      });

      if (!response.ok) {
        setSecuritySettings(securitySettings);
        const error = await response.json();
        toast.error(error.error || 'Failed to update security setting');
      } else {
        toast.success('Security setting updated');
      }
    } catch (error) {
      setSecuritySettings(securitySettings);
      console.error('Error updating security setting:', error);
      toast.error('Failed to update security setting');
    }
  };

  const changeEmail = async () => {
    if (!newEmail || newEmail === accountInfo?.email) return;

    setIsChangingEmail(true);
    try {
      const response = await fetch('/api/settings/change-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newEmail }),
      });

      if (response.ok) {
        toast.success('Email change request sent. Please check your email to confirm.');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to change email');
      }
    } catch (error) {
      console.error('Error changing email:', error);
      toast.error('Failed to change email');
    } finally {
      setIsChangingEmail(false);
    }
  };

  const terminateAllSessions = async () => {
    try {
      const response = await fetch('/api/settings/terminate-sessions', {
        method: 'POST',
      });

      if (response.ok) {
        toast.success('All sessions terminated. You will need to log in again.');
        // Redirect to login after a short delay
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      } else {
        toast.error('Failed to terminate sessions');
      }
    } catch (error) {
      console.error('Error terminating sessions:', error);
      toast.error('Failed to terminate sessions');
    }
  };

  const deleteAccount = async () => {
    try {
      const response = await fetch('/api/settings/delete-account', {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Account deletion initiated. You will receive confirmation via email.');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to delete account');
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error('Failed to delete account');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Account Information */}
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>
            Basic information about your BlueBirdHub account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {accountInfo && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Account ID</Label>
                <div className="font-mono text-sm bg-muted p-2 rounded">
                  {accountInfo.id}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Member Since</Label>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4" />
                  <span>{format(new Date(accountInfo.createdAt), 'MMM d, yyyy')}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Last Login</Label>
                <div className="text-sm">
                  {accountInfo.lastLoginAt 
                    ? format(new Date(accountInfo.lastLoginAt), 'MMM d, yyyy \'at\' h:mm a')
                    : 'Never'
                  }
                </div>
              </div>

              <div className="space-y-2">
                <Label>Active Sessions</Label>
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary">{accountInfo.activeSessionsCount}</Badge>
                  <span className="text-sm text-muted-foreground">sessions</span>
                </div>
              </div>
            </div>
          )}

          <Separator />

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="flex space-x-2">
                <Input
                  id="email"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="Enter new email address"
                />
                <Button 
                  onClick={changeEmail} 
                  disabled={isChangingEmail || newEmail === accountInfo?.email}
                  variant="outline"
                >
                  {isChangingEmail && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Change
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                You&apos;ll receive a confirmation email to verify the new address.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-4 w-4" />
            <span>Security</span>
          </CardTitle>
          <CardDescription>
            Manage your account security and authentication settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {securitySettings && (
            <>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Two-Factor Authentication</Label>
                  <p className="text-sm text-muted-foreground">
                    Add an extra layer of security to your account
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={securitySettings.twoFactorEnabled ? "default" : "secondary"}>
                    {securitySettings.twoFactorEnabled ? "Enabled" : "Disabled"}
                  </Badge>
                  <Button variant="outline" size="sm">
                    {securitySettings.twoFactorEnabled ? "Manage" : "Enable"}
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Login Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified when someone logs into your account
                  </p>
                </div>
                <Switch
                  checked={securitySettings.loginNotifications}
                  onCheckedChange={(checked) => updateSecuritySetting('loginNotifications', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Suspicious Activity Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Get alerts about unusual account activity
                  </p>
                </div>
                <Switch
                  checked={securitySettings.suspiciousActivityAlerts}
                  onCheckedChange={(checked) => updateSecuritySetting('suspiciousActivityAlerts', checked)}
                />
              </div>
            </>
          )}

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Active Sessions</Label>
              <p className="text-sm text-muted-foreground">
                Sign out from all devices and browsers
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" data-testid="terminate-sessions-trigger">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Terminate All Sessions
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Terminate All Sessions?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will log you out from all devices and browsers. You&apos;ll need to log in again.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel data-testid="terminate-sessions-cancel">Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={terminateAllSessions} data-testid="terminate-sessions-confirm">
                    Terminate Sessions
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Your recent account activity and login history.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activityLogs.length > 0 ? (
            <div className="space-y-3">
              {activityLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between border-b pb-3 last:border-b-0">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{log.action}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(log.timestamp), 'MMM d, yyyy \'at\' h:mm a')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">{log.ipAddress}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No recent activity</p>
          )}
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            <span>Danger Zone</span>
          </CardTitle>
          <CardDescription>
            Irreversible and destructive actions for your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-destructive">Delete Account</Label>
              <p className="text-sm text-muted-foreground">
                Permanently delete your account and all associated data. This action cannot be undone.
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" data-testid="delete-account-trigger">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete your account
                    and remove all your data from our servers, including:
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>All your workspaces and tasks</li>
                      <li>All uploaded files and documents</li>
                      <li>All comments and activity history</li>
                      <li>Account settings and preferences</li>
                    </ul>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel data-testid="delete-account-cancel">Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={deleteAccount}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    data-testid="delete-account-confirm"
                  >
                    Yes, Delete My Account
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}