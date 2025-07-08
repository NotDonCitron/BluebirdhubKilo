'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ProfileSettings } from '@/components/dashboard/settings/profile-settings';
import { PreferencesSettings } from '@/components/dashboard/settings/preferences-settings';
import { NotificationSettings } from '@/components/dashboard/settings/notification-settings';
import { PrivacySettings } from '@/components/dashboard/settings/privacy-settings';
import { AccountSettings } from '@/components/dashboard/settings/account-settings';
import { ErrorBoundary } from '@/components/error-boundary';
import { 
  User, 
  Settings, 
  Bell, 
  Shield, 
  Trash2,
  Palette,
} from 'lucide-react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');

  const settingsTabs = [
    {
      id: 'profile',
      label: 'Profile',
      icon: User,
      description: 'Manage your personal information and account details'
    },
    {
      id: 'preferences',
      label: 'Preferences',
      icon: Settings,
      description: 'Customize your app experience and display settings'
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: Bell,
      description: 'Control how and when you receive notifications'
    },
    {
      id: 'privacy',
      label: 'Privacy',
      icon: Shield,
      description: 'Manage your privacy and data visibility settings'
    },
    {
      id: 'account',
      label: 'Account',
      icon: Trash2,
      description: 'Account security and data management'
    }
  ];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and set e-mail preferences.
        </p>
      </div>
      
      <Separator />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Settings Navigation */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Settings</CardTitle>
                <CardDescription>
                  Choose a category to configure
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <TabsList className="flex flex-col h-auto w-full bg-transparent">
                  {settingsTabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <TabsTrigger
                        key={tab.id}
                        value={tab.id}
                        className="w-full justify-start text-left p-4 data-[state=active]:bg-muted"
                      >
                        <div className="flex items-center space-x-3">
                          <Icon className="h-4 w-4" />
                          <div className="flex flex-col items-start">
                            <span className="font-medium">{tab.label}</span>
                            <span className="text-xs text-muted-foreground hidden sm:block">
                              {tab.description}
                            </span>
                          </div>
                        </div>
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
              </CardContent>
            </Card>
          </div>

          {/* Settings Content */}
          <div className="lg:col-span-3">
            <TabsContent value="profile" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <User className="h-5 w-5" />
                    <span>Profile Settings</span>
                  </CardTitle>
                  <CardDescription>
                    Update your profile information and manage your account details.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ErrorBoundary>
                    <ProfileSettings />
                  </ErrorBoundary>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="preferences" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Palette className="h-5 w-5" />
                    <span>Appearance & Preferences</span>
                  </CardTitle>
                  <CardDescription>
                    Customize how BlueBirdHub looks and behaves for you.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ErrorBoundary>
                    <PreferencesSettings />
                  </ErrorBoundary>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notifications" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Bell className="h-5 w-5" />
                    <span>Notification Settings</span>
                  </CardTitle>
                  <CardDescription>
                    Choose when and how you want to be notified about activity.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ErrorBoundary>
                    <NotificationSettings />
                  </ErrorBoundary>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="privacy" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Shield className="h-5 w-5" />
                    <span>Privacy & Security</span>
                  </CardTitle>
                  <CardDescription>
                    Control your privacy settings and data visibility.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ErrorBoundary>
                    <PrivacySettings />
                  </ErrorBoundary>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="account" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Trash2 className="h-5 w-5" />
                    <span>Account Management</span>
                  </CardTitle>
                  <CardDescription>
                    Manage your account security and data.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ErrorBoundary>
                    <AccountSettings />
                  </ErrorBoundary>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </div>
      </Tabs>
    </div>
  );
}