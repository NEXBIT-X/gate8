"use client";
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { TestLoading } from '@/components/loading';
import { useTestSecurity } from '@/lib/test-security';
import EnterFullscreenOverlay from '@/components/enter-fullscreen-overlay';
import SecurityViolationOverlay from '@/components/security-violation-overlay';
import { SmartTextRenderer } from '@/components/latex-renderer';
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
    const [questionPanelOpen, setQuestionPanelOpen] = useState(true);
    const [visitedQuestions, setVisitedQuestions] = useState<Set<number>>(new Set());
    const [showMobilePalette, setShowMobilePalette] = useState(false);

    // Handle test completion
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

            // Exit fullscreen and redirect to dashboard
            try {
                await exitFullscreen();
            } catch (e) {
                console.warn('Failed to exit fullscreen after submit:', e);
            }
            router.push('/protected/dash');
        } catch (error) {
            console.error('Error completing test:', error);
            setError(error instanceof Error ? error.message : 'Failed to complete test');
        } finally {
            setIsSubmitting(false);
        }
    }, [attemptId, isSubmitting, router]);

    // Initialize security system
    const {
        state: securityState,
        initializeTest,
        enterFullscreen,
        exitFullscreen,
        handleViolationCancel,
        handleViolationEndTest
    } = useTestSecurity(handleCompleteTest);

    // Auto-show fullscreen overlay when test is ready
    useEffect(() => {
        console.log('LoadingStage changed to:', loadingStage);
        if (loadingStage === 'ready') {
            console.log('Test is ready, initializing security system...');
            initializeTest();
        }
    }, [loadingStage, initializeTest]);

    useEffect(() => {
        const loadTestData = async () => {
            try {
                setLoadingStage('initializing');
                await new Promise(resolve => setTimeout(resolve, 500)); // Show initializing stage
                
                setLoadingStage('loading-test');
                
                // If we have an attemptId parameter, we're continuing an existing test
                // Otherwise, try to load existing session first, then start new if needed
                let response;
                
                if (attemptId) {
                    // Load existing test session
                    response = await fetch(`/api/tests/session/${testId}`);
                } else {
                    // First try to load existing session
                    response = await fetch(`/api/tests/session/${testId}`);
                    
                    if (!response.ok) {
                        const sessionError = await response.json().catch(() => ({}));
                        
                        // If no existing session found, try to start a new test
                        if (sessionError.requiresStart) {
                            console.log('No existing session found, starting new test...');
                            response = await fetch('/api/tests/start', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({ testId }),
                            });
                        }
                    }
                }

                console.log('API Response status:', response.status);
                console.log('API Response ok:', response.ok);

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    console.error('API Error Response:', errorData);
                    throw new Error(errorData.error || errorData.details || `HTTP ${response.status}: Request failed`);
                }

                setLoadingStage('loading-questions');
                const data = await response.json();
                
                console.log('API Response data:', data);
                console.log('Test questions from API:', data.test?.questions);
                
                setLoadingStage('preparing-interface');
                await new Promise(resolve => setTimeout(resolve, 300)); // Show preparing stage
                
                // Ensure questions are properly structured
                const testData = {
                    ...data.test,
                    questionDetails: data.test.questions || []
                };
                
                console.log('Test data after processing:', testData);
                console.log('Question details count:', testData.questionDetails?.length);
                
                setTest(testData);
                setAttempt(data.attempt);
                setSelectedAnswers(data.attempt.answers || {});

                // Calculate time remaining
                const startTime = new Date(data.attempt.started_at || data.attempt.created_at).getTime();
                const durationMs = data.test.duration_minutes * 60 * 1000;
                const elapsed = Date.now() - startTime;
                const remaining = Math.max(0, durationMs - elapsed);
                setTimeRemaining(Math.floor(remaining / 1000));

                console.log('Time calculation:', {
                    startTime: data.attempt.started_at || data.attempt.created_at,
                    durationMinutes: data.test.duration_minutes,
                    elapsed: elapsed,
                    remaining: remaining
                });

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

    const clearResponse = (questionId: number) => {
        setSelectedAnswers(prev => {
            const clone = { ...prev };
            delete clone[questionId];
            return clone;
        });
        // Optionally send blank answer to server (ignored for now)
    };

    // Track visited questions
    useEffect(() => {
        if (test?.questionDetails?.[currentQuestionIndex]) {
            const questionId = test.questionDetails[currentQuestionIndex].id;
            setVisitedQuestions(prev => {
                if (prev.has(questionId)) return prev;
                const newSet = new Set(prev);
                newSet.add(questionId);
                return newSet;
            });
        }
    }, [currentQuestionIndex, test]);
    const formatTime = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const getQuestionStatus = (questionId: number) => {
        const isVisited = visitedQuestions.has(questionId);
        const isAnswered = selectedAnswers[questionId] !== undefined;
        const isMarked = markedForReview.has(questionId);
        if (!isVisited) return 'not-visited';
        if (isAnswered && isMarked) return 'answered-marked';
        if (isAnswered) return 'answered';
        if (isMarked) return 'marked';
        return 'not-answered';
    };

    const statusStyles: Record<string, string> = {
        'answered': 'bg-green-600',
        'marked': 'bg-purple-600',
        'answered-marked': 'bg-blue-600',
        'not-answered': 'bg-red-600',
        'not-visited': 'bg-gray-600'
    };

    const statusLabelCounts = () => {
        let answered = 0, marked = 0, answeredMarked = 0, notAnswered = 0, notVisited = 0;
        test?.questionDetails?.forEach(q => {
            const st = getQuestionStatus(q.id);
            switch (st) {
                case 'answered': answered++; break;
                case 'marked': marked++; break;
                case 'answered-marked': answeredMarked++; break;
                case 'not-answered': notAnswered++; break;
                case 'not-visited': notVisited++; break;
            }
        });
        return { answered, marked, answeredMarked, notAnswered, notVisited };
    };

    // Render text with LaTeX and code block support
    const renderQuestionText = (text?: string | null) => {
        if (!text) return null;
        return <SmartTextRenderer content={text} className="whitespace-pre-line" />;
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
                    className={`flex items-start p-3 rounded border cursor-pointer transition-colors ${
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
                        className="mr-3 w-4 h-4 mt-1 flex-shrink-0 select-auto"
                        style={{userSelect: 'auto', WebkitUserSelect: 'auto', MozUserSelect: 'auto'} as React.CSSProperties}
                    />
                    <div className="text-sm flex select-none" style={{userSelect: 'none', WebkitUserSelect: 'none', MozUserSelect: 'none'} as React.CSSProperties}>
                        <span className="mr-2">{String.fromCharCode(65 + index)}.</span>
                        {renderQuestionText(option)}
                    </div>
                </label>
            ))}
        </div>
    );

    const renderMSQ = (question: Question) => {
        const currentAnswers = (selectedAnswers[question.id] as string[]) || [];
        
        return (
            <div className="space-y-4">
                <p className="text-sm text-yellow-400 mb-2 select-none" style={{userSelect: 'none', WebkitUserSelect: 'none', MozUserSelect: 'none'} as React.CSSProperties}>
                    ⚠️ Multiple Select Question - Select all correct options
                </p>
                {question.options?.map((option, index) => (
                    <label
                        key={index}
                        className={`flex items-start p-3 rounded border cursor-pointer transition-colors ${
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
                            className="mr-3 w-4 h-4 mt-1 flex-shrink-0 select-auto"
                            style={{userSelect: 'auto', WebkitUserSelect: 'auto', MozUserSelect: 'auto'} as React.CSSProperties}
                        />
                        <div className="text-sm flex select-none" style={{userSelect: 'none', WebkitUserSelect: 'none', MozUserSelect: 'none'} as React.CSSProperties}>
                            <span className="mr-2">{String.fromCharCode(65 + index)}.</span>
                            {renderQuestionText(option)}
                        </div>
                    </label>
                ))}
            </div>
        );
    };

    const renderNAT = (question: Question) => (
        <div className="space-y-4">
            <p className="text-sm text-green-400 mb-2 select-none" style={{userSelect: 'none', WebkitUserSelect: 'none', MozUserSelect: 'none'} as React.CSSProperties}>
                📝 Numerical Answer Type - Enter your answer as a number
            </p>
            <div className="flex items-center space-x-4">
                <label className="text-sm font-medium select-none" style={{userSelect: 'none', WebkitUserSelect: 'none', MozUserSelect: 'none'} as React.CSSProperties}>Answer:</label>
                <input
                    type="number"
                    step="any"
                    value={selectedAnswers[question.id] || ''}
                    onChange={(e) => handleAnswerSelect(question.id, e.target.value, 'NAT')}
                    className="px-3 py-2 card border border-gray-600 rounded focus:border-blue-500 focus:outline-none w-32 select-auto"
                    style={{userSelect: 'auto', WebkitUserSelect: 'auto', MozUserSelect: 'auto'} as React.CSSProperties}
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
                        className="px-4 py-2 bg-blue-600  rounded hover:bg-blue-700 transition-colors"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    if (!test || !attempt || !test.questionDetails || test.questionDetails.length === 0) {
        console.log('Test validation failed:', {
            hasTest: !!test,
            hasAttempt: !!attempt,
            hasQuestionDetails: !!test?.questionDetails,
            questionCount: test?.questionDetails?.length || 0,
            testData: test,
            questionDetails: test?.questionDetails
        });
        
        return (
            <div className="min-h-screen card border-border flex items-center justify-center">
                <div className="max-w-md mx-auto p-6 card rounded-lg border border-gray-700 shadow-lg text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-red-900/30 rounded-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-semibold mb-2 ">Test Loading Issue</h3>
                    <p className="text-gray-300 mb-4">
                        {!test ? 'Test data not loaded' : 
                         !attempt ? 'Test attempt not created' :
                         !test.questionDetails ? 'Questions not structured properly' :
                         test.questionDetails.length === 0 ? 'No questions found for this test' :
                         'Unknown issue'}
                    </p>
                    <p className="text-sm text-gray-400 mb-4">
                        Debug: Test={!!test}, Attempt={!!attempt}, Questions={test?.questionDetails?.length || 0}
                    </p>
                    <button 
                        onClick={() => router.push('/protected/dash')}
                        className="px-4 py-2 bg-blue-600  rounded hover:bg-blue-700 transition-colors"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    const currentQuestion = test.questionDetails[currentQuestionIndex];
    if (!currentQuestion) {
        return (
            <div className="min-h-screen card border-border flex items-center justify-center">
                <p>Question not found</p>
            </div>
        );
    }
    const answeredCount = Object.keys(selectedAnswers).length;
    const markedCount = markedForReview.size;
    const counts = statusLabelCounts();

    return (
        <>
            {/* Enter Fullscreen Overlay */}
            <EnterFullscreenOverlay
                isOpen={securityState.showEnterFullscreenOverlay}
                onEnterFullscreen={enterFullscreen}
                testTitle={test?.title || "Test"}
            />

            {/* Security Violation Overlay */}
            <SecurityViolationOverlay
                isOpen={securityState.showViolationOverlay}
                onCancel={handleViolationCancel}
                onEndTest={handleViolationEndTest}
            />

            <div className="min-h-screen card border-border flex flex-col lg:flex-row bg-background">
                {/* Main Panel */}
                <div className="flex-1 flex flex-col border-b lg:border-b-0 lg:border-r border-border min-w-0 card bg-card">
                    {/* Top Bar mimicking GATE */}
                    <div className="card border-b border-border px-4 py-2 flex items-center justify-between text-xs gap-4 bg-card">
                        <div className="flex items-center gap-4">
                            <span className="px-2 py-1 bg-blue-600 rounded font-semibold text-white">Section 1</span>
                            <div className="hidden md:flex items-center gap-4">
                                <span>Question Type: <strong>{currentQuestion.question_type}</strong></span>
                                <span>Marks: <span className="">+{currentQuestion.marks}</span>{currentQuestion.negative_marks > 0 && <span> / -{currentQuestion.negative_marks}</span>}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-8">
                            <button
                                onClick={() => setShowMobilePalette(true)}
                                className="lg:hidden px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 border border-border"
                            >Palette</button>
                            <div className="text-right">
                                <div className="font-mono text-lg">{formatTime(timeRemaining)}</div>
                                <div className="text-[10px]">Time Left</div>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                                {/* Fullscreen Status Indicator */}
                                <div className={`w-2 h-2 rounded-full ${securityState.isFullscreen ? 'bg-green-500' : 'bg-red-500'}`}
                                     title={securityState.isFullscreen ? 'Fullscreen Active' : 'Fullscreen Inactive'}></div>
                                <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center font-semibold">U</div>
                                <div className="hidden sm:block text-right leading-tight">
                                    <div className="font-medium">Candidate</div>
                                    <div>Practice</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Question Body */}
                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 select-none card bg-card">
                        <div className="max-w-none">
                            <h2 className="font-semibold mb-4 text-sm">Question No. {currentQuestionIndex + 1}</h2>
                            <div className="mb-6 text-sm leading-relaxed">
                                {renderQuestionText(currentQuestion.question)}
                            </div>
                            <div>
                                {renderQuestion(currentQuestion)}
                            </div>
                        </div>
                    </div>

                    {/* Bottom Action Bar */}
                    <div className="card border-t border-border p-3 flex flex-wrap gap-2 justify-between sticky bottom-0 bg-card">
                        <div className="flex flex-wrap gap-2 text-xs">
                            <button
                                onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                                disabled={currentQuestionIndex === 0}
                                className="px-3 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 rounded"
                            >Previous</button>
                            <button
                                onClick={() => {
                                    setCurrentQuestionIndex(i => Math.min(test.questionDetails.length - 1, i + 1));
                                }}
                                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded"
                            >Save & Next</button>
                            <button
                                onClick={() => {
                                    handleMarkForReview(currentQuestion.id);
                                    setCurrentQuestionIndex(i => Math.min(test.questionDetails.length - 1, i + 1));
                                }}
                                className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded"
                            >Mark for Review & Next</button>
                            <button
                                onClick={() => {
                                    handleMarkForReview(currentQuestion.id);
                                    setCurrentQuestionIndex(i => Math.min(test.questionDetails.length - 1, i + 1));
                                }}
                                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
                            >Save & Mark for Review & Next</button>
                            <button
                                onClick={() => clearResponse(currentQuestion.id)}
                                className="px-3 py-2 bg-yellow-400 dark:bg-yellow-600 hover:bg-yellow-500 dark:hover:bg-yellow-700 rounded font-medium"
                            >Clear Response</button>
                        </div>
                        <div>
                            {currentQuestionIndex === test.questionDetails.length - 1 && (
                                <button
                                    onClick={handleCompleteTest}
                                    disabled={isSubmitting}
                                    className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-semibold disabled:opacity-50"
                                >{isSubmitting ? 'Submitting...' : 'Submit'}</button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Palette Panel (desktop) */}
                <div className="hidden lg:flex w-80 card flex-col bg-card">
                    <div className="p-4 border-b border-border space-y-3 text-xs">
                        <h3 className="font-semibold tracking-wide text-xs">Question Palette</h3>
                        <div className="grid grid-cols-5 gap-2">
                            {test.questionDetails.map((q, index) => {
                                const status = getQuestionStatus(q.id);
                                return (
                                    <button
                                        key={q.id}
                                        onClick={() => setCurrentQuestionIndex(index)}
                                        className={`h-9 rounded text-xs font-semibold flex items-center justify-center transition-colors border border-border ${index === currentQuestionIndex ? 'ring-2 ring-blue-500' : ''} ${statusStyles[status]}`}
                                    >{index + 1}</button>
                                );
                            })}
                        </div>
                    </div>
                    <div className="p-4 border-b border-border text-xs space-y-2">
                        <h4 className="font-semibold">Legend</h4>
                        <div className="grid grid-cols-2 gap-2">
                            <Legend color={statusStyles['answered']} label={`Answered (${counts.answered})`} />
                            <Legend color={statusStyles['not-answered']} label={`Not Answered (${counts.notAnswered})`} />
                            <Legend color={statusStyles['marked']} label={`Marked (${counts.marked})`} />
                            <Legend color={statusStyles['answered-marked']} label={`Answered & Marked (${counts.answeredMarked})`} />
                            <Legend color={statusStyles['not-visited']} label={`Not Visited (${counts.notVisited})`} />
                        </div>
                    </div>
                    <div className="mt-auto p-4 text-center text-[10px]">GATE Style Mock Interface</div>
                </div>
                {/* Mobile Palette Overlay */}
                {showMobilePalette && (
                    <div className="lg:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex">
                        <div className="ml-auto w-full max-w-sm card h-full flex flex-col bg-card">
                            <div className="p-4 border-b border-border flex items-center justify-between text-xs">
                                <h3 className="font-semibold">Question Palette</h3>
                                <button onClick={()=>setShowMobilePalette(false)} className="px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600">Close</button>
                            </div>
                            <div className="p-4 space-y-4 overflow-y-auto">
                                <div className="grid grid-cols-6 gap-2">
                                    {test.questionDetails.map((q, index) => {
                                        const status = getQuestionStatus(q.id);
                                        return (
                                            <button
                                                key={q.id}
                                                onClick={() => { setCurrentQuestionIndex(index); setShowMobilePalette(false); }}
                                                className={`h-9 rounded text-xs font-semibold flex items-center justify-center transition-colors border border-border ${index === currentQuestionIndex ? 'ring-2 ring-blue-500' : ''} ${statusStyles[status]}`}
                                            >{index + 1}</button>
                                        );
                                    })}
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <Legend color={statusStyles['answered']} label={`Answered (${counts.answered})`} />
                                    <Legend color={statusStyles['not-answered']} label={`Not Answered (${counts.notAnswered})`} />
                                    <Legend color={statusStyles['marked']} label={`Marked (${counts.marked})`} />
                                    <Legend color={statusStyles['answered-marked']} label={`Answered & Marked (${counts.answeredMarked})`} />
                                    <Legend color={statusStyles['not-visited']} label={`Not Visited (${counts.notVisited})`} />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

// Legend helper component
const Legend = ({ color, label }: { color: string; label: string }) => (
    <div className="flex items-center gap-2">
        <div className={`w-4 h-4 rounded ${color}`}></div>
        <span>{label}</span>
    </div>
);

export default TestInterface;
