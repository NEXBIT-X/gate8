'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Award, ArrowLeft, BookOpen } from 'lucide-react';

interface TestResult {
  attempt: {
    id: string;
    total_score: number;
    percentage: number;
    started_at: string;
    completed_at: string;
    time_taken_seconds: number;
  };
  test: {
    id: string;
    title: string;
    description: string;
    total_marks: number;
    duration_minutes: number;
  };
  responses: Array<{
    id: string;
    question_id: string;
    user_answer: string | string[] | number;
    is_correct: boolean;
    marks_obtained: number;
    question_type: string;
    question: {
      id: string;
      question_text: string;
      question_type: string;
      options?: string[];
      correct_answers?: string[];
      numerical_answer_range?: { min: number; max: number } | { exact: number };
      positive_marks: number;
      negative_marks: number;
      explanation?: string;
    };
  }>;
  score: {
    totalScore: number;
    totalPossibleMarks: number;
    percentage: number;
    totalQuestions: number;
    answeredQuestions: number;
    correctAnswers: number;
    incorrectAnswers: number;
    unansweredQuestions: number;
  };
}

export default function TestResultPage() {
  const router = useRouter();
  const [result, setResult] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const attemptId = new URLSearchParams(window.location.search).get('attemptId');
    if (!attemptId) {
      setError('No attempt ID provided');
      setLoading(false);
      return;
    }

    fetchResult(attemptId);
  }, []);

  const fetchResult = async (attemptId: string) => {
    try {
      const response = await fetch(`/api/tests/result/${attemptId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch result');
      }
      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Error fetching result:', error);
      setError('Failed to load test result');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    if (percentage >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getQuestionTypeColor = (type: string) => {
    switch (type) {
      case 'MCQ': return 'bg-blue-100 text-blue-800';
      case 'MSQ': return 'bg-purple-100 text-purple-800';
      case 'NAT': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const renderAnswer = (response: TestResult['responses'][0]) => {
    const { question, user_answer } = response;
    
    switch (question.question_type) {
      case 'MCQ':
        return (
          <div className="space-y-2">
            <div><strong>Your Answer:</strong> {user_answer || 'Not answered'}</div>
            <div><strong>Correct Answer:</strong> {question.correct_answers?.[0] || 'N/A'}</div>
          </div>
        );
      
      case 'MSQ':
        return (
          <div className="space-y-2">
            <div><strong>Your Answers:</strong> {Array.isArray(user_answer) ? user_answer.join(', ') : 'Not answered'}</div>
            <div><strong>Correct Answers:</strong> {question.correct_answers?.join(', ') || 'N/A'}</div>
          </div>
        );
      
      case 'NAT':
        return (
          <div className="space-y-2">
            <div><strong>Your Answer:</strong> {user_answer || 'Not answered'}</div>
            <div><strong>Correct Range:</strong> 
              {'exact' in (question.numerical_answer_range || {})
                ? (question.numerical_answer_range as { exact: number }).exact 
                : `${'min' in (question.numerical_answer_range || {}) ? (question.numerical_answer_range as { min: number; max: number }).min : 'N/A'} - ${'max' in (question.numerical_answer_range || {}) ? (question.numerical_answer_range as { min: number; max: number }).max : 'N/A'}`}
            </div>
          </div>
        );
      
      default:
        return <div>Unknown question type</div>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading results...</div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-600 text-lg mb-4">{error || 'Failed to load results'}</div>
          <Button onClick={() => router.push('/protected/dash')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const { attempt, test, responses, score } = result;

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <Button 
          variant="ghost" 
          onClick={() => router.push('/protected/dash')}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
        <h1 className="text-3xl font-bold text-center">Test Results</h1>
        <p className="text-center text-gray-600 mt-2">{test.title}</p>
      </div>

      {/* Score Summary */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5" />
            Score Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className={`text-3xl font-bold ${getScoreColor(score.percentage)}`}>
                {score.totalScore}
              </div>
              <div className="text-sm text-gray-600">Total Score</div>
            </div>
            <div>
              <div className={`text-3xl font-bold ${getScoreColor(score.percentage)}`}>
                {score.percentage.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">Percentage</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-600">
                {score.correctAnswers}
              </div>
              <div className="text-sm text-gray-600">Correct</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-600">
                {formatTime(attempt.time_taken_seconds)}
              </div>
              <div className="text-sm text-gray-600">Time Taken</div>
            </div>
          </div>
          
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="font-semibold text-gray-700">{score.totalQuestions}</div>
              <div className="text-gray-600">Total Questions</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-green-600">{score.correctAnswers}</div>
              <div className="text-gray-600">Correct</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-red-600">{score.incorrectAnswers}</div>
              <div className="text-gray-600">Incorrect</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-gray-600">{score.unansweredQuestions}</div>
              <div className="text-gray-600">Unanswered</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Question-wise Results */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Question-wise Analysis
          </CardTitle>
          <CardDescription>
            Detailed breakdown of your performance on each question
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {responses.map((response, index) => (
              <div key={response.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">Question {index + 1}</span>
                    <Badge className={getQuestionTypeColor(response.question_type)}>
                      {response.question_type}
                    </Badge>
                    {response.is_correct ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                  </div>
                  <div className="text-sm">
                    <span className={response.marks_obtained >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {response.marks_obtained > 0 ? '+' : ''}{response.marks_obtained} marks
                    </span>
                  </div>
                </div>
                
                <div className="mb-3">
                  <div className="font-medium text-gray-800 mb-2">
                    {response.question.question_text}
                  </div>
                  {renderAnswer(response)}
                </div>
                
                {response.question.explanation && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-md">
                    <div className="font-medium text-blue-800 mb-1">Explanation:</div>
                    <div className="text-blue-700 text-sm">{response.question.explanation}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
