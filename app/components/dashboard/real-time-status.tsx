'use client';

import { useRealTime } from '@/components/providers/real-time-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Wifi, WifiOff, RotateCcw, CheckCircle, AlertCircle, Clock } from 'lucide-react';

export function RealTimeStatus() {
  const { isConnected, connectionState, lastEvent } = useRealTime();

  const getStatusIcon = () => {
    switch (connectionState) {
      case 'connected':
        return <Wifi className="h-3 w-3" />;
      case 'connecting':
        return <RotateCcw className="h-3 w-3 animate-spin" />;
      case 'error':
        return <AlertCircle className="h-3 w-3" />;
      default:
        return <WifiOff className="h-3 w-3" />;
    }
  };

  const getStatusColor = () => {
    switch (connectionState) {
      case 'connected':
        return 'default';
      case 'connecting':
        return 'secondary';
      case 'error':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getStatusText = () => {
    switch (connectionState) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting';
      case 'error':
        return 'Error';
      default:
        return 'Disconnected';
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 px-2">
          <Badge variant={getStatusColor() as any} className="flex items-center space-x-1">
            {getStatusIcon()}
            <span className="text-xs">{getStatusText()}</span>
          </Badge>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium">Real-time Connection Status</h4>
            <div className="flex items-center space-x-2">
              {getStatusIcon()}
              <span className="text-sm">{getStatusText()}</span>
              {isConnected && (
                <CheckCircle className="h-4 w-4 text-green-500" />
              )}
            </div>
          </div>

          {lastEvent && (
            <div className="space-y-2">
              <h5 className="text-sm font-medium">Last Event</h5>
              <div className="text-xs space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="font-medium">Type:</span>
                  <Badge variant="outline" className="text-xs">
                    {lastEvent.type}
                  </Badge>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="h-3 w-3" />
                  <span className="text-muted-foreground">
                    {new Date(lastEvent.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="text-xs text-muted-foreground">
            <p>Real-time updates keep you informed about:</p>
            <ul className="mt-1 space-y-1 list-disc list-inside">
              <li>Task assignments and completions</li>
              <li>New comments and mentions</li>
              <li>File uploads and sharing</li>
              <li>Workspace invitations</li>
              <li>System notifications</li>
            </ul>
          </div>

          {connectionState === 'error' && (
            <div className="text-sm text-destructive">
              <p>Connection lost. Attempting to reconnect...</p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}