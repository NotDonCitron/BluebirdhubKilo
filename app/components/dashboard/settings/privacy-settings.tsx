'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { toast } from 'react-hot-toast';
import { Loader2, Shield, Eye, EyeOff, Users, Globe, Lock, Download, Trash2 } from 'lucide-react';

interface PrivacySettings {
  id: string;
  profileVisibility: 'PUBLIC' | 'WORKSPACE_ONLY' | 'PRIVATE';
  activityVisible: boolean;
  showOnlineStatus: boolean;
  allowDirectMessages: boolean;
  allowWorkspaceInvites: boolean;
  dataProcessingConsent: boolean;
  analyticsConsent: boolean;
  marketingConsent: boolean;
  shareUsageData: boolean;
}

export function PrivacySettings() {
  const [settings, setSettings] = useState<PrivacySettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings/privacy');
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      } else {
        toast.error('Failed to load privacy settings');
      }
    } catch (error) {
      console.error('Error fetching privacy settings:', error);
      toast.error('Failed to load privacy settings');
    } finally {
      setIsLoading(false);
    }
  };

  const updateSetting = async (key: keyof PrivacySettings, value: any) => {
    if (!settings) return;

    const updatedSettings = { ...settings, [key]: value };
    setSettings(updatedSettings);

    try {
      const response = await fetch('/api/settings/privacy', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      });

      if (!response.ok) {
        // Revert on error
        setSettings(settings);
        const error = await response.json();
        toast.error(error.error || 'Failed to update privacy setting');
      }
    } catch (error) {
      // Revert on error
      setSettings(settings);
      console.error('Error updating privacy setting:', error);
      toast.error('Failed to update privacy setting');
    }
  };

  const saveAllSettings = async () => {
    if (!settings) return;

    setIsSaving(true);
    try {
      const response = await fetch('/api/settings/privacy', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        toast.success('Privacy settings saved successfully');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to save privacy settings');
      }
    } catch (error) {
      console.error('Error saving privacy settings:', error);
      toast.error('Failed to save privacy settings');
    } finally {
      setIsSaving(false);
    }
  };

  const exportData = async () => {
    try {
      const response = await fetch('/api/settings/export-data', {
        method: 'POST',
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bluebirdhub-data-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('Data export started');
      } else {
        toast.error('Failed to export data');
      }
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Failed to export data');
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
    return <div>Failed to load privacy settings</div>;
  }

  return (
    <div className="space-y-6">
      {/* Profile Visibility */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Eye className="h-4 w-4" />
            <span>Profile Visibility</span>
          </CardTitle>
          <CardDescription>
            Control who can see your profile and activity information.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label>Profile Visibility</Label>
            <Select
              value={settings.profileVisibility}
              onValueChange={(value: 'PUBLIC' | 'WORKSPACE_ONLY' | 'PRIVATE') => 
                updateSetting('profileVisibility', value)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PUBLIC">
                  <div className="flex items-center space-x-2">
                    <Globe className="h-4 w-4" />
                    <div>
                      <div>Public</div>
                      <div className="text-xs text-muted-foreground">
                        Anyone can see your profile
                      </div>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="WORKSPACE_ONLY">
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4" />
                    <div>
                      <div>Workspace Members Only</div>
                      <div className="text-xs text-muted-foreground">
                        Only members of your workspaces can see your profile
                      </div>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="PRIVATE">
                  <div className="flex items-center space-x-2">
                    <Lock className="h-4 w-4" />
                    <div>
                      <div>Private</div>
                      <div className="text-xs text-muted-foreground">
                        Only you can see your profile
                      </div>
                    </div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Show Activity Status</Label>
              <p className="text-sm text-muted-foreground">
                Let others know when you&apos;re active or recently active
              </p>
            </div>
            <Switch
              checked={settings.activityVisible}
              onCheckedChange={(checked) => updateSetting('activityVisible', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Show Online Status</Label>
              <p className="text-sm text-muted-foreground">
                Display a green dot when you&apos;re online
              </p>
            </div>
            <Switch
              checked={settings.showOnlineStatus}
              onCheckedChange={(checked) => updateSetting('showOnlineStatus', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Communication */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>Communication</span>
          </CardTitle>
          <CardDescription>
            Control how other users can interact with you.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Allow Direct Messages</Label>
              <p className="text-sm text-muted-foreground">
                Let other users send you direct messages
              </p>
            </div>
            <Switch
              checked={settings.allowDirectMessages}
              onCheckedChange={(checked) => updateSetting('allowDirectMessages', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Allow Workspace Invitations</Label>
              <p className="text-sm text-muted-foreground">
                Allow others to invite you to their workspaces
              </p>
            </div>
            <Switch
              checked={settings.allowWorkspaceInvites}
              onCheckedChange={(checked) => updateSetting('allowWorkspaceInvites', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Data & Privacy */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-4 w-4" />
            <span>Data & Privacy</span>
          </CardTitle>
          <CardDescription>
            Manage your data processing and privacy preferences.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center space-x-2">
                <span>Data Processing</span>
                <Badge variant="outline" className="text-xs">Required</Badge>
              </Label>
              <p className="text-sm text-muted-foreground">
                Process your data to provide BlueBirdHub services
              </p>
            </div>
            <Switch
              checked={settings.dataProcessingConsent}
              onCheckedChange={(checked) => updateSetting('dataProcessingConsent', checked)}
              disabled={true}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Analytics & Performance</Label>
              <p className="text-sm text-muted-foreground">
                Help us improve BlueBirdHub by sharing anonymous usage data
              </p>
            </div>
            <Switch
              checked={settings.analyticsConsent}
              onCheckedChange={(checked) => updateSetting('analyticsConsent', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Marketing Communications</Label>
              <p className="text-sm text-muted-foreground">
                Receive emails about new features and product updates
              </p>
            </div>
            <Switch
              checked={settings.marketingConsent}
              onCheckedChange={(checked) => updateSetting('marketingConsent', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Share Usage Data</Label>
              <p className="text-sm text-muted-foreground">
                Share aggregated usage statistics to help improve the product
              </p>
            </div>
            <Switch
              checked={settings.shareUsageData}
              onCheckedChange={(checked) => updateSetting('shareUsageData', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Data Rights */}
      <Card>
        <CardHeader>
          <CardTitle>Your Data Rights</CardTitle>
          <CardDescription>
            Access, export, or delete your personal data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Export Your Data</Label>
              <p className="text-sm text-muted-foreground">
                Download a copy of all your data from BlueBirdHub
              </p>
            </div>
            <Button variant="outline" onClick={exportData}>
              <Download className="mr-2 h-4 w-4" />
              Export Data
            </Button>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-destructive">Delete Account</Label>
              <p className="text-sm text-muted-foreground">
                Permanently delete your account and all associated data
              </p>
            </div>
            <Button variant="destructive" disabled>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Account
            </Button>
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