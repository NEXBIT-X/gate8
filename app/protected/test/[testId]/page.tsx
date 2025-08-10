"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { TestLoading } from '@/components/loading';
import type { TestWithQuestions, UserTestAttempt, Question } from '@/lib/types';

type AnswerValue = string | string[] | number;

const TestInterface = () => {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const testId = params.testId as string;
    const attemptId = searchParams.get('attempt');

    const [test, setTest] = useState<TestWithQuestions | null>(null);
    const [attempt, setAttempt] = useState<UserTestAttempt | null>(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswers, setSelectedAnswers] = useState<Record<number, AnswerValue>>({});
    const [markedForReview, setMarkedForReview] = useState<Set<number>>(new Set());
    const [timeRemaining, setTimeRemaining] = useState(0);
    const [loading, setLoading] = useState(true);
    const [loadingStage, setLoadingStage] = useState<'initializing' | 'loading-test' | 'loading-questions' | 'preparing-interface' | 'ready'>('initializing');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [questionPanelOpen, setQuestionPanelOpen] = useState(false);

    useEffect(() => {
        const loadTestData = async () => {
            try {
                setLoadingStage('initializing');
                await new Promise(resolve => setTimeout(resolve, 500)); // Show initializing stage
                
                setLoadingStage('loading-test');
                const response = await fetch('/api/tests/start', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ testId }),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to load test');
                }

                setLoadingStage('loading-questions');
                const data = await response.json();
                
                setLoadingStage('preparing-interface');
                await new Promise(resolve => setTimeout(resolve, 300)); // Show preparing stage
                
                setTest(data.test);
                setAttempt(data.attempt);
                setSelectedAnswers(data.attempt.answers || {});

                // Calculate time remaining
                const startTime = new Date(data.attempt.created_at).getTime();
                const durationMs = data.test.duration_minutes * 60 * 1000;
                const elapsed = Date.now() - startTime;
                const remaining = Math.max(0, durationMs - elapsed);
                setTimeRemaining(Math.floor(remaining / 1000));

                setLoadingStage('ready');
                await new Promise(resolve => setTimeout(resolve, 500)); // Show ready stage
                setLoading(false);
            } catch (error) {
                console.error('Error loading test:', error);
                setError(error instanceof Error ? error.message : 'Failed to load test');
                setLoading(false);
            }
        };

        if (testId) {
            loadTestData();
        }
    }, [testId]);

    const handleCompleteTest = useCallback(async () => {
        if (!attemptId || isSubmitting) return;

        setIsSubmitting(true);
        try {
            const response = await fetch('/api/tests/complete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ attemptId }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to complete test');
            }

            router.push(`/protected/test/${testId}/result?attemptId=${attemptId}`);
        } catch (error) {
            console.error('Error completing test:', error);
            setError(error instanceof Error ? error.message : 'Failed to complete test');
        } finally {
            setIsSubmitting(false);
        }
    }, [attemptId, isSubmitting, router, testId]);

    useEffect(() => {
        if (timeRemaining <= 0) return;

        const timer = setInterval(() => {
            setTimeRemaining(prev => {
                if (prev <= 1) {
                    handleCompleteTest();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [timeRemaining, handleCompleteTest]);

    const handleAnswerSelect = async (questionId: number, answer: AnswerValue, questionType: string) => {
        if (!attemptId) return;

        setSelectedAnswers(prev => ({
            ...prev,
            [questionId]: answer
        }));

        try {
            await fetch('/api/tests/submit-answer', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    attemptId,
                    questionId,
                    answer,
                    questionType
                }),
            });
        } catch (error) {
            console.error('Error submitting answer:', error);
        }
    };

    const handleMarkForReview = (questionId: number) => {
        setMarkedForReview(prev => {
            const newSet = new Set(prev);
            if (newSet.has(questionId)) {
                newSet.delete(questionId);
            } else {
                newSet.add(questionId);
            }
            return newSet;
        });
    };
    const formatTime = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const getQuestionStatus = (questionId: number) => {
        const isAnswered = selectedAnswers[questionId] !== undefined;
        const isMarked = markedForReview.has(questionId);
        
        if (isAnswered && isMarked) return 'answered-marked';
        if (isAnswered) return 'answered';
        if (isMarked) return 'marked';
        return 'not-attempted';
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'answered': return 'bg-green-600';
            case 'marked': return 'bg-purple-600';
            case 'answered-marked': return 'bg-blue-600';
            default: return 'bg-gray-600';
        }
    };

    const renderQuestion = (question: Question) => {
        switch (question.question_type) {
            case 'MCQ':
                return renderMCQ(question);
            case 'MSQ':
                return renderMSQ(question);
            case 'NAT':
                return renderNAT(question);
            default:
                return null;
        }
    };

    const renderMCQ = (question: Question) => (
        <div className="space-y-4">
            {question.options?.map((option, index) => (
                <label
                    key={index}
                    className={`flex items-center p-3 rounded border cursor-pointer transition-colors ${
                        selectedAnswers[question.id] === option
                            ? 'border-blue-500 bg-blue-500/10'
                            : 'border-gray-600 hover:border-gray-500'
                    }`}
                >
                    <input
                        type="radio"
                        name={`question-${question.id}`}
                        value={option}
                        checked={selectedAnswers[question.id] === option}
                        onChange={(e) => handleAnswerSelect(question.id, e.target.value, 'MCQ')}
                        className="mr-3 w-4 h-4"
                    />
                    <span className="text-sm">{String.fromCharCode(65 + index)}. {option}</span>
                </label>
            ))}
        </div>
    );

    const renderMSQ = (question: Question) => {
        const currentAnswers = (selectedAnswers[question.id] as string[]) || [];
        
        return (
            <div className="space-y-4">
                <p className="text-sm text-yellow-400 mb-2">
                    ⚠️ Multiple Select Question - Select all correct options
                </p>
                {question.options?.map((option, index) => (
                    <label
                        key={index}
                        className={`flex items-center p-3 rounded border cursor-pointer transition-colors ${
                            currentAnswers.includes(option)
                                ? 'border-blue-500 bg-blue-500/10'
                                : 'border-gray-600 hover:border-gray-500'
                        }`}
                    >
                        <input
                            type="checkbox"
                            value={option}
                            checked={currentAnswers.includes(option)}
                            onChange={(e) => {
                                const newAnswers = e.target.checked
                                    ? [...currentAnswers, option]
                                    : currentAnswers.filter((a: string) => a !== option);
                                handleAnswerSelect(question.id, newAnswers, 'MSQ');
                            }}
                            className="mr-3 w-4 h-4"
                        />
                        <span className="text-sm">{String.fromCharCode(65 + index)}. {option}</span>
                    </label>
                ))}
            </div>
        );
    };

    const renderNAT = (question: Question) => (
        <div className="space-y-4">
            <p className="text-sm text-green-400 mb-2">
                📝 Numerical Answer Type - Enter your answer as a number
            </p>
            <div className="flex items-center space-x-4">
                <label className="text-sm font-medium">Answer:</label>
                <input
                    type="number"
                    step="any"
                    value={selectedAnswers[question.id] || ''}
                    onChange={(e) => handleAnswerSelect(question.id, e.target.value, 'NAT')}
                    className="px-3 py-2 bg-gray-800 border border-gray-600 rounded focus:border-blue-500 focus:outline-none w-32"
                    placeholder="Enter number"
                />
            </div>
        </div>
    );

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <TestLoading stage={loadingStage} />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="max-w-md mx-auto p-6 bg-card rounded-lg border shadow-lg text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-semibold mb-2 text-foreground">Failed to Load Test</h3>
                    <p className="text-muted-foreground mb-4">{error}</p>
                    <button 
                        onClick={() => router.push('/protected/dash')}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    if (!test || !attempt) {
        return (
            <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
                <p>Test not found</p>
            </div>
        );
    }

    const currentQuestion = test.questionDetails[currentQuestionIndex];
    const answeredCount = Object.keys(selectedAnswers).length;
    const markedCount = markedForReview.size;

    return (
        <div className="min-h-screen bg-gray-900 text-white flex">
            {/* Main Content */}
            <div className="flex-1 flex flex-col">
                {/* Header */}
                <div className="bg-gray-800 border-b border-gray-700 p-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-lg font-bold">{test.title}</h1>
                            <p className="text-sm text-gray-400">
                                Question {currentQuestionIndex + 1} of {test.questionDetails.length}
                            </p>
                        </div>
                        <div className="flex items-center space-x-6">
                            <div className="text-center">
                                <div className="text-2xl font-mono text-red-400">
                                    {formatTime(timeRemaining)}
                                </div>
                                <p className="text-xs text-gray-400">Time Left</p>
                            </div>
                            <button
                                onClick={() => setQuestionPanelOpen(!questionPanelOpen)}
                                className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 text-sm"
                            >
                                Question Panel
                            </button>
                        </div>
                    </div>
                </div>

                {/* Question Content */}
                <div className="flex-1 p-6 overflow-y-auto">
                    <div className="max-w-4xl mx-auto">
                        {/* Question Header */}
                        <div className="bg-gray-800 rounded-lg p-4 mb-6">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center space-x-4">
                                    <span className={`px-3 py-1 rounded text-sm font-medium ${
                                        currentQuestion.question_type === 'MCQ' ? 'bg-blue-600' :
                                        currentQuestion.question_type === 'MSQ' ? 'bg-purple-600' :
                                        'bg-green-600'
                                    }`}>
                                        {currentQuestion.question_type}
                                    </span>
                                    <span className="text-sm text-muted-foreground">
                                        Question {currentQuestionIndex + 1} of {test.questions?.length || 0}
                                    </span>
                                    <span className="text-xs px-2 py-1 rounded bg-blue-700">
                                        Standard
                                    </span>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm">
                                        <span className="text-green-400">+{currentQuestion.marks}</span>
                                        {currentQuestion.negative_marks > 0 && (
                                            <span className="text-red-400 ml-2">-{currentQuestion.negative_marks}</span>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-400">Marks</p>
                                </div>
                            </div>
                            
                            <h2 className="text-lg font-medium mb-4">
                                Q{currentQuestionIndex + 1}. {currentQuestion.question}
                            </h2>
                            
                            {renderQuestion(currentQuestion)}
                        </div>

                        {/* Navigation */}
                        <div className="flex justify-between items-center">
                            <div className="flex space-x-2">
                                <button
                                    onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                                    disabled={currentQuestionIndex === 0}
                                    className="px-4 py-2 bg-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => handleMarkForReview(currentQuestion.id)}
                                    className={`px-4 py-2 rounded ${
                                        markedForReview.has(currentQuestion.id)
                                            ? 'bg-purple-600 hover:bg-purple-700'
                                            : 'bg-gray-700 hover:bg-gray-600'
                                    }`}
                                >
                                    {markedForReview.has(currentQuestion.id) ? 'Unmark' : 'Mark for Review'}
                                </button>
                            </div>

                            <div className="flex space-x-2">
                                {currentQuestionIndex === test.questionDetails.length - 1 ? (
                                    <button
                                        onClick={handleCompleteTest}
                                        disabled={isSubmitting}
                                        className="px-6 py-2 bg-red-600 rounded hover:bg-red-700 disabled:opacity-50 font-medium"
                                    >
                                        {isSubmitting ? 'Submitting...' : 'Submit Test'}
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => setCurrentQuestionIndex(prev => Math.min(test.questionDetails.length - 1, prev + 1))}
                                        className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
                                    >
                                        Next
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Question Panel */}
            {questionPanelOpen && (
                <div className="w-80 bg-gray-800 border-l border-gray-700 p-4">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold">Question Panel</h3>
                        <button
                            onClick={() => setQuestionPanelOpen(false)}
                            className="text-gray-400 hover:text-white"
                        >
                            ✕
                        </button>
                    </div>
                    
                    {/* Status Summary */}
                    <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
                        <div className="bg-gray-700 p-2 rounded text-center">
                            <div className="font-semibold">{answeredCount}</div>
                            <div className="text-gray-400">Answered</div>
                        </div>
                        <div className="bg-gray-700 p-2 rounded text-center">
                            <div className="font-semibold">{markedCount}</div>
                            <div className="text-gray-400">Marked</div>
                        </div>
                    </div>

                    {/* Legend */}
                    <div className="mb-4 text-xs space-y-1">
                        <div className="flex items-center space-x-2">
                            <div className="w-4 h-4 bg-green-600 rounded"></div>
                            <span>Answered</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <div className="w-4 h-4 bg-purple-600 rounded"></div>
                            <span>Marked for Review</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <div className="w-4 h-4 bg-blue-600 rounded"></div>
                            <span>Answered & Marked</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <div className="w-4 h-4 bg-gray-600 rounded"></div>
                            <span>Not Attempted</span>
                        </div>
                    </div>

                    {/* Question Grid */}
                    <div className="grid grid-cols-5 gap-2">
                        {test.questionDetails.map((q, index) => {
                            const status = getQuestionStatus(q.id);
                            return (
                                <button
                                    key={q.id}
                                    onClick={() => setCurrentQuestionIndex(index)}
                                    className={`w-10 h-10 rounded text-sm font-medium transition-colors ${
                                        index === currentQuestionIndex
                                            ? 'ring-2 ring-white'
                                            : ''
                                    } ${getStatusColor(status)}`}
                                >
                                    {index + 1}
                                </button>
                            );
                        })}
                    </div>

                    {/* Complete Test Button */}
                    <button
                        onClick={handleCompleteTest}
                        disabled={isSubmitting}
                        className="w-full mt-6 px-4 py-2 bg-red-600 rounded hover:bg-red-700 disabled:opacity-50 font-medium"
                    >
                        {isSubmitting ? 'Submitting...' : 'Submit Test'}
                    </button>
                </div>
            )}
        </div>
    );
};

export default TestInterface;
