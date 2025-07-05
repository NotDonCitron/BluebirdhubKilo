'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'react-hot-toast';
import { Loader2, Bell, Volume2, VolumeX, Clock, Mail, Smartphone, Monitor } from 'lucide-react';
import { useDebouncedCallback } from '@/hooks/use-performance';

interface NotificationSettings {
  id: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  desktopNotifications: boolean;
  soundEnabled: boolean;
  notificationFrequency: 'IMMEDIATE' | 'HOURLY' | 'DAILY' | 'WEEKLY';
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  taskReminders: boolean;
  commentNotifications: boolean;
  mentionNotifications: boolean;
  workspaceInvites: boolean;
  systemUpdates: boolean;
}

export function NotificationSettings() {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings/notifications');
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      } else {
        toast.error('Failed to load notification settings');
      }
    } catch (error) {
      console.error('Error fetching notification settings:', error);
      toast.error('Failed to load notification settings');
    } finally {
      setIsLoading(false);
    }
  };

  // Debounced update function to prevent excessive API calls
  const debouncedUpdateSetting = useDebouncedCallback(async (key: keyof NotificationSettings, value: any) => {
    try {
      const response = await fetch('/api/settings/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || 'Failed to update notification setting');
        // Revert the optimistic update
        setSettings(prevSettings => {
          if (prevSettings) {
            return { ...prevSettings, [key]: !value };
          }
          return prevSettings;
        });
      }
    } catch (error) {
      console.error('Error updating notification setting:', error);
      toast.error('Failed to update notification setting');
      // Revert the optimistic update
      setSettings(prevSettings => {
        if (prevSettings) {
          return { ...prevSettings, [key]: !value };
        }
        return prevSettings;
      });
    }
  }, 500);

  const updateSetting = useCallback((key: keyof NotificationSettings, value: any) => {
    if (!settings) return;

    // Optimistic update
    setSettings(prevSettings => {
      if (prevSettings) {
        return { ...prevSettings, [key]: value };
      }
      return prevSettings;
    });

    // Debounced API call
    debouncedUpdateSetting(key, value);
  }, [settings, debouncedUpdateSetting]);

  const saveAllSettings = async () => {
    if (!settings) return;

    setIsSaving(true);
    try {
      const response = await fetch('/api/settings/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        toast.success('Notification settings saved successfully');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to save notification settings');
      }
    } catch (error) {
      console.error('Error saving notification settings:', error);
      toast.error('Failed to save notification settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!settings) {
    return <div>Failed to load notification settings</div>;
  }

  return (
    <div className="space-y-6">
      {/* Delivery Methods */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bell className="h-4 w-4" />
            <span>Delivery Methods</span>
          </CardTitle>
          <CardDescription>
            Choose how you want to receive notifications from BlueBirdHub.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center space-x-2">
                <Mail className="h-4 w-4" />
                <span>Email Notifications</span>
              </Label>
              <p className="text-sm text-muted-foreground">
                Receive notifications via email
              </p>
            </div>
            <Switch
              checked={settings.emailNotifications}
              onCheckedChange={(checked) => updateSetting('emailNotifications', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center space-x-2">
                <Smartphone className="h-4 w-4" />
                <span>Push Notifications</span>
              </Label>
              <p className="text-sm text-muted-foreground">
                Receive push notifications on your mobile device
              </p>
            </div>
            <Switch
              checked={settings.pushNotifications}
              onCheckedChange={(checked) => updateSetting('pushNotifications', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center space-x-2">
                <Monitor className="h-4 w-4" />
                <span>Desktop Notifications</span>
              </Label>
              <p className="text-sm text-muted-foreground">
                Show notifications on your desktop
              </p>
            </div>
            <Switch
              checked={settings.desktopNotifications}
              onCheckedChange={(checked) => updateSetting('desktopNotifications', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center space-x-2">
                {settings.soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                <span>Sound Effects</span>
              </Label>
              <p className="text-sm text-muted-foreground">
                Play sounds when receiving notifications
              </p>
            </div>
            <Switch
              checked={settings.soundEnabled}
              onCheckedChange={(checked) => updateSetting('soundEnabled', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notification Types */}
      <Card>
        <CardHeader>
          <CardTitle>What to notify me about</CardTitle>
          <CardDescription>
            Choose which activities you want to be notified about.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Task Reminders</Label>
              <p className="text-sm text-muted-foreground">
                Get reminded about upcoming task deadlines
              </p>
            </div>
            <Switch
              checked={settings.taskReminders}
              onCheckedChange={(checked) => updateSetting('taskReminders', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Comments & Replies</Label>
              <p className="text-sm text-muted-foreground">
                When someone comments on your tasks or files
              </p>
            </div>
            <Switch
              checked={settings.commentNotifications}
              onCheckedChange={(checked) => updateSetting('commentNotifications', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Mentions</Label>
              <p className="text-sm text-muted-foreground">
                When someone mentions you with @username
              </p>
            </div>
            <Switch
              checked={settings.mentionNotifications}
              onCheckedChange={(checked) => updateSetting('mentionNotifications', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Workspace Invites</Label>
              <p className="text-sm text-muted-foreground">
                When you&apos;re invited to join a workspace
              </p>
            </div>
            <Switch
              checked={settings.workspaceInvites}
              onCheckedChange={(checked) => updateSetting('workspaceInvites', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>System Updates</Label>
              <p className="text-sm text-muted-foreground">
                Important updates about BlueBirdHub
              </p>
            </div>
            <Switch
              checked={settings.systemUpdates}
              onCheckedChange={(checked) => updateSetting('systemUpdates', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Timing & Frequency */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-4 w-4" />
            <span>Timing & Frequency</span>
          </CardTitle>
          <CardDescription>
            Control when and how often you receive notifications.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label>Notification Frequency</Label>
            <Select
              value={settings.notificationFrequency}
              onValueChange={(value: 'IMMEDIATE' | 'HOURLY' | 'DAILY' | 'WEEKLY') => 
                updateSetting('notificationFrequency', value)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="IMMEDIATE">Immediate</SelectItem>
                <SelectItem value="HOURLY">Hourly digest</SelectItem>
                <SelectItem value="DAILY">Daily digest</SelectItem>
                <SelectItem value="WEEKLY">Weekly digest</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Digest mode groups multiple notifications into a single message
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Quiet Hours</Label>
                <p className="text-sm text-muted-foreground">
                  Don't send notifications during these hours
                </p>
              </div>
              <Switch
                checked={settings.quietHoursEnabled}
                onCheckedChange={(checked) => updateSetting('quietHoursEnabled', checked)}
              />
            </div>

            {settings.quietHoursEnabled && (
              <div className="grid grid-cols-2 gap-4 pl-4">
                <div className="space-y-2">
                  <Label htmlFor="quietStart" className="text-sm">Start time</Label>
                  <Input
                    id="quietStart"
                    type="time"
                    value={settings.quietHoursStart}
                    onChange={(e) => updateSetting('quietHoursStart', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quietEnd" className="text-sm">End time</Label>
                  <Input
                    id="quietEnd"
                    type="time"
                    value={settings.quietHoursEnd}
                    onChange={(e) => updateSetting('quietHoursEnd', e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={saveAllSettings} disabled={isSaving}>
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save All Settings
        </Button>
      </div>
    </div>
  );
}