// ...existing code...
"use client";
import React, { useState } from 'react';
import type { RawParsedQuestion } from '@/lib/ai/parseQuestions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SmartTextRenderer } from '@/components/latex-renderer';
import LaTeXEditor, { LaTeXInput } from '@/components/latex-editor';


export default function AIQuestionImportPage() {
  const [rawText, setRawText] = useState('1) What is 2 + 2?\nA) 3\nB) 4\nC) 5\nAnswer: B\n\n2) Select prime numbers (choose two)\nA) 2\nB) 3\nC) 4\nD) 6\nAnswer: A, B');
  const [parseApi, setParseApi] = useState<'groq' | 'gemini'>('groq');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [testTitle, setTestTitle] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('60');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [insertStatus, setInsertStatus] = useState<string | null>(null);

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
      // Preserve each block's internal and edge whitespace exactly as the user pasted it.
      // Only remove blocks that are entirely whitespace.
      const questionBlocks = rawText
        .split(/\n\s*\n|(?=\n?\d+\))/)
        .filter(q => q.trim().length > 0);

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
          // For each question, if MCQ/MSQ/NAT and correct_answer is label/index, convert to actual answer text/value
          const fixedQuestions: RawParsedQuestion[] = parseData.questions.map((q: any) => {
            // MCQ and MSQ: map label/index to option text
            if ((q.question_type === 'MCQ' || q.question_type === 'MSQ') && Array.isArray(q.options) && q.options.length > 0 && q.correct_answer !== undefined && q.correct_answer !== null) {
              if (typeof q.correct_answer === 'string') {
                // Preserve original spacing in stored value, but use a trimmed copy for matching
                const originalAns = q.correct_answer;
                const ansTrim = originalAns.trim();
                const letterMatch = ansTrim.match(/^[A-Z]$/i);
                let idx = -1;
                if (letterMatch) {
                  idx = ansTrim.toUpperCase().charCodeAt(0) - 65;
                } else if (!isNaN(Number(ansTrim))) {
                  idx = Number(ansTrim) - 1;
                }
                if (idx >= 0 && idx < q.options.length) {
                  return { ...q, correct_answer: q.options[idx] };
                }
                // If it's the actual text, keep original value (preserve spaces)
                return { ...q, correct_answer: originalAns };
              }
              if (Array.isArray(q.correct_answer)) {
                const mapped = (q.correct_answer as any[]).map((ans: any) => {
                  const originalAns = ans;
                  const ansTrim = (typeof ans === 'string') ? ans.trim() : ans;
                  const letterMatch = (typeof ansTrim === 'string') && ansTrim.match(/^[A-Z]$/i);
                  let idx = -1;
                  if (letterMatch) {
                    idx = ansTrim.toUpperCase().charCodeAt(0) - 65;
                  } else if (!isNaN(Number(ansTrim))) {
                    idx = Number(ansTrim) - 1;
                  }
                  if (idx >= 0 && idx < q.options.length) {
                    return q.options[idx];
                  }
                  return originalAns;
                });
                return { ...q, correct_answer: mapped };
              }
            }
            // NAT: if correct_answer is a string or array, try to parse as number (preserve original if not numeric)
            if (q.question_type === 'NAT' && q.correct_answer !== undefined && q.correct_answer !== null) {
              // If it's a string that can be a number, convert to number
              if (typeof q.correct_answer === 'string' && !isNaN(Number(q.correct_answer.trim()))) {
                return { ...q, correct_answer: Number(q.correct_answer.trim()) };
              }
              // If it's an array with one value, and that value is a number string
              if (Array.isArray(q.correct_answer) && q.correct_answer.length === 1 && typeof q.correct_answer[0] === 'string' && !isNaN(Number(q.correct_answer[0].trim()))) {
                return { ...q, correct_answer: Number(q.correct_answer[0].trim()) };
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
  } catch (e: any) {
  setError(e?.message || String(e));
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
      // Ensure marks present
      if (typeof q.marks !== 'number' || isNaN(q.marks) || q.marks <= 0) {
        q.marks = 2;
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
    } catch (e: any) {
      setError(e?.message || String(e));
      setInsertStatus(null);
    } finally {
      setLoading(false);
    }
  };
  // Helper function to render questions with LaTeX and code formatting
  const renderQuestionMarkdown = (text?: string | null) => {
    if (!text) return null;
    return <SmartTextRenderer content={text} className="whitespace-pre-wrap" />;
  };


  // Manual add question form (move above usage, JS only)
  function ManualAddQuestionForm({ onAdd }: { onAdd: (q: any) => void }) {
    const [question_text, setQText] = React.useState('');
    const [question_type, setQType] = React.useState('MCQ');
    const [options, setOptions] = React.useState(['', '', '', '']);
    const [correct, setCorrect] = React.useState('');
  const [explanation, setExplanation] = React.useState('');
  const [marks, setMarks] = React.useState(2);
  const [negativeMarks, setNegativeMarks] = React.useState(0.5);

  const handleOptionChange = (i: number, value: string) => {
      const newOptions = [...options];
      newOptions[i] = value;
      setOptions(newOptions);
    };
  const handleAdd = () => {
      if (!question_text.trim()) return;
      const filteredOptions = options.filter(o => o.trim());
      let correct_answer;
      if (question_type === 'MCQ') {
        // Accept answer as text, match to option value if possible
        const ans = correct.trim();
        // If answer matches an option, use the option value
        const match = filteredOptions.find(opt => opt.trim().toLowerCase() === ans.toLowerCase());
        correct_answer = match ? match : ans;
      } else if (question_type === 'MSQ') {
        // Accept comma separated answers, match to option values if possible
        correct_answer = correct.split(',').map(s => {
          const ans = s.trim();
          const match = filteredOptions.find(opt => opt.trim().toLowerCase() === ans.toLowerCase());
          return match ? match : ans;
        });
      } else {
        correct_answer = correct;
      }
      onAdd({
        question_text,
        question_type,
        options: filteredOptions,
        correct_answer,
        explanation,
        marks: Number(marks) || 2,
        negative_marks: Number(negativeMarks) || (question_type === 'NAT' ? 0 : 0.5)
      });
      setQText('');
      setQType('MCQ');
      setOptions(['', '', '', '']);
      setCorrect('');
      setExplanation('');
    };
  return (
      <div className="space-y-4">
        <LaTeXEditor
          value={question_text}
          onChange={setQText}
          label="Question Text"
          placeholder="Enter question with LaTeX math..."
          rows={3}
        />
        <div>
          <label className="block text-xs font-medium mb-1">Question Type</label>
          <select title="question-type" className="w-full border rounded px-2 py-1 text-sm" value={question_type} onChange={e => setQType(e.target.value)}>
            <option value="MCQ">MCQ</option>
            <option value="MSQ">MSQ</option>
            <option value="NAT">NAT</option>
          </select>
        </div>
        {(question_type === 'MCQ' || question_type === 'MSQ') && (
          <div>
            <label className="block text-xs font-medium mb-1">Options:</label>
            {options.map((opt, i) => (
              <div key={i} className="mb-2">
                <LaTeXInput
                  value={opt}
                  onChange={(value) => handleOptionChange(i, value)}
                  placeholder={`Option ${String.fromCharCode(65 + i)}: Enter with LaTeX...`}
                />
              </div>
            ))}
          </div>
        )}
        {(question_type === 'MCQ' || question_type === 'MSQ') && (
          <div>
            <label className="block text-xs font-medium mb-1">Correct Answer(s)</label>
            <input className="w-full border rounded px-2 py-1 text-sm" placeholder="Correct option(s), comma separated for MSQ" value={correct} onChange={e => setCorrect(e.target.value)} />
          </div>
        )}
        {question_type === 'NAT' && (
          <LaTeXInput
            value={correct}
            onChange={setCorrect}
            label="Correct Answer"
            placeholder="Enter numerical answer with LaTeX if needed..."
          />
        )}
        <LaTeXEditor
          value={explanation}
          onChange={setExplanation}
          label="Explanation (Optional)"
          placeholder="Enter explanation with LaTeX math..."
          rows={2}
        />
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium mb-1">Marks</label>
            <input type="number" title="marks" className="w-full border rounded px-2 py-1 text-sm" value={marks} onChange={e => setMarks(Number(e.target.value))} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Negative Marks</label>
            <input type="number" step="0.1" title="negative-marks" className="w-full border rounded px-2 py-1 text-sm" value={negativeMarks} onChange={e => setNegativeMarks(Number(e.target.value))} />
          </div>
        </div>
        <Button size="sm" variant="default" onClick={handleAdd}>Add Question</Button>
      </div>
    );
  }

  // Editable parsed question card (JS only)
  function EditableParsedQuestionCard({ question, index, onUpdate, onRemove }: { question: RawParsedQuestion & any; index: number; onUpdate: (q: any)=>void; onRemove: ()=>void }) {
    const [editMode, setEditMode] = React.useState(false);
    const [qText, setQText] = React.useState<string>(question.question_text || '');
  const [qType, setQType] = React.useState<string>(question.question_type || 'MCQ');
  const [options, setOptions] = React.useState<string[]>(Array.isArray(question.options) ? question.options : []);
  const [correct, setCorrect] = React.useState<any>(question.correct_answer);
    const handleAddOption = () => {
      setOptions(prev => [...prev, '']);
    };
    const handleRemoveOption = (i: number) => {
      setOptions(prev => prev.filter((_, idx) => idx !== i));
      // If correct was pointing to removed option (by exact match), clear it
      if (typeof correct === 'string') {
        // leave as-is; user can edit
      } else if (Array.isArray(correct)) {
        setCorrect((prev: any) => (Array.isArray(prev) ? prev.filter((c: any) => c !== prev[i]) : prev));
      }
    };

    const handleOptionChange = (i: number, value: string) => {
      const newOptions = [...options];
      newOptions[i] = value;
      setOptions(newOptions);
    };
    const handleCorrectChange = (value: string | string[]) => {
      setCorrect(value);
    };
    const handleSave = () => {
      // Normalize when changing type
      const payload: any = { ...question, question_text: qText, question_type: qType };
      if (qType === 'NAT') {
        // NAT should not have options; ensure correct_answer is a plain value
        payload.options = undefined;
        payload.correct_answer = typeof correct === 'string' || typeof correct === 'number' ? correct : (Array.isArray(correct) && correct.length ? correct[0] : '');
      } else {
        payload.options = options;
        payload.correct_answer = correct;
      }
      onUpdate(payload);
      setEditMode(false);
    };

    // Helper function to detect LaTeX content
    const hasLaTeX = (text: string) => {
      return text.includes('$') || text.includes('\\frac') || text.includes('\\sqrt') || text.includes('\\sum') || text.includes('\\int') || text.includes('\\lim') || text.includes('\\begin{');
    };

    const questionHasLaTeX = hasLaTeX(qText) || 
                           (options && options.some(opt => hasLaTeX(opt))) || 
                           (question.explanation && hasLaTeX(question.explanation)) ||
                           (correct && (Array.isArray(correct) ? correct.some(c => hasLaTeX(String(c))) : hasLaTeX(String(correct))));

    return (
      <div className="p-4 border rounded bg-card">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-semibold">Q{index + 1}</span>
          <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-2 py-1 rounded">{question.question_type}</span>
          {questionHasLaTeX && (
            <span className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 px-2 py-1 rounded flex items-center gap-1">
              📐 LaTeX
            </span>
          )}
          <Button size="sm" variant="outline" onClick={() => setEditMode(v => !v)}>{editMode ? 'Cancel' : 'Edit'}</Button>
          <Button size="sm" variant="destructive" onClick={onRemove}>Remove</Button>
        </div>
        {editMode ? (
          <div className="space-y-4">
            <LaTeXEditor
              value={qText}
              onChange={setQText}
              label="Question Text"
              placeholder="Enter question with LaTeX math..."
              rows={3}
            />
            <div>
              <label className="block text-xs font-medium mb-1">Question Type</label>
              <select title="question-type" className="w-full border rounded px-2 py-1 text-sm" value={qType} onChange={e => {
                const newType = e.target.value;
                setQType(newType);
                // Adjust options/correct for NAT
                if (newType === 'NAT') {
                  setOptions([]);
                  if (Array.isArray(correct)) setCorrect(correct.length ? correct[0] : '');
                } else {
                  // Ensure there are at least two option entries for MCQ/MSQ
                  if (!options || options.length < 2) setOptions(['', '']);
                }
              }}>
                <option value="MCQ">MCQ</option>
                <option value="MSQ">MSQ</option>
                <option value="NAT">NAT</option>
              </select>
            </div>
            {qType !== 'NAT' && (
              <div>
                <label className="block text-xs font-medium mb-1">Options:</label>
                {options.map((opt: string, i: number) => (
                  <div key={i} className="flex gap-2 mb-2 items-start">
                    <div className="flex-1">
                      <LaTeXInput
                        value={opt}
                        onChange={(value) => handleOptionChange(i, value)}
                        placeholder={`Option ${String.fromCharCode(65 + i)}: Enter with LaTeX...`}
                      />
                    </div>
                    <button type="button" className="px-2 py-1 bg-red-600 text-white rounded text-xs mt-1" onClick={() => handleRemoveOption(i)}>Remove</button>
                  </div>
                ))}
                <div className="mt-2">
                  <button type="button" className="px-3 py-1 bg-green-600 text-white rounded text-sm" onClick={handleAddOption}>Add Option</button>
                </div>
              </div>
            )}
            {options && options.length > 0 && (
              <div>
                <label className="block text-xs font-medium mb-1">Correct Option(s):</label>
                <input title='correct-options' className="border rounded px-2 py-1 text-sm w-full" value={Array.isArray(correct) ? correct.join(', ') : correct || ''} onChange={e => handleCorrectChange(e.target.value.split(',').map((s: string) => s.trim()))} />
                <span className="text-xs text-muted-foreground ml-2">(comma separated for multiple)</span>
              </div>
            )}
            {qType === 'NAT' && (
              <div>
                <LaTeXInput
                  value={String(correct || '')}
                  onChange={setCorrect}
                  label="NAT Answer"
                  placeholder="Enter numerical answer with LaTeX if needed..."
                />
              </div>
            )}
            <Button size="sm" variant="default" onClick={handleSave}>Save</Button>
          </div>
          ) : (
          <div>
            {/* Rendered LaTeX question text with indicator */}
            <div className="relative">
              <div className="font-medium mb-2">
                <SmartTextRenderer content={qText} className="prose dark:prose-invert" />
              </div>
              {(qText.includes('$') || qText.includes('\\')) && (
                <span className="absolute top-0 right-0 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-2 py-1 rounded-full">
                  📐 LaTeX
                </span>
              )}
            </div>
            
            {options && options.length > 0 && (
              <div className="relative">
                <ul className="list-none space-y-1 ml-0">
                  {options.map((opt: string, i: number) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="font-mono text-sm mt-1">{String.fromCharCode(65 + i)})</span>
                      <div className="flex-1">
                        <SmartTextRenderer content={opt} className="prose dark:prose-invert" />
                      </div>
                      {(opt.includes('$') || opt.includes('\\')) && (
                        <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-1 py-0.5 rounded">
                          📐
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {correct && (
              <div className="text-green-700 dark:text-green-400 text-sm mt-2 p-2 bg-green-50 dark:bg-green-900/20 rounded">
                <span className="font-medium">Correct: </span>
                {Array.isArray(correct) ? (
                  correct.map((ans, i) => (
                    <span key={i} className="inline-flex items-center gap-1">
                      <SmartTextRenderer content={ans} className="inline" />
                      {(ans.includes('$') || ans.includes('\\')) && <span className="text-xs">📐</span>}
                      {i < correct.length - 1 && ', '}
                    </span>
                  ))
                ) : (
                  <span className="inline-flex items-center gap-1">
                    <SmartTextRenderer content={String(correct)} className="inline" />
                    {(String(correct).includes('$') || String(correct).includes('\\')) && <span className="text-xs">📐</span>}
                  </span>
                )}
              </div>
            )}
            
            {question.explanation && (
              <div className="relative mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                <span className="text-blue-700 dark:text-blue-400 text-xs font-medium">Explanation: </span>
                <div className="mt-1">
                  <SmartTextRenderer content={question.explanation} className="text-xs prose dark:prose-invert" />
                </div>
                {(question.explanation.includes('$') || question.explanation.includes('\\')) && (
                  <span className="absolute top-2 right-2 text-xs bg-blue-200 dark:bg-blue-800/50 text-blue-800 dark:text-blue-300 px-1 py-0.5 rounded">
                    📐
                  </span>
                )}
              </div>
            )}
          </div>
        )}
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
              <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                Questions Input
                <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-2 py-1 rounded-full flex items-center gap-1">
                  📐 LaTeX Supported
                </span>
              </label>
              <textarea
                className="w-full h-56 p-3 rounded border bg-background font-mono text-sm"
                value={rawText}
                onChange={e => setRawText(e.target.value)}
                placeholder="Paste your questions here... Use $math$ for inline LaTeX or $$math$$ for display math"
              />
              <div className="text-xs text-gray-500 mt-1">
                💡 LaTeX examples: $x^2 + y^2 = z^2$, $$\int_{`{a}`}^{`{b}`} f(x) dx$$, $\frac{`{a}`}{`{b}`}$, $\sqrt{`{x}`}$
              </div>
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
                <CardTitle className="flex items-center gap-2">
                  Parsed Questions ({result.questions?.length || 0})
                  {result.questions?.some((q: any) => {
                    const hasLaTeX = (text: string) => text && (text.includes('$') || text.includes('\\frac') || text.includes('\\sqrt') || text.includes('\\sum') || text.includes('\\int') || text.includes('\\lim') || text.includes('\\begin{'));
                    return hasLaTeX(q.question_text) || 
                           (q.options && q.options.some((opt: string) => hasLaTeX(opt))) || 
                           hasLaTeX(q.explanation) ||
                           hasLaTeX(String(q.correct_answer));
                  }) && (
                    <span className="text-sm bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 text-purple-800 dark:text-purple-300 px-3 py-1 rounded-full flex items-center gap-1">
                      📐 LaTeX Enabled
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {result.warnings?.length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded">
                    {result.warnings.map((w: string, i: number) => (
                      <div key={i}>{w}</div>
                    ))}
                  </div>
                )}
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="md:col-span-2 space-y-3">
                    {result.questions.map((q: any, idx: number) => (
                      <div key={idx} className="flex items-start gap-3">
                        <div className="flex-1">
                          <EditableParsedQuestionCard
                            question={q}
                            index={idx}
                            onUpdate={updated => setResult((prev: any) => {
                              if (!prev) return prev;
                              const newQuestions = [...prev.questions];
                              newQuestions[idx] = updated;
                              return { ...prev, questions: newQuestions };
                            })}
                            onRemove={() => setResult((prev: any) => {
                              if (!prev) return prev;
                              const newQuestions = prev.questions.filter((_: any, i: number) => i !== idx);
                              return { ...prev, questions: newQuestions };
                            })}
                          />
                        </div>
                        <div className="w-28 flex flex-col gap-2">
                          <button className="px-2 py-1 bg-gray-700 rounded text-xs" onClick={() => setSelectedIndex(idx)}>Edit</button>
                          <button className="px-2 py-1 bg-red-700 rounded text-xs" onClick={() => setResult((prev:any) => ({ ...prev, questions: prev.questions.filter((_: any, i:number) => i !== idx) }))}>Remove</button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Selected question editor */}
                  <div className="p-3 border rounded bg-muted">
                    <h4 className="font-semibold">Selected Question</h4>
                    {selectedIndex === null || selectedIndex === undefined || !result.questions[selectedIndex] ? (
                      <div className="text-sm text-gray-400 mt-2">No question selected — click Edit on a question to modify marks or specially edit.</div>
                    ) : (
                      (() => {
                        const sq = result.questions[selectedIndex];
                        return (
                          <div className="space-y-2 mt-2">
                            <div className="text-sm font-medium">Q{selectedIndex + 1}: {sq.question_text?.slice(0, 120)}</div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-xs">Marks</label>
                                <input title="marks" type="number" value={sq.marks ?? 2} onChange={(e) => setResult((prev:any) => { const cp = {...prev}; cp.questions[selectedIndex].marks = Number(e.target.value); return cp; })} className="w-full border rounded px-2 py-1 text-sm" />
                              </div>
                              <div>
                                <label className="block text-xs">Negative Marks</label>
                                <input title="negative-marks" type="number" value={sq.negative_marks ?? (sq.question_type === 'NAT' ? 0 : 0.5)} step="0.1" onChange={(e) => setResult((prev:any) => { const cp = {...prev}; cp.questions[selectedIndex].negative_marks = Number(e.target.value); return cp; })} className="w-full border rounded px-2 py-1 text-sm" />
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button className="px-3 py-1 bg-gray-700 rounded" onClick={() => setSelectedIndex(i => (i === null ? 0 : Math.max(0, (i as number) - 1)))}>Prev</button>
                              <button className="px-3 py-1 bg-gray-700 rounded" onClick={() => setSelectedIndex(i => (i === null ? 0 : Math.min(result.questions.length - 1, (i as number) + 1)))}>Next</button>
                              <button className="px-3 py-1 bg-green-700 rounded" onClick={() => {
                                // open edit mode for selected card by toggling selectedIndex (UI already binds Edit button to selectedIndex)
                                // no-op here
                              }}>Apply</button>
                            </div>
                          </div>
                        );
                      })()
                    )}
                  </div>
                </div>
          {/* Add Question Manually */}
          {result && (
            <div className="p-4 border rounded bg-muted/30 mt-6">
              <h3 className="font-semibold mb-2">Add Question Manually</h3>
              <ManualAddQuestionForm onAdd={q => {
                setResult((prev: any) => {
                  if (!prev) return prev;
                  return { ...prev, questions: [...prev.questions, q] };
                });
              }} />
            </div>
          )}
              </CardContent>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
