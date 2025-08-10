'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface APIResult {
  status?: number;
  ok?: boolean;
  data?: unknown;
  error?: string;
  timestamp: string;
}

export default function DebugPage() {
  const [results, setResults] = useState<Record<string, APIResult>>({});
  const [loading, setLoading] = useState(false);

  const testAPI = async (endpoint: string, method: string = 'GET', body?: unknown) => {
    setLoading(true);
    try {
      const options: RequestInit = {
        method,
        headers: { 'Content-Type': 'application/json' },
      };
      
      if (body) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(endpoint, options);
      const text = await response.text();
      
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = { rawResponse: text };
      }

      setResults((prev: Record<string, APIResult>) => ({
        ...prev,
        [endpoint]: {
          status: response.status,
          ok: response.ok,
          data,
          timestamp: new Date().toISOString()
        }
      }));
    } catch (error) {
      setResults((prev: Record<string, APIResult>) => ({
        ...prev,
        [endpoint]: {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        }
      }));
    }
    setLoading(false);
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">API Debug Page</h1>
      
      <div className="grid gap-4 mb-6">
        <Button 
          onClick={() => testAPI('/api/tests')} 
          disabled={loading}
        >
          Test GET /api/tests
        </Button>
        
        <Button 
          onClick={() => testAPI('/api/tests/start', 'POST', { testId: '11111111-2222-3333-4444-555555555555' })} 
          disabled={loading}
        >
          Test POST /api/tests/start
        </Button>
      </div>

      <div className="space-y-4">
        {Object.entries(results).map(([endpoint, result]: [string, APIResult]) => (
          <Card key={endpoint}>
            <CardHeader>
              <CardTitle className="text-lg">{endpoint}</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded text-sm overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
