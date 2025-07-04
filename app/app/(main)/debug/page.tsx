"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function DebugPage() {
  const [dbStatus, setDbStatus] = useState<any>(null);
  const [storageStatus, setStorageStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      // Check database status
      const dbResponse = await fetch('/api/debug/database');
      const dbData = await dbResponse.json();
      setDbStatus(dbData);

      // Check storage status
      const storageResponse = await fetch('/api/debug/storage');
      const storageData = await storageResponse.json();
      setStorageStatus(storageData);
    } catch (error) {
      console.error('Error checking status:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">Loading system status...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>System Debug Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Database Status</h3>
            <div className="bg-gray-100 p-4 rounded">
              <pre>{JSON.stringify(dbStatus, null, 2)}</pre>
            </div>
          </div>
          
          <div>
            <h3 className="font-semibold mb-2">Storage Status</h3>
            <div className="bg-gray-100 p-4 rounded">
              <pre>{JSON.stringify(storageStatus, null, 2)}</pre>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Environment Variables</h3>
            <div className="space-y-2">
              <div>
                <Badge variant="outline">STORAGE_TYPE</Badge>
                <span className="ml-2">{process.env.STORAGE_TYPE || 'Not set'}</span>
              </div>
              <div>
                <Badge variant="outline">DATABASE_URL</Badge>
                <span className="ml-2">{process.env.DATABASE_URL ? 'Set' : 'Not set'}</span>
              </div>
              <div>
                <Badge variant="outline">NEXTAUTH_URL</Badge>
                <span className="ml-2">{process.env.NEXTAUTH_URL || 'Not set'}</span>
              </div>
            </div>
          </div>

          <Button onClick={checkStatus} className="mt-4">
            Refresh Status
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}