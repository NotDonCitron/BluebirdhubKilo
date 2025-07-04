'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRealTime } from '@/components/providers/real-time-provider';
import { Badge } from '@/components/ui/badge';
import { Zap, Wifi, WifiOff } from 'lucide-react';
import { toast } from 'react-hot-toast';

export function TestRealTime() {
  const [eventType, setEventType] = useState<string>('task_assigned');
  const [isTesting, setIsTesting] = useState(false);
  const { isConnected, connectionState, sendEvent } = useRealTime();

  const eventTypes = [
    { value: 'task_assigned', label: 'Task Assigned' },
    { value: 'task_completed', label: 'Task Completed' },
    { value: 'comment_added', label: 'Comment Added' },
    { value: 'mention', label: 'Mention' },
    { value: 'workspace_invite', label: 'Workspace Invite' },
    { value: 'file_shared', label: 'File Shared' },
    { value: 'system_update', label: 'System Update' },
  ];

  const triggerTestEvent = async () => {
    setIsTesting(true);
    try {
      // First send via our test API
      const response = await fetch('/api/test-events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ eventType }),
      });

      if (response.ok) {
        toast.success(`Test ${eventType} event triggered!`);
        
        // Also try to send via the real-time system
        try {
          await sendEvent(eventType, {
            message: `Test ${eventType} event`,
            source: 'test-button',
          });
        } catch (error) {
          console.error('Error sending real-time event:', error);
        }
      } else {
        toast.error('Failed to trigger test event');
      }
    } catch (error) {
      console.error('Error triggering test event:', error);
      toast.error('Failed to trigger test event');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Zap className="h-5 w-5" />
          <span>Real-time Events Test</span>
        </CardTitle>
        <CardDescription>
          Test real-time notifications and events system.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-2">
          <Badge variant={isConnected ? "default" : "secondary"} className="flex items-center space-x-1">
            {isConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
          </Badge>
          <span className="text-sm text-muted-foreground">Status: {connectionState}</span>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium mb-2 block">Event Type</label>
            <Select value={eventType} onValueChange={setEventType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {eventTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button 
            onClick={triggerTestEvent} 
            disabled={isTesting || !isConnected}
            className="w-full"
          >
            {isTesting ? 'Triggering...' : 'Trigger Test Event'}
          </Button>
        </div>

        <div className="text-xs text-muted-foreground">
          <p>This will trigger a test notification based on your notification settings.</p>
          <p>Make sure notifications are enabled in Settings → Notifications.</p>
        </div>
      </CardContent>
    </Card>
  );
}