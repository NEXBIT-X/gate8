// ...existing code...
"use client";
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';


export default function AIQuestionImportPage() {
  const [rawText, setRawText] = useState('1) What is 2 + 2?\nA) 3\nB) 4\nC) 5\nAnswer: B\n\n2) Select prime numbers (choose two)\nA) 2\nB) 3\nC) 4\nD) 6\nAnswer: A, B');
  const [parseApi, setParseApi] = useState<'groq' | 'gemini'>('groq');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [testTitle, setTestTitle] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('60');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  // const [insertStatus, setInsertStatus] = useState<string | null>(null);
  const [insertStatus, setInsertStatus] = useState<string | null>(null); // Used for status messages

  // Split: Parse and Create Test
  // Multi-call parse: split and parse each question individually
  const parseQuestions = async () => {
    if (!rawText || rawText.trim().length === 0) {
      setError('Please provide questions to parse');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    setInsertStatus(null);
    try {
      setInsertStatus('Splitting input and parsing questions...');
      // Split on double newlines or numbered question pattern
      const questionBlocks = rawText
        .split(/\n\s*\n|(?=\n?\d+\))/)
        .map(q => q.trim())
        .filter(q => q.length > 0);

      let allQuestions = [];
      let warnings = [];
      for (let i = 0; i < questionBlocks.length; i++) {
        setInsertStatus(`Parsing question ${i + 1} of ${questionBlocks.length}...`);
        const block = questionBlocks[i];
        // Choose endpoint based on selected API
        const endpoint = parseApi === 'gemini' ? '/api/admin/questions/parse-gemini' : '/api/admin/questions/parse';
        const parseResp = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rawText: block })
        });
        const parseData = await parseResp.json();
        if (!parseResp.ok) {
          warnings.push(`Q${i + 1}: ${parseData.error || 'Parse failed'}`);
          continue;
        }
        if (parseData.questions && Array.isArray(parseData.questions)) {
          const fixedQuestions = parseData.questions.map(q => {
            // MCQ and MSQ: map label/index to option text
            if ((q.question_type === 'MCQ' || q.question_type === 'MSQ') && Array.isArray(q.options) && q.options.length > 0 && q.correct_answer) {
              if (typeof q.correct_answer === 'string') {
                // If it's a single letter (A, B, C, D), map to index
                const letterMatch = q.correct_answer.trim().match(/^[A-Z]$/i);
                let idx = -1;
                if (letterMatch) {
                  idx = q.correct_answer.toUpperCase().charCodeAt(0) - 65;
                } else if (!isNaN(Number(q.correct_answer))) {
                  idx = Number(q.correct_answer) - 1;
                }
                if (idx >= 0 && idx < q.options.length) {
                  return { ...q, correct_answer: q.options[idx] };
                }
                // If it's the actual text, keep as is
                return { ...q, correct_answer: q.correct_answer };
              }
              if (Array.isArray(q.correct_answer)) {
                const mapped = q.correct_answer.map(ans => {
                  const letterMatch = (typeof ans === 'string') && ans.trim().match(/^[A-Z]$/i);
                  let idx = -1;
                  if (letterMatch) {
                    idx = ans.toUpperCase().charCodeAt(0) - 65;
                  } else if (!isNaN(Number(ans))) {
                    idx = Number(ans) - 1;
                  }
                  if (idx >= 0 && idx < q.options.length) {
                    return q.options[idx];
                  }
                  return ans;
                });
                return { ...q, correct_answer: mapped };
              }
            }
            // NAT: if correct_answer is a string or array, try to parse as number
            if (q.question_type === 'NAT' && q.correct_answer !== undefined && q.correct_answer !== null) {
              // If it's a string that can be a number, convert to number
              if (typeof q.correct_answer === 'string' && !isNaN(Number(q.correct_answer))) {
                return { ...q, correct_answer: Number(q.correct_answer) };
              }
              // If it's an array with one value, and that value is a number string
              if (Array.isArray(q.correct_answer) && q.correct_answer.length === 1 && !isNaN(Number(q.correct_answer[0]))) {
                return { ...q, correct_answer: Number(q.correct_answer[0]) };
              }
            }
            return q;
          });
          allQuestions.push(...fixedQuestions);
        } else {
          warnings.push(`Q${i + 1}: No questions parsed.`);
        }
      }
      setResult({ questions: allQuestions, warnings });
      setInsertStatus('Parsed. Review and edit questions below.');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setInsertStatus(null);
    } finally {
      setLoading(false);
    }
  };

  const createTest = async () => {
    if (!result || !result.questions || result.questions.length === 0) {
      setError('No parsed questions to create test with.');
      return;
    }
    // Validate all questions before sending
    for (let i = 0; i < result.questions.length; i++) {
      const q = result.questions[i];
      if (!q.question_text || !q.question_type) {
        setError(`Question ${i + 1} is missing text or type.`);
        return;
      }
      if ((q.question_type === 'MCQ' || q.question_type === 'MSQ')) {
        if (!Array.isArray(q.options) || q.options.length === 0) {
          setError(`Question ${i + 1} is missing options.`);
          return;
        }
        if (!q.correct_answer || (Array.isArray(q.correct_answer) && q.correct_answer.length === 0)) {
          setError(`Question ${i + 1} is missing correct answer.`);
          return;
        }
      }
      if (q.question_type === 'NAT' && (q.correct_answer === undefined || q.correct_answer === '')) {
        setError(`Question ${i + 1} (NAT) is missing correct answer.`);
        return;
      }
    }
    setLoading(true);
    setError(null);
    setInsertStatus(null);
    try {
      setInsertStatus('Creating test...');
      const title = testTitle.trim();
      const duration = Number(durationMinutes) || 60;
      let start_time;
      let end_time;
      if (startTime && endTime) {
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
      setInsertStatus('Inserting questions into test...');
      const questionsResp = await fetch('/api/admin/questions/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testId: createdTest.id, questions: result.questions })
      });
      const questionsData = await questionsResp.json();
      if (!questionsResp.ok) throw new Error(questionsData.error || 'Failed to insert questions');
      setInsertStatus(`✅ Success! Created test "${createdTest.title}" (ID: ${createdTest.id}) with ${result.questions.length} questions`);
      setRawText('');
      setTestTitle('');
    } catch (e) {
      setError(e.message);
      setInsertStatus(null);
    } finally {
      setLoading(false);
    }
  };


  function ManualAddQuestionForm({ onAdd }) {
    const [question_text, setQText] = React.useState('');
    const [question_type, setQType] = React.useState('MCQ');
    const [options, setOptions] = React.useState(['', '', '', '']);
    const [correct, setCorrect] = React.useState('');
    const [explanation, setExplanation] = React.useState('');

    const handleOptionChange = (i, value) => {
      const newOptions = [...options];
      newOptions[i] = value;
      setOptions(newOptions);
    };
    const handleAdd = () => {
      if (!question_text.trim()) return;
      const filteredOptions = options.filter(o => o.trim());
      let correct_answer;
      if (question_type === 'MCQ') {
        const ans = correct.trim();
        const match = filteredOptions.find(opt => opt.trim().toLowerCase() === ans.toLowerCase());
        correct_answer = match ? match : ans;
      } else if (question_type === 'MSQ') {
        correct_answer = correct.split(',').map(s => {
          const ans = s.trim();
          const match = filteredOptions.find(opt => opt.trim().toLowerCase() === ans.toLowerCase());
          return match ? match : ans;
        });
      } else if (question_type === 'NAT') {
        correct_answer = !isNaN(Number(correct.trim())) ? Number(correct.trim()) : '';
      } else {
        correct_answer = correct;
      }
      onAdd({
        question_text,
        question_type,
        options: filteredOptions,
        correct_answer,
        explanation
      });
      setQText('');
      setQType('MCQ');
      setOptions(['', '', '', '']);
      setCorrect('');
      setExplanation('');
    };
    return (
      <div className="space-y-2">
        <input className="w-full border rounded px-2 py-1 text-sm" placeholder="Question text" value={question_text} onChange={e => setQText(e.target.value)} />
        <select className="w-full border rounded px-2 py-1 text-sm" value={question_type} onChange={e => setQType(e.target.value)}>
          <option value="MCQ">MCQ</option>
          <option value="MSQ">MSQ</option>
          <option value="NAT">NAT</option>
        </select>
        {(question_type === 'MCQ' || question_type === 'MSQ') && (
          <div>
            <label className="block text-xs font-medium mb-1">Options:</label>
            {options.map((opt, i) => (
              <div key={i} className="flex gap-2 mb-1">
                <input className="border rounded px-2 py-1 text-sm flex-1" placeholder={`Option ${i + 1}`} value={opt} onChange={e => handleOptionChange(i, e.target.value)} />
              </div>
            ))}
          </div>
        )}
        {(question_type === 'MCQ' || question_type === 'MSQ') && (
          <input className="w-full border rounded px-2 py-1 text-sm" placeholder="Correct option(s), comma separated for MSQ" value={correct} onChange={e => setCorrect(e.target.value)} />
        )}
        {question_type === 'NAT' && (
          <input className="w-full border rounded px-2 py-1 text-sm" placeholder="Correct answer (number)" value={correct} onChange={e => setCorrect(e.target.value)} />
        )}
        <input className="w-full border rounded px-2 py-1 text-sm" placeholder="Explanation (optional)" value={explanation} onChange={e => setExplanation(e.target.value)} />
        <Button size="sm" variant="default" onClick={handleAdd}>Add Question</Button>
      </div>
    );
  }


  return (
    <div className="container mx-auto p-6 max-w-5xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>AI Question Parser & Test Creator</CardTitle>
          <p className="text-sm text-muted-foreground">
            Powered by Groq AI • Parse questions and create tests in one step
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Input Section */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Parsing Engine</label>
              <select
              title='a'
                className="w-full border rounded px-3 py-2 text-sm"
                value={parseApi}
                onChange={e => setParseApi(e.target.value as 'groq' | 'gemini')}
              >
                <option value="groq">Groq (Fast, Default)</option>
                <option value="gemini">Gemini (Google, Experimental)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Questions Input</label>
              <textarea
                className="w-full h-56 p-3 rounded border bg-background font-mono text-sm"
                value={rawText}
                onChange={e => setRawText(e.target.value)}
                placeholder="Paste your questions here..."
              />
            </div>

            {/* Test Configuration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Test Title *</label>
                <input
                  type="text"
                  placeholder="Enter test title"
                  className="w-full border rounded px-3 py-2 text-sm"
                  value={testTitle}
                  onChange={e => setTestTitle(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Duration (minutes)</label>
                <input
                  type="number"
                  min={1}
                  placeholder="60"
                  className="w-full border rounded px-3 py-2 text-sm"
                  value={durationMinutes}
                  onChange={e => setDurationMinutes(e.target.value)}
                />
              </div>
            </div>

            {/* Timing Configuration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Start Time (optional)</label>
                <input
                  title='a'
                  type="datetime-local"
                  className="w-full border rounded px-3 py-2 text-sm"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">End Time (optional)</label>
                <input 
                  title='a'
                  type="datetime-local"
                  className="w-full border rounded px-3 py-2 text-sm"
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              * If times not specified, test will start immediately and run for the specified duration
            </p>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button 
              onClick={parseQuestions} 
              disabled={loading || !rawText.trim()}
              className="w-full"
              size="lg"
            >
              {loading ? 'Processing...' : '🧩 Parse Questions'}
            </Button>
            <Button 
              onClick={createTest} 
              disabled={loading || !testTitle.trim() || !result || !result.questions || result.questions.length === 0}
              className="w-full"
              size="lg"
              variant="secondary"
            >
              {loading ? 'Processing...' : '🎯 Create Test'}
            </Button>
          </div>
          </div>

          {/* Status Messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Result Section */}
          {result && result.questions && (
            <>
              <CardHeader>
                <CardTitle>Parsed Questions ({result.questions?.length || 0})</CardTitle>
              </CardHeader>
              <CardContent>
                {result.questions.map((q, idx) => (
                  <div key={idx} className="mb-6">
                    <div className="mb-2 font-semibold">Q{idx + 1} ({q.question_type})</div>
                    <div>{q.question_text}</div>
                    {q.options && q.options.length > 0 && (
                      <ul className="list-disc ml-6 mt-2">
                        {q.options.map((opt, i) => (
                          <li key={i}>{opt}</li>
                        ))}
                      </ul>
                    )}
                    {q.correct_answer !== undefined && q.correct_answer !== '' && (
                      <div className="text-green-700 text-sm mt-1">Correct: {Array.isArray(q.correct_answer) ? q.correct_answer.join(', ') : q.correct_answer}</div>
                    )}
                    {q.explanation && (
                      <div className="text-blue-700 text-xs mt-1">Explanation: {q.explanation}</div>
                    )}
                  </div>
                ))}
                {/* Add Question Manually */}
                <div className="p-4 border rounded bg-muted/30 mt-6">
                  <h3 className="font-semibold mb-2">Add Question Manually</h3>
                  <ManualAddQuestionForm onAdd={q => {
                    setResult((prev) => {
                      if (!prev) return prev;
                      return { ...prev, questions: [...prev.questions, q] };
                    });
                  }} />
                </div>
              </CardContent>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
