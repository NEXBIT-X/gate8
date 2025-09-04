"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles, 
  Settings, 
  Upload, 
  CheckCircle, 
  AlertCircle,
  Loader,
  BarChart3,
  Wand2,
  Languages,
  Target,
  BookOpen
} from 'lucide-react';
import { GATE_SUBJECTS, SUBJECT_SYLLABI, SUBJECT_TOPICS } from '@/lib/ai/gateQuestions';

interface GenerationResult {
  success: boolean;
  questions: any[];
  engineUsed?: 'groq' | 'gemini' | 'openai';
  metadata?: {
    totalGenerated: number;
    bySubject: Record<string, number>;
    byType: Record<string, number>;
  };
  pushedToTest: boolean;
  testInfo?: {
    test_id: string;
    test_name: string;
  };
  message: string;
  error?: string;
}

interface QuestionQualityReport {
  score: number;
  issues: string[];
  suggestions: string[];
  difficulty_assessment: 'easy' | 'medium' | 'hard';
  clarity_score: number;
  accuracy_score: number;
}

interface QuestionEnhancement {
  original_question: string;
  improved_question: string;
  improvements_made: string[];
  explanation_enhanced: string;
  difficulty_adjusted?: 'easy' | 'medium' | 'hard';
}

export default function AIQuestionGenerator() {
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | 'mixed'>('mixed');
  const [questionTypes, setQuestionTypes] = useState<('MCQ' | 'MSQ' | 'NAT')[]>(['MCQ']);
  const [testId, setTestId] = useState<string>('');
  const [syllabus, setSyllabus] = useState<string>('');
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [topicFilter, setTopicFilter] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // New Gemini enhancement states
  const [selectedQuestion, setSelectedQuestion] = useState<string>('');
  const [qualityReport, setQualityReport] = useState<QuestionQualityReport | null>(null);
  const [enhancement, setEnhancement] = useState<QuestionEnhancement | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [showGeminiFeatures, setShowGeminiFeatures] = useState(false);
  const [generationNotice, setGenerationNotice] = useState<string | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingDraft, setEditingDraft] = useState<any>(null);
  const [aiEngine, setAiEngine] = useState<'groq' | 'gemini'>('groq');

  // Defensive: if a result arrives but the loading flag is still true, clear it
  React.useEffect(() => {
    if (result && isGenerating) {
      setIsGenerating(false);
    }
  }, [result, isGenerating]);

  const handleSubjectChange = (subject: string, checked: boolean) => {
    if (checked) {
      setSelectedSubjects(prev => [...prev, subject]);
    } else {
      setSelectedSubjects(prev => prev.filter(s => s !== subject));
    }
  };

  const handleQuestionTypeChange = (type: 'MCQ' | 'MSQ' | 'NAT', checked: boolean) => {
    if (checked) {
      setQuestionTypes(prev => [...prev, type]);
    } else {
      setQuestionTypes(prev => prev.filter(t => t !== type));
    }
  };

  // Toggle a topic in the selectedTopics list
  const toggleTopic = (topic: string) => {
    setSelectedTopics(prev => prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]);
  };

  // Load available tests for selection (graceful fallback)
  const [availableTests, setAvailableTests] = useState<{ id: string; title: string }[]>([]);
  const [testsLoading, setTestsLoading] = useState(false);
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      setTestsLoading(true);
      try {
        const resp = await fetch('/api/admin/tests/list');
        if (!resp.ok) throw new Error('Not available');
        const data = await resp.json();
        if (mounted && data && Array.isArray(data.tests)) {
          setAvailableTests(data.tests.map((t: any) => ({ id: String(t.id), title: t.title })));
        }
      } catch (err) {
        // endpoint missing or error — keep empty list
        setAvailableTests([]);
      } finally {
        if (mounted) setTestsLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Inline create test component
  function CreateTestInline({ onCreated }: { onCreated: (testId: string, title: string) => void }) {
    const [title, setTitle] = useState('New AI Test');
    const [duration, setDuration] = useState(60);
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [creating, setCreating] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const handleCreate = async () => {
      setErr(null);
      setCreating(true);
      try {
        const s = startTime ? new Date(startTime).toISOString() : new Date().toISOString();
        const e = endTime ? new Date(endTime).toISOString() : new Date(Date.now() + duration * 60 * 1000).toISOString();
        const resp = await fetch('/api/admin/tests/create', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: title.trim(), duration_minutes: Number(duration), start_time: s, end_time: e })
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error || 'Create failed');
        if (data && data.test && data.test.id) {
          onCreated(String(data.test.id), data.test.title || title);
          // Add to available tests list locally
          setAvailableTests(prev => [{ id: String(data.test.id), title: data.test.title || title }, ...prev]);
        } else {
          throw new Error('Unexpected response');
        }
      } catch (e: any) {
        setErr(e?.message || String(e));
      } finally {
        setCreating(false);
      }
    };

    return (
      <div className="space-y-3 w-full h-full flex flex-col justify-start">
        {err && <div className="text-sm text-red-600">{err}</div>}
        <input title="create-test-title" className="w-full border rounded px-3 py-2 text-sm" value={title} onChange={e => setTitle(e.target.value)} />
        {/* Compact row: small duration + flexible start datetime */}
        <div className="flex gap-3 items-center">
          <input title="create-duration" type="number" className="w-24 border rounded px-3 py-2 text-sm" value={duration} onChange={e => setDuration(Number(e.target.value) || 60)} placeholder="mins" />
          <input title="create-start" type="datetime-local" className="flex-1 border rounded px-3 py-2 text-sm" value={startTime} onChange={e => setStartTime(e.target.value)} />
        </div>
        <div className="grid grid-cols-1 gap-2">
          <input title="create-end" type="datetime-local" className="w-full border rounded px-3 py-2 text-sm" value={endTime} onChange={e => setEndTime(e.target.value)} />
        </div>
        <div className="flex gap-2 mt-auto">
          <Button size="sm" onClick={handleCreate} disabled={creating}>{creating ? 'Creating...' : 'Create Test'}</Button>
        </div>
      </div>
    );
  }

  const handleGenerate = async () => {
    if (selectedSubjects.length === 0) {
      alert('Please select at least one subject');
      return;
    }

    if (questionTypes.length === 0) {
      alert('Please select at least one question type');
      return;
    }

    setIsGenerating(true);
    setResult(null);

    try {
      
      
      // Default: call server-side generator
      const response = await fetch('/api/admin/questions/generate', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subjects: selectedSubjects,
          questionCount,
          difficulty,
          questionTypes,
          testId: testId.trim() || undefined,
          syllabus: syllabus.trim() || undefined,
          topics: selectedTopics.length ? selectedTopics : undefined,
          aiEngine
        }),
      });
      
      console.debug('[handleGenerate] response status:', response.status, response.statusText);
      const text = await response.text();
      console.debug('[handleGenerate] raw response text:', text && text.slice ? text.slice(0, 2000) : text);
      let data: any = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch (e) {
        // Provide helpful error including raw response and status
        throw new Error(`Invalid JSON from server (status=${response.status} ${response.statusText}): ${text ? text.slice(0, 2000) : '<empty response>'}`);
      }

      if (!response.ok) {
        throw new Error(data?.error || `Server error: ${response.status}`);
      }
      
      if (!data.success) {
        throw new Error(data.error || 'Generation failed');
      }
      
      if (!data.questions || !Array.isArray(data.questions) || data.questions.length === 0) {
        throw new Error('No questions were generated. Please try again with different parameters.');
      }
      
      // Ensure we enforce exact-question-count behaviour on the client
      setGenerationNotice(null);
      let questions = data.questions;
      if (questions.length > questionCount) {
        questions = questions.slice(0, questionCount);
        setGenerationNotice(`Trimmed ${data.questions.length - questions.length} extra question(s) to match requested count (${questionCount}).`);
      } else if (questions.length < questionCount) {
        setGenerationNotice(`Generated ${questions.length} of requested ${questionCount} questions. You can click "Generate ${questionCount - questions.length} more" to append the missing items.`);
      }
      setResult({ ...data, questions });
  // Stop loading indicator after successful generation
  setIsGenerating(false);
      
    } catch (error) {
      console.error('Question generation error:', error);
      setResult({
        success: false,
        questions: [],
        pushedToTest: false,
        message: '',
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      });
      setIsGenerating(false);
    }
  };

  // Generate additional questions to reach exact requested count
  const generateMoreToFill = async () => {
    if (!result) return;
    const have = result.questions ? result.questions.length : 0;
    const need = Math.max(0, questionCount - have);
    if (need === 0) return;
    setIsGenerating(true);
    try {
      const response = await fetch('/api/admin/questions/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjects: selectedSubjects, questionCount: need, difficulty, questionTypes, syllabus: syllabus.trim() || undefined, aiEngine })
      });
      const text = await response.text();
      let data: any = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch (e) {
        throw new Error(`Invalid JSON from server (status=${response.status}): ${text.slice(0, 1000)}`);
      }
      if (!response.ok) throw new Error(data?.error || 'Generation failed');
      const newQs = Array.isArray(data.questions) ? data.questions : [];
      const merged = [...(result.questions || []), ...newQs];
      let final = merged;
      if (merged.length > questionCount) final = merged.slice(0, questionCount);
      setResult({ ...(result || {}), questions: final });
      setGenerationNotice(final.length === questionCount ? `Filled to requested count (${questionCount}).` : `Now have ${final.length} questions (requested ${questionCount}).`);
    } catch (err: any) {
      console.error('Error generating more:', err);
      setGenerationNotice('Failed to generate additional questions.');
    } finally {
      setIsGenerating(false);
    }
  };

  // New Gemini enhancement functions
  const analyzeQuestionQuality = async (questionText: string, questionType: string, options?: string[]) => {
    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/admin/questions/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionText,
          questionType,
          options
        })
      });

      const text = await response.text();
      let data: any = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch (e) {
        throw new Error(`Invalid JSON from server (status=${response.status}): ${text.slice(0, 1000)}`);
      }
      if (!response.ok) throw new Error(data?.error || 'Analysis failed');

      setQualityReport(data.qualityReport);
    } catch (error) {
      console.error('Error analyzing question:', error);
      alert('Failed to analyze question quality');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const enhanceQuestion = async (questionText: string, questionType: string, subject: string) => {
    setIsEnhancing(true);
    try {
      const response = await fetch('/api/admin/questions/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionText,
          questionType,
          subject
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      
      setEnhancement(data.enhancement);
    } catch (error) {
      console.error('Error enhancing question:', error);
      alert('Failed to enhance question');
    } finally {
      setIsEnhancing(false);
    }
  };

  // Change the question type (MCQ/MSQ/NAT) and ask AI to reformat the question accordingly
  const changeQuestionType = async (index: number, newType: 'MCQ' | 'MSQ' | 'NAT') => {
    if (!result || !result.questions || !result.questions[index]) return;
    setIsEnhancing(true);
    try {
      const q = result.questions[index];
      const resp = await fetch('/api/admin/questions/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionText: q.question_text || q.question || '',
          questionType: newType,
          subject: q.subject || selectedSubjects[0] || 'Computer Science and Information Technology',
          options: q.options || undefined,
          explanation: q.explanation || undefined,
          targetDifficulty: q.difficulty || undefined
        })
      });

      const data = await resp.json();
      if (!resp.ok || !data.success) {
        throw new Error(data.error || 'Enhancement failed');
      }

      const enh = data.enhancement;

      setResult((prev: any) => {
        if (!prev) return prev;
        const copy = { ...prev } as any;
        copy.questions = [...(copy.questions || [])];
        const updated = { ...copy.questions[index] } as any;
        // Apply enhancements where available
        if (enh?.improved_question) updated.question_text = enh.improved_question;
        if (enh?.explanation_enhanced) updated.explanation = enh.explanation_enhanced;
        if (enh?.difficulty_adjusted) updated.difficulty = enh.difficulty_adjusted;
        // Update type
        updated.question_type = newType;
        // Adjust options/correct_answer for NAT vs MCQ/MSQ
        if (newType === 'NAT') {
          updated.options = [];
          // If previous correct answer was array/string, attempt to keep numeric string else blank
          if (typeof updated.correct_answer === 'string' && !isNaN(Number(updated.correct_answer))) {
            updated.correct_answer = updated.correct_answer;
          } else if (Array.isArray(updated.correct_answer) && updated.correct_answer.length > 0 && !isNaN(Number(updated.correct_answer[0]))) {
            updated.correct_answer = String(updated.correct_answer[0]);
          } else {
            updated.correct_answer = '';
          }
        } else {
          // For MCQ/MSQ ensure there are options
          if (!Array.isArray(updated.options) || updated.options.length === 0) {
            updated.options = ['Option A', 'Option B', 'Option C', 'Option D'];
            updated.correct_answer = newType === 'MCQ' ? 'Option A' : ['Option A'];
          }
        }

        copy.questions[index] = updated;
        return copy;
      });

    } catch (err: any) {
      console.error('Error changing question type:', err);
      alert('Failed to change question type: ' + (err?.message || 'unknown'));
    } finally {
      setIsEnhancing(false);
    }
  };

  const popularSubjects = [
  'Computer Science and Information Technology'
  ];

  return (
    <Card className="qc bg-card rounded-lg border p-6">
      <div className="flex items-center gap-2 mb-6">
        <h2 className="text-2xl font-bold">AI Question Generator</h2>
        <Sparkles className="h-5 w-5 text-yellow-500" />
      </div>

      <div className="space-y-6">
  {/* Basic Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          <div>
            <Label htmlFor="questionCount">Number of Questions</Label>
            <Input
              id="questionCount"
              type="number"
              min="1"
              max="50"
              value={questionCount}
              onChange={(e) => setQuestionCount(parseInt(e.target.value) || 10)}
              className="mt-1"
            />
          </div>

          <div className="flex flex-col md:col-span-2">
             <Label>Target Test (optional)</Label>
             <div className="mt-1">
               <select title="select-test" className="w-full border rounded px-3 py-2 text-sm" value={testId} onChange={e => setTestId(e.target.value)}>
                  <option value="">(No test — generate only)</option>
                  {availableTests.map(t => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
                </select>
              <p className="text-xs text-gray-500 mt-1">Select an existing test to push questions into, or create a new test below.</p>
            </div>
            <div className="mt-3 p-4 border rounded bg-muted/10 w-full h-full min-h-[220px]">
               <h4 className="text-sm font-medium mb-2">Create Test</h4>
               {/* Create box fills and stretches the right column */}
               <div className="w-full h-full flex flex-col">
                 <CreateTestInline onCreated={(tId, title) => { setTestId(tId); setGenerationNotice(`Created test "${title}" and selected it.`); }} />
               </div>
             </div>
           </div>
        </div>

        {/* Subjects selector with wide topics panel */}
        <div>
          <Label>Subjects</Label>
          <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Left: subject list */}
            <div className="col-span-1 space-y-3">
              {GATE_SUBJECTS.map(s => (
                <div key={s} className="flex items-start gap-3">
                  <div className="mt-1">
                    <Checkbox checked={selectedSubjects.includes(s)} onCheckedChange={(v) => handleSubjectChange(s, !!v)} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{s}</span>
                      {s === 'Computer Science and Information Technology' && (
                        <Button size="sm" variant="ghost" onClick={() => setSyllabus(SUBJECT_SYLLABI[s] || '')}>Load syllabus</Button>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Select to show topics on the right.</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Right: topics panel (spans two columns on md) */}
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Topics</label>
                <div className="flex items-center gap-2">
                  <input placeholder="Filter topics..." value={topicFilter} onChange={e => setTopicFilter(e.target.value)} className="border rounded px-2 py-1 text-sm" />
                  <Button size="sm" variant="outline" onClick={() => {
                    const subject = selectedSubjects[0] || GATE_SUBJECTS[0];
                    setSelectedTopics(SUBJECT_TOPICS[subject] || []);
                  }}>Select all</Button>
                  <Button size="sm" variant="ghost" onClick={() => setSelectedTopics([])}>Clear</Button>
                </div>
              </div>
              <div className="mt-3 border rounded p-3 bg-muted/5 max-h-80 overflow-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(() => {
                    const subject = selectedSubjects[0] || GATE_SUBJECTS[0];
                    const topics = (SUBJECT_TOPICS[subject] || []).filter(t => t.toLowerCase().includes(topicFilter.toLowerCase()));
                    if (topics.length === 0) return <div className="text-sm text-gray-500">No topics match.</div>;
                    return topics.map(t => {
                      const active = selectedTopics.includes(t);
                      return (
                        <button
                          key={t}
                          type="button"
                          title={t}
                          onClick={() => toggleTopic(t)}
                          className={`w-full text-left text-base px-4 py-3 rounded-md border break-words leading-tight flex items-center justify-between ${active ? 'bg-gray-700 text-black border-black-600' : 'bg-white text-gray-800 border-gray-200'}`}>
                          <span className="text-sm font-medium">{t}</span>
                          <span className="text-xs text-gray-500 ml-2">{active ? 'Selected' : ''}</span>
                        </button>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Difficulty Selection */}
        <div>
          <Label>Difficulty Level</Label>
          <div className="flex gap-2 mt-2">
            {(['easy', 'medium', 'hard', 'mixed'] as const).map((level) => (
              <Button
                key={level}
                type="button"
                variant={difficulty === level ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDifficulty(level)}
                className="capitalize"
              >
                {level}
              </Button>
            ))}
          </div>
        </div>

        {/* Question Types */}
        <div>
          <Label>Question Types</Label>
          <div className="flex gap-4 mt-2">
            {(['MCQ', 'MSQ', 'NAT'] as const).map((type) => (
              <div key={type} className="flex items-center space-x-2">
                <Checkbox
                  id={type}
                  checked={questionTypes.includes(type)}
                  onCheckedChange={(checked) => 
                    handleQuestionTypeChange(type, checked as boolean)
                  }
                />
                <Label htmlFor={type} className="text-sm">
                  {type === 'MCQ' && 'Multiple Choice (Single)'}
                  {type === 'MSQ' && 'Multiple Choice (Multiple)'}
                  {type === 'NAT' && 'Numerical Answer'}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Popular Subjects - Quick Selection */}
        <div>
          <Label>Popular GATE Subjects</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
            {popularSubjects.map((subject) => (
              <div key={subject} className="flex items-center space-x-2">
                <Checkbox
                  id={subject}
                  checked={selectedSubjects.includes(subject)}
                  onCheckedChange={(checked) => 
                    handleSubjectChange(subject, checked as boolean)
                  }
                />
                <Label htmlFor={subject} className="text-sm">
                  {subject}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* AI Model Selection */}
        <div>
          <Label>AI Model</Label>
          <div className="mt-2">
            <select title="ai-engine" className="w-full border rounded px-3 py-2 text-sm" value={aiEngine} onChange={e => setAiEngine(e.target.value as any)}>
              <option value="groq">Groq (default)</option>
              <option value="gemini">Gemini (experimental)</option>
            </select>
          </div>
        </div>

        {/* Advanced Settings Toggle */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2"
        >
          <Settings className="h-4 w-4" />
          {showAdvanced ? 'Hide' : 'Show'} Advanced Options
        </Button>

        {showAdvanced && (
          <div className="space-y-4 border-t pt-4">
            {/* All Subjects */}
            <div>
              <Label>All GATE Subjects</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mt-2 max-h-60 overflow-y-auto border rounded p-3">
                {GATE_SUBJECTS.map((subject) => (
                  <div key={subject} className="flex items-center space-x-2">
                    <Checkbox
                      id={`all-${subject}`}
                      checked={selectedSubjects.includes(subject)}
                      onCheckedChange={(checked) => 
                        handleSubjectChange(subject, checked as boolean)
                      }
                    />
                    <Label htmlFor={`all-${subject}`} className="text-xs">
                      {subject}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Syllabus Focus */}
            <div>
              <Label htmlFor="syllabus">Syllabus Focus (Optional)</Label>
              <textarea
                id="syllabus"
                placeholder="Specify particular topics or syllabus areas to focus on..."
                value={syllabus}
                onChange={(e) => setSyllabus(e.target.value)}
                className="w-full mt-1 p-2 border rounded-md h-20 resize-none text-sm"
              />
            </div>
          </div>
        )}

        {/* Generate Button */}
        <Button
          onClick={handleGenerate}
          disabled={isGenerating || selectedSubjects.length === 0}
          className="text-primary bg-blue-50 dark:bg-blue-950/30 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-950/50 w-full"
          size="lg"
        >
          {isGenerating ? (
            <>
              <Loader className="h-4 w-4 mr-2 animate-spin" />
              Generating Questions...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate {questionCount} Questions
              {testId && (
                <>
                  <Upload className="h-4 w-4 ml-2" />
                  & Push to Test
                </>
              )}
            </>
          )}
        </Button>

        {/* Results */}
        {result && (
          <div className="space-y-4 mt-6">
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                {result.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600" />
                )}
                <h3 className="font-semibold">
                  {result.success ? 'Generation Complete!' : 'Error'}
                </h3>
              </div>

              {result.success ? (
                <div className="space-y-3">
                  <p className="text-sm text-green-600">{result.message}</p>
                  
                  {result.metadata && (
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <BarChart3 className="h-4 w-4" />
                        <span>Generated: {result.metadata.totalGenerated}</span>
                      </div>
                      
                      {result.pushedToTest && result.testInfo && (
                        <div className="text-blue-600">
                          Added to: {result.testInfo.test_name}
                        </div>
                      )}
                    </div>
                  )}

                  {result.metadata && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div>
                        <strong>By Subject:</strong>
                        <ul className="mt-1 space-y-1">
                          {Object.entries(result.metadata.bySubject).map(([subject, count]) => (
                            <li key={subject} className="flex justify-between">
                              <span className="truncate">{subject}</span>
                              <span>{count}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div>
                        <strong>By Type:</strong>
                        <ul className="mt-1 space-y-1">
                          {Object.entries(result.metadata.byType).map(([type, count]) => (
                            <li key={type} className="flex justify-between">
                              <span>{type}</span>
                              <span>{count}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-red-600">{result.error}</p>
              )}
            </Card>

            {/* Generated Questions Display */}
            {generationNotice && (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-3 py-2 rounded mb-3">
                {generationNotice}
                {result && result.questions && result.questions.length < questionCount && (
                  <div className="mt-2">
                    <Button size="sm" onClick={generateMoreToFill} disabled={isGenerating}>Generate {questionCount - result.questions.length} more</Button>
                  </div>
                )}
              </div>
            )}
            {result.success && result.questions && result.questions.length > 0 && (
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <BookOpen className="h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold">Generated Questions ({result.questions.length})</h3>
                </div>
                
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {result.questions.map((question, index) => (
                    <div key={index} className="border rounded-lg p-4 bg-muted/20">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">Q{index + 1}</Badge>
                          <Badge variant="secondary" className="text-xs">{question.question_type}</Badge>
                          <Badge variant="outline" className="text-xs">{question.marks} marks</Badge>
                          <Badge variant="outline" className="text-xs">{question.difficulty}</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <select aria-label={`Change question type for Q${index + 1}`} value={question.question_type} onChange={(e) => changeQuestionType(index, e.target.value as any)} className="border rounded px-2 py-1 text-sm">
                            <option value="MCQ">MCQ</option>
                            <option value="MSQ">MSQ</option>
                            <option value="NAT">NAT</option>
                          </select>
                          <Button size="sm" variant="outline" onClick={() => analyzeQuestionQuality(question.question_text, question.question_type, question.options)} disabled={isAnalyzing}><Target className="h-3 w-3 mr-1" />Analyze</Button>
                          <Button size="sm" variant="outline" onClick={() => enhanceQuestion(question.question_text, question.question_type, question.subject)} disabled={isEnhancing}><Wand2 className="h-3 w-3 mr-1" />Enhance</Button>
                          <Button size="sm" variant="outline" onClick={() => { setEditingIndex(index); setEditingDraft(JSON.parse(JSON.stringify(question || {}))); }}>Edit</Button>
                        </div>
                      </div>

                      {/* Editor (inline) */}
                      {editingIndex === index && editingDraft ? (
                        <div className="space-y-2 border-t pt-2">
                          <textarea title="edit-question-text" placeholder="Edit question text" value={editingDraft.question_text || ''} onChange={(e) => setEditingDraft((d: any) => ({ ...d, question_text: e.target.value }))} className="w-full p-2 border rounded" />
                          {Array.isArray(editingDraft.options) && (
                            <div>
                              <label className="text-xs">Options</label>
                              <div className="space-y-1 mt-1">
                                {editingDraft.options.map((opt: string, i: number) => (
                                  <input key={i} title={`edit-option-${i}`} placeholder={`Option ${i + 1}`} value={opt} onChange={(e) => setEditingDraft((d: any) => { const copy = { ...d }; copy.options = [...copy.options]; copy.options[i] = e.target.value; return copy; })} className="w-full p-1 border rounded text-sm" />
                                ))}
                              </div>
                            </div>
                          )}
                          <div className="grid grid-cols-2 gap-2">
                            <input title="edit-marks" placeholder="Marks" type="number" step="0.1" value={editingDraft.marks ?? 2} onChange={(e) => setEditingDraft((d: any) => ({ ...d, marks: Number(e.target.value) }))} className="w-full p-1 border rounded" />
                            <input title="edit-negative-marks" placeholder="Negative marks" type="number" step="0.1" value={editingDraft.negative_marks ?? 0} onChange={(e) => setEditingDraft((d: any) => ({ ...d, negative_marks: Number(e.target.value) }))} className="w-full p-1 border rounded" />
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => {
                              setResult((prev: any) => {
                                if (!prev) return prev;
                                const copy = { ...prev };
                                copy.questions = [...(copy.questions || [])];
                                copy.questions[index] = editingDraft;
                                return copy;
                              });
                              setEditingIndex(null);
                              setEditingDraft(null);
                            }}>Save</Button>
                            <Button size="sm" variant="outline" onClick={() => { setEditingIndex(null); setEditingDraft(null); }}>Cancel</Button>
                          </div>
                        </div>
                      ) : null}

                      <p className="font-medium text-sm"><span className="text-muted-foreground">Subject:</span> {question.subject}</p>
                      <p className="font-medium text-sm"><span className="text-muted-foreground">Topic:</span> {question.topic}</p>
                      <p className="text-sm leading-relaxed"><span className="font-medium">Question:</span> {question.question_text}</p>

                      {question.options && question.options.length > 0 && (
                        <div className="space-y-1">
                          <p className="font-medium text-sm">Options:</p>
                          <div className="grid grid-cols-1 gap-1 ml-4">
                            {question.options.map((option: string, optionIndex: number) => (
                              <div key={optionIndex} className="flex items-center gap-2">
                                <span className="text-xs font-mono bg-muted px-1 rounded">{String.fromCharCode(65 + optionIndex)}</span>
                                <span className="text-sm">{option}</span>
                                {(Array.isArray(question.correct_answer) ? question.correct_answer.includes(option) : question.correct_answer === option) && (
                                  <CheckCircle className="h-3 w-3 text-green-600" />
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="space-y-1">
                        <p className="font-medium text-sm">Correct Answer: <span className="ml-2 text-green-600 font-mono">{Array.isArray(question.correct_answer) ? question.correct_answer.join(', ') : question.correct_answer}</span></p>
                        <p className="font-medium text-sm">Marks: <span className="text-blue-600">{question.marks}</span>{question.negative_marks > 0 && (<span className="ml-2 text-red-600">(-{question.negative_marks} penalty)</span>)}</p>
                      </div>

                      {question.explanation && (
                        <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-950/30 rounded">
                          <p className="font-medium text-sm text-blue-800 dark:text-blue-200">Explanation:</p>
                          <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">{question.explanation}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Gemini Enhancement Results */}
            {qualityReport && (
              <Card className="p-4">
                <div className="bg-card border-border  items-center gap-2 mb-3">
                  <Target className="h-5 w-5 text-orange-600" />
                  <h3 className="font-semibold">Quality Analysis</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Overall Score:</span>
                    <Badge variant={qualityReport.score >= 80 ? "default" : qualityReport.score >= 60 ? "secondary" : "destructive"}>
                      {qualityReport.score}/100
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Difficulty Assessment:</span>
                    <Badge variant="outline">{qualityReport.difficulty_assessment}</Badge>
                  </div>
                  {qualityReport.issues.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-red-600">Issues Found:</p>
                      <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                        {qualityReport.issues.map((issue, index) => (
                          <li key={index}>{issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {qualityReport.suggestions.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-blue-600">Suggestions:</p>
                      <ul className="list-disc list-inside text-sm text-blue-700 space-y-1">
                        {qualityReport.suggestions.map((suggestion, index) => (
                          <li key={index}>{suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {enhancement && (
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Wand2 className="h-5 w-5 text-purple-600" />
                  <h3 className="font-semibold">Question Enhancement</h3>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Original:</p>
                    <p className="text-sm bg-card p-2 rounded">{enhancement.original_question}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-green-600">Enhanced:</p>
                    <p className="text-sm bg-card p-2 rounded">{enhancement.improved_question}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-blue-600">Improvements Made:</p>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      {enhancement.improvements_made.map((improvement, index) => (
                        <li key={index}>{improvement}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-purple-600">Enhanced Explanation:</p>
                    <p className="text-sm bg-card p-2 rounded">{enhancement.explanation_enhanced}</p>
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
    </Card>
  );
  
  
}

