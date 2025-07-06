"use client";

import { useState } from "react";
import { signIn, useSession } from "next-auth/react";

export default function TestAuthPage() {
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const { data: session, status } = useSession();

  const testLogin = async () => {
    setLoading(true);
    try {
      const result = await signIn('credentials', {
        email: 'test@example.com',
        password: 'password123',
        redirect: false
      });
      setResult(result as unknown as Record<string, unknown> || null);
    } catch (error) {
      setResult({ error: (error as Error).message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">Authentication Test</h1>
        
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold">Session Status: {status}</h3>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify(session, null, 2)}
            </pre>
          </div>

          <div>
            <button 
              onClick={testLogin}
              disabled={loading}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? 'Testing Login...' : 'Test Login (test@example.com)'}
            </button>
          </div>

          {result && (
            <div>
              <h3 className="font-semibold">Login Result:</h3>
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}