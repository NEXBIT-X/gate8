"use client";
import { useState } from 'react';

export default function ProtectedAIGenerator() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/protected/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjects: ['Computer Science and Information Technology'],
          questionCount: 3,
          difficulty: 'medium',
          questionTypes: ['MCQ', 'MSQ']
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || 'Generation failed');
      } else {
        setResult(data);
      }
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4">
      <button className="btn" onClick={generate} disabled={loading}>
        {loading ? 'Generating…' : 'Generate sample questions'}
      </button>

      {error && <div className="mt-3 text-red-600">Error: {error}</div>}

      {result && (
        <div className="mt-4">
          <h3 className="font-semibold">Engine: {result.engineUsed}</h3>
          <pre className="whitespace-pre-wrap text-sm mt-2">{JSON.stringify(result.questions, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
