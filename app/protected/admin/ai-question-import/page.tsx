"use client";
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ParsedQuestion {
  question_text: string;
  question_type: 'MCQ' | 'MSQ' | 'NAT';
  options?: string[];
  correct_answer: string | string[];
  marks: number;
  negative_marks?: number;
  explanation?: string;
}

export default function AIQuestionImportPage() {
  const [rawText, setRawText] = useState('1) What is 2 + 2?\nA) 3\nB) 4\nC) 5\nAnswer: B\n\n2) Select prime numbers (choose two)\nA) 2\nB) 3\nC) 4\nD) 6\nAnswer: A, B');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [testId, setTestId] = useState('');
  const [insertStatus, setInsertStatus] = useState<string | null>(null);

  const parse = async () => {
    setLoading(true); setError(null); setResult(null); setInsertStatus(null);
    try {
      const resp = await fetch('/api/admin/questions/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Parse failed');
      setResult(data);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  };

  const insertQuestions = async () => {
    if (!testId) { setInsertStatus('Provide testId first'); return; }
    if (!result?.questions?.length) { setInsertStatus('No questions parsed'); return; }
    setInsertStatus('Inserting...');
    try {
      const resp = await fetch('/api/admin/questions/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testId, questions: result.questions })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Insert failed');
      setInsertStatus(`Inserted ${data.totalQuestions} questions (variant: ${data.variant})`);
    } catch (e: any) { setInsertStatus(`Error: ${e.message}`); }
  };

  return (
    <div className="container mx-auto p-6 max-w-5xl space-y-6">
      <Card>
        <CardHeader><CardTitle><h1>AI Question Parser✨</h1></CardTitle></CardHeader>
        <CardContent className="space-y-4">
        <p>powered by Google Gemini</p>
          <textarea
            className="w-full h-56 p-3 rounded border bg-background font-mono text-sm"
            value={rawText}
            onChange={e => setRawText(e.target.value)}
            placeholder="Paste questions here"
          />
          <div className="flex gap-3">
            <Button onClick={parse} disabled={loading}>{loading ? 'Parsing...' : 'Parse Questions'}</Button>
            <input
              type="text"
              placeholder="Test ID to insert into"
              className="flex-1 border rounded px-2 py-1 text-sm"
              value={testId}
              onChange={e => setTestId(e.target.value)}
            />
            <Button variant="secondary" onClick={insertQuestions} disabled={!result?.questions?.length}>Insert Parsed</Button>
          </div>
          {error && <div className="text-red-600 text-sm">{error}</div>}
          {insertStatus && <div className="text-sm">{insertStatus}</div>}
        </CardContent>
      </Card>
      {result && (
        <Card>
          <CardHeader><CardTitle>Parsed Output ({result.questions?.length || 0})</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {result.warnings?.length > 0 && (
              <div className="bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-400 px-3 py-2 rounded text-xs whitespace-pre-line">
                Warnings:\n{result.warnings.join('\n')}
              </div>
            )}
            <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-96">{JSON.stringify(result.questions, null, 2)}</pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
