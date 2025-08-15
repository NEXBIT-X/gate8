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
        <h2 className="text-xl font-semibold">Test Management APIs</h2>
        
        <Button 
          onClick={() => testAPI('/api/tests')} 
          disabled={loading}
          className='text-primary bg-card border-border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800'
        >
          Test GET /api/tests
        </Button>
        
        <Button 
          onClick={() => testAPI('/api/tests/start', 'POST', { testId: '11111111-2222-3333-4444-555555555555' })} 
          disabled={loading}
          className='text-primary bg-card border-border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800'
        >
          Test POST /api/tests/start
        </Button>

        <h2 className="text-xl font-semibold mt-6">Admin APIs (Test Creation)</h2>
        
        <Button 
          onClick={() => testAPI('/api/admin/tests/create', 'POST', {
            title: 'Debug Test - ' + new Date().toLocaleTimeString(),
            description: 'Test created from debug page',
            duration_minutes: 60,
            total_questions: 2,
            max_marks: 4,
            start_time: new Date().toISOString(),
            end_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
            is_active: true
          })} 
          disabled={loading}
          className="text-primary bg-card border-border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          🔧 Test Admin: Create Test
        </Button>
        
        <Button 
          onClick={() => testAPI('/api/admin/questions/create', 'POST', {
            testId: '11111111-2222-3333-4444-555555555555', // Use existing test ID
            questions: [
              {
                question_text: 'Debug Question: What is 2 + 2?',
                question_type: 'MCQ',
                options: ['3', '4', '5', '6'],
                correct_answer: '4',
                marks: 2,
                negative_marks: 0.5,
                question_number: 1
              },
              {
                question_text: 'Debug Question: Which are even numbers?',
                question_type: 'MSQ',
                options: ['1', '2', '3', '4'],
                correct_answer: ['2', '4'],
                marks: 2,
                negative_marks: 0.5,
                question_number: 2
              }
            ]
          })} 
          disabled={loading}
          className="text-primary bg-card border-border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          🔧 Test Admin: Create Questions
        </Button>

        <h2 className="text-xl font-semibold mt-6">Environment Check</h2>
        
        <Button 
          onClick={() => {
            const envData = {
              hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
              hasAnonKey: !!(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
              userAgent: navigator.userAgent,
              timestamp: new Date().toISOString()
            };
            setResults(prev => ({
              ...prev,
              'Environment Check': {
                status: 200,
                ok: true,
                data: envData,
                timestamp: new Date().toISOString()
              }
            }));
          }} 
          disabled={loading}
          className="text-primary bg-card border-border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          🔍 Check Environment
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
