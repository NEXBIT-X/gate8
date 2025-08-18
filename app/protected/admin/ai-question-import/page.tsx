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
  const [testTitle, setTestTitle] = useState('AI Imported Test');
  const [durationMinutes, setDurationMinutes] = useState('60');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
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
    if (!result?.questions?.length) { setInsertStatus('No questions parsed'); return; }
    setInsertStatus('Creating test...');
    try {
      const title = testTitle || `AI Imported Test ${new Date().toISOString()}`;
      const duration = Number(durationMinutes) || 60;

      // If admin provided explicit start/end times use them, otherwise derive from duration
      let start_time: string;
      let end_time: string;
      if (startTime && endTime) {
        // startTime/endTime are expected in datetime-local format (local time)
        const s = new Date(startTime);
        const e = new Date(endTime);
        if (!(s instanceof Date) || isNaN(s.getTime()) || !(e instanceof Date) || isNaN(e.getTime())) {
          throw new Error('Invalid start or end time');
        }
        if (s >= e) {
          throw new Error('End time must be after start time');
        }
        start_time = s.toISOString();
        end_time = e.toISOString();
      } else {
        start_time = new Date().toISOString();
        end_time = new Date(Date.now() + duration * 60 * 1000).toISOString();
      }

      const testResp = await fetch('/api/admin/tests/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, duration_minutes: duration, start_time, end_time })
      });
      const testData = await testResp.json();
      if (!testResp.ok) throw new Error(testData.error || 'Failed to create test');

      const createdTest = testData.test;
      if (!createdTest || !createdTest.id) throw new Error('Test creation did not return an id');

      setInsertStatus('Inserting parsed questions into created test...');
      const resp = await fetch('/api/admin/questions/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testId: createdTest.id, questions: result.questions })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Insert failed');
      setInsertStatus(`Created test ${createdTest.id} and inserted ${data.totalQuestions} questions (variant: ${data.variant})`);
    } catch (e: any) { setInsertStatus(`Error: ${e.message}`); }
  };

  // Simple markdown renderer focused on fenced code blocks (```lang\ncode```) - returns React nodes
  const renderQuestionMarkdown = (text?: string | null) => {
    if (!text) return null;
    const nodes: any[] = [];
    const pattern = /```(?:([\w+-]+)\n)?([\s\S]*?)```/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let counter = 0;
    while ((match = pattern.exec(text)) !== null) {
      const before = text.slice(lastIndex, match.index);
      if (before) nodes.push(<div key={`t-${counter}`}>{before}</div>);
      const lang = match[1];
      const rawCode = match[2] || '';
      // Normalize tabs to 4 spaces and preserve existing indentation
      const code = rawCode.replace(/\t/g, '    ').replace(/\r\n/g, '\n');
      nodes.push(
        <pre key={`c-${counter}`} className="bg-gray-900 text-green-200 p-3 rounded overflow-auto text-xs">
          {lang && <div className="text-xs text-blue-300 mb-1">{lang.toUpperCase()}</div>}
          <code className="whitespace-pre font-mono text-xs">{code}</code>
        </pre>
      );
      lastIndex = pattern.lastIndex;
      counter++;
    }
    const rest = text.slice(lastIndex);
    if (rest) nodes.push(<div key={`r-${counter}`}>{rest}</div>);
    return <>{nodes.map((n, i) => <div key={i} className="whitespace-pre-wrap text-sm text-gray-100">{n}</div>)}</>;
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
              placeholder="Test Title (optional)"
              className="flex-1 border rounded px-2 py-1 text-sm"
              value={testTitle}
              onChange={e => setTestTitle(e.target.value)}
            />
            <input
              type="number"
              min={1}
              placeholder="Duration (mins)"
              className="w-28 border rounded px-2 py-1 text-sm"
              value={durationMinutes}
              onChange={e => setDurationMinutes(e.target.value)}
            />
          </div>
          <div className="flex gap-3 items-center">
            <label className="text-xs text-gray-400">Start</label>
            <input
              type="datetime-local"
              className="border rounded px-2 py-1 text-sm"
              aria-label="start-time"
              value={startTime}
              onChange={e => setStartTime(e.target.value)}
            />
            <label className="text-xs text-gray-400">End</label>
            <input
              type="datetime-local"
              className="border rounded px-2 py-1 text-sm"
              aria-label="end-time"
              value={endTime}
              onChange={e => setEndTime(e.target.value)}
            />
            <div className="text-xs text-gray-400">(optional — if blank, duration is used)</div>
            <Button variant="secondary" onClick={insertQuestions} disabled={!result?.questions?.length}>Create Test & Insert</Button>
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
            <div className="space-y-4">
              {result.questions.map((q: any, idx: number) => (
                <div key={idx} className="p-3 border rounded bg-white/5">
                  <div className="mb-2">
                    {renderQuestionMarkdown(q.question_text || q.question)}
                  </div>
                  <div className="mt-2 text-sm text-green-200"><strong>Answer:</strong> {Array.isArray(q.correct_answer) ? q.correct_answer.join(', ') : q.correct_answer}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
