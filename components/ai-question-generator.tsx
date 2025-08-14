"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Brain, 
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
import { GATE_SUBJECTS } from '@/lib/ai/gateQuestions';

interface GenerationResult {
  success: boolean;
  questions: any[];
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
      const response = await fetch('/api/admin/questions/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subjects: selectedSubjects,
          questionCount,
          difficulty,
          questionTypes,
          testId: testId.trim() || undefined,
          syllabus: syllabus.trim() || undefined
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate questions');
      }

      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        questions: [],
        pushedToTest: false,
        message: '',
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      });
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

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      
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

  const popularSubjects = [
    'Computer Science and Information Technology',
    'Electronics and Communication Engineering',
    'Electrical Engineering',
    'Mechanical Engineering',
    'Civil Engineering'
  ];

  return (
    <Card className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <Brain className="h-6 w-6 text-blue-600" />
        <h2 className="text-2xl font-bold">AI Question Generator</h2>
        <Sparkles className="h-5 w-5 text-yellow-500" />
      </div>

      <div className="space-y-6">
        {/* Basic Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

          <div>
            <Label htmlFor="testId">Test ID (Optional)</Label>
            <Input
              id="testId"
              placeholder="Leave empty to generate only"
              value={testId}
              onChange={(e) => setTestId(e.target.value)}
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">
              If provided, questions will be added to this test
            </p>
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
          className="w-full"
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
          <Card className="p-4 mt-6">
            <div className="flex items-center gap-2 mb-3">
              {result.success ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
              <h3 className="font-semibold">
                {result.success ? 'Success!' : 'Error'}
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
        )}
      </div>
    </Card>
  );
}
