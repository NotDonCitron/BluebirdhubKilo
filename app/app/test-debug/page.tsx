"use client";

import { useState, useEffect } from "react";
import { appLogger } from '@/lib/logger';

export default function TestDebugPage() {
  const [dbStatus, setDbStatus] = useState<Record<string, unknown> | null>(null);
  const [storageStatus, setStorageStatus] = useState<Record<string, unknown> | null>(null);
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
      appLogger.error('Error checking status:', error);
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
      <div className="bg-white p-6 rounded-lg shadow">
        <h1 className="text-2xl font-bold mb-4">System Debug Information</h1>
        
        <div className="space-y-4">
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

          <button 
            onClick={checkStatus} 
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Refresh Status
          </button>
        </div>
      </div>
    </div>
  );
}