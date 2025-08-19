"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { TestLoading } from '@/components/loading';
import { useFullscreenManager } from '@/lib/fullscreen-manager';
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
    const [questionPanelOpen, setQuestionPanelOpen] = useState(true); // desktop always open
    const [visitedQuestions, setVisitedQuestions] = useState<Set<number>>(new Set());
    const [showMobilePalette, setShowMobilePalette] = useState(false);
    const [showExitWarning, setShowExitWarning] = useState(false);
    const [showBlockedWarning, setShowBlockedWarning] = useState(false);
    const [showFullscreenNotice, setShowFullscreenNotice] = useState(false);

    // Fullscreen management
    // We use a ref to hold the setter so the onExitAttempt callback (passed into the hook)
    // can call it even though the setter is returned by the hook after invocation.
    const setExitAttemptsRef = React.useRef<(count: number) => void>(() => {});
    const { state: fullscreenState, enterFullscreen, resetExitAttempts, setExitAttempts } = useFullscreenManager(
        3, // Max 3 exit attempts
        (attempts, maxAttempts) => {
                console.log(`Fullscreen exit attempt ${attempts}/${maxAttempts}`);
                setShowExitWarning(true);
                setTimeout(() => setShowExitWarning(false), 3000);

                // Persist exit attempt to server so it is durable for the attempt
                (async () => {
                    try {
                        if (attemptId) {
                            const res = await fetch('/api/tests/record-exit', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ attemptId })
                            });

                            if (res.ok) {
                                const json = await res.json().catch(() => ({}));
                                const newCount = typeof json.exitAttempts === 'number' ? json.exitAttempts : attempts;
                                // update local manager state
                                try { setExitAttemptsRef.current(newCount); } catch (_) {}
                            }
                        }
                    } catch (e) {
                        console.warn('Failed to record exit attempt:', e);
                    }
                })();
            },
        () => {
            console.log('Test blocked due to too many fullscreen exits');
            setShowBlockedWarning(true);
            // Auto-submit test when blocked
            setTimeout(() => {
                handleCompleteTest();
            }, 5000);
        }
    );

    // Wire the returned setter into the ref so the onExitAttempt callback can call it
    React.useEffect(() => {
        if (setExitAttempts) setExitAttemptsRef.current = setExitAttempts;
    }, [setExitAttempts]);

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
                
                // Enter fullscreen when test is ready
                try {
                    await enterFullscreen();
                    console.log('Entered fullscreen mode for test');
                    // Show a short-lived notice informing user about remaining "backs"
                    setShowFullscreenNotice(true);
                    setTimeout(() => setShowFullscreenNotice(false), 5000);
                } catch (fullscreenError) {
                    console.warn('Could not enter fullscreen:', fullscreenError);
                }
                
                // If the attempt has a persisted exit count, initialize the fullscreen manager with it
                try {
                    const attemptsCount = data.attempt?.answers?._exit_attempts;
                    if (typeof attemptsCount === 'number' && setExitAttempts) {
                        setExitAttempts(attemptsCount);
                    }
                } catch (e) {
                    // ignore
                }

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

            // Redirect to dashboard instead of test results
            router.push('/protected/dash');
        } catch (error) {
            console.error('Error completing test:', error);
            setError(error instanceof Error ? error.message : 'Failed to complete test');
        } finally {
            setIsSubmitting(false);
        }
    }, [attemptId, isSubmitting, router]);

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

    // Render text with fenced-code support: code blocks are shown in monospace pre tags
    const renderQuestionText = (text?: string | null) => {
        if (!text) return null;
        const normalized = text.replace(/\t/g, '    ');
        const nodes: React.ReactNode[] = [];
        const regex = /```(?:([\w+-]+)\n)?([\s\S]*?)```/g;
        let lastIndex = 0;
        let match: RegExpExecArray | null;
        while ((match = regex.exec(normalized)) !== null) {
            const idx = match.index;
            if (idx > lastIndex) {
                const before = normalized.slice(lastIndex, idx);
                // render normal text as lines with <br/>
                nodes.push(
                    <div key={`t-${lastIndex}`} className="whitespace-pre-line mb-2">{
                        before.split(/\n/).map((line, i) => <span key={i}>{line}<br/></span>)
                    }</div>
                );
            }
            const lang = match[1];
            const code = match[2] || '';
            // Render code block inside a div.code with explicit <br/> per line
            nodes.push(
                <div key={`c-${idx}`} className="code bg-gray-800/10 dark:bg-gray-900/40 p-3 rounded font-mono text-sm overflow-auto mb-2">
                    {lang && <div className="text-xs text-blue-300 mb-1">{lang.toUpperCase()}</div>}
                    <div>{code.split(/\n/).map((line, i) => <div key={i}>{line}<br/></div>)}</div>
                </div>
            );
            lastIndex = regex.lastIndex;
        }
        if (lastIndex < normalized.length) {
            const rest = normalized.slice(lastIndex);
            nodes.push(
                <div key={`r-${lastIndex}`} className="whitespace-pre-line">{
                    rest.split(/\n/).map((line, i) => <span key={i}>{line}<br/></span>)
                }</div>
            );
        }
        return <div>{nodes}</div>;
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
            <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
                <div className="max-w-md mx-auto p-6 bg-gray-800 rounded-lg border border-gray-700 shadow-lg text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-red-900/30 rounded-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-semibold mb-2 text-white">Test Loading Issue</h3>
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
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
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
            <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
                <p>Question not found</p>
            </div>
        );
    }
    const answeredCount = Object.keys(selectedAnswers).length;
    const markedCount = markedForReview.size;
    const counts = statusLabelCounts();

    return (
        <>
            {/* Fullscreen Exit Warning */}
            {showExitWarning && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center">
                    <div className="bg-red-600 text-white p-6 rounded-lg max-w-md mx-4 text-center">
                        <div className="text-2xl mb-4">⚠️ Warning!</div>
                        <h3 className="text-lg font-bold mb-2">Fullscreen Exit Detected</h3>
                        <p className="mb-4">
                            You have attempted to exit fullscreen mode. 
                            Attempts: {fullscreenState.exitAttempts}/{fullscreenState.maxExitAttempts}
                        </p>
                        <p className="text-sm">
                            {fullscreenState.maxExitAttempts - fullscreenState.exitAttempts} more attempts remaining before test is auto-submitted.
                        </p>
                    </div>
                </div>
            )}

            {/* Test Blocked Warning */}
            {showBlockedWarning && (
                <div className="fixed inset-0 z-50 bg-red-900/90 backdrop-blur-sm flex items-center justify-center">
                    <div className="bg-red-700 text-white p-8 rounded-lg max-w-lg mx-4 text-center">
                        <div className="text-3xl mb-4">🚫 Test Blocked</div>
                        <h3 className="text-xl font-bold mb-4">Too Many Fullscreen Exits</h3>
                        <p className="mb-4">
                            You have exceeded the maximum allowed fullscreen exit attempts ({fullscreenState.maxExitAttempts}).
                        </p>
                        <p className="mb-6 text-red-200">
                            Your test will be automatically submitted in a few seconds for security reasons.
                        </p>
                        <div className="animate-pulse text-lg font-semibold">
                            Auto-submitting test...
                        </div>
                    </div>
                </div>
            )}

            {/* Fullscreen entry notice (short-lived) */}
            {showFullscreenNotice && fullscreenState.isFullscreen && (
                <div className="fixed inset-0 z-50 pointer-events-none flex items-start justify-end p-4">
                    <div className="pointer-events-auto bg-yellow-400 text-black p-3 rounded-lg shadow-lg max-w-sm">
                        <div className="font-semibold">Only {Math.max(0, fullscreenState.maxExitAttempts - fullscreenState.exitAttempts)} backs available</div>
                        <div className="text-xs opacity-90">Exits used: {fullscreenState.exitAttempts}/{fullscreenState.maxExitAttempts}</div>
                    </div>
                </div>
            )}

            {/* Small persistent badge while in fullscreen */}
            {fullscreenState.isFullscreen && !showFullscreenNotice && (
                <div className="fixed top-4 right-4 z-40">
                    <div className="bg-black/60 text-white px-3 py-1 rounded-full text-xs shadow">
                        Backs left: {Math.max(0, fullscreenState.maxExitAttempts - fullscreenState.exitAttempts)}/{fullscreenState.maxExitAttempts}
                    </div>
                </div>
            )}

            <div className="min-h-screen bg-gray-900 text-white flex flex-col lg:flex-row">
            {/* Main Panel */}
            <div className="flex-1 flex flex-col border-b lg:border-b-0 lg:border-r border-gray-800 min-w-0">
                {/* Top Bar mimicking GATE */}
                <div className="bg-gray-800 border-b border-gray-700 px-4 py-2 flex items-center justify-between text-[11px] gap-4">
                    <div className="flex items-center gap-4">
                        <span className="px-2 py-1 bg-blue-600 text-white rounded font-semibold">Section 1</span>
                        <div className="hidden md:flex items-center gap-4 text-gray-300">
                            <span>Question Type: <strong>{currentQuestion.question_type}</strong></span>
                            <span>Marks: <span className="text-green-400">+{currentQuestion.marks}</span>{currentQuestion.negative_marks > 0 && <span className="text-red-400"> / -{currentQuestion.negative_marks}</span>}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-8">
                        <button
                            onClick={() => setShowMobilePalette(true)}
                            className="lg:hidden px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 border border-gray-600"
                        >Palette</button>
                        <div className="text-right">
                            <div className="font-mono text-lg text-red-400">{formatTime(timeRemaining)}</div>
                            <div className="text-[10px] text-gray-400">Time Left</div>
                        </div>
                        <div className="flex items-center gap-2 text-[11px]">
                            {/* Fullscreen Status Indicator */}
                            <div className={`w-2 h-2 rounded-full ${fullscreenState.isFullscreen ? 'bg-green-500' : 'bg-red-500'}`} 
                                 title={fullscreenState.isFullscreen ? 'Fullscreen Active' : 'Fullscreen Inactive'}></div>
                            <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center font-semibold">U</div>
                            <div className="hidden sm:block text-right leading-tight">
                                <div className="font-medium">Candidate</div>
                                <div className="text-gray-400">Practice</div>
                                {fullscreenState.exitAttempts > 0 && (
                                    <div className="text-red-400 text-[9px]">
                                        Exits: {fullscreenState.exitAttempts}/{fullscreenState.maxExitAttempts}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Question Body */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                    <div className="max-w-none">
                        <h2 className="font-semibold mb-4 text-sm">Question No. {currentQuestionIndex + 1}</h2>
                        <div className="mb-6 text-sm leading-relaxed">
                            {renderQuestionText(currentQuestion.question)}
                        </div>
                        {renderQuestion(currentQuestion)}
                    </div>
                </div>

                {/* Bottom Action Bar */}
                <div className="bg-gray-800 border-t border-gray-700 p-3 flex flex-wrap gap-2 justify-between sticky bottom-0">
                    <div className="flex flex-wrap gap-2 text-xs">
                        <button
                            onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                            disabled={currentQuestionIndex === 0}
                            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded"
                        >Previous</button>
                        <button
                            onClick={() => {
                                // Save already done on selection. Just advance.
                                setCurrentQuestionIndex(i => Math.min(test.questionDetails.length - 1, i + 1));
                            }}
                            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 rounded"
                        >Save & Next</button>
                        <button
                            onClick={() => {
                                handleMarkForReview(currentQuestion.id);
                                setCurrentQuestionIndex(i => Math.min(test.questionDetails.length - 1, i + 1));
                            }}
                            className="px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded"
                        >Mark for Review & Next</button>
                        <button
                            onClick={() => {
                                handleMarkForReview(currentQuestion.id);
                                setCurrentQuestionIndex(i => Math.min(test.questionDetails.length - 1, i + 1));
                            }}
                            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded"
                        >Save & Mark for Review & Next</button>
                        <button
                            onClick={() => clearResponse(currentQuestion.id)}
                            className="px-3 py-2 bg-yellow-600 hover:bg-yellow-700 rounded text-black font-medium"
                        >Clear Response</button>
                    </div>
                    <div>
                        {currentQuestionIndex === test.questionDetails.length - 1 && (
                            <button
                                onClick={handleCompleteTest}
                                disabled={isSubmitting}
                                className="px-5 py-2 bg-red-600 hover:bg-red-700 rounded font-semibold disabled:opacity-50"
                            >{isSubmitting ? 'Submitting...' : 'Submit'}</button>
                        )}
                    </div>
                </div>
            </div>

            {/* Right Palette Panel (desktop) */}
            <div className="hidden lg:flex w-80 bg-gray-800 flex-col">
                <div className="p-4 border-b border-gray-700 space-y-3 text-[11px]">
                    <h3 className="font-semibold tracking-wide text-xs">Question Palette</h3>
                    <div className="grid grid-cols-5 gap-2">
                        {test.questionDetails.map((q, index) => {
                            const status = getQuestionStatus(q.id);
                            return (
                                <button
                                    key={q.id}
                                    onClick={() => setCurrentQuestionIndex(index)}
                                    className={`h-9 rounded text-xs font-semibold flex items-center justify-center transition-colors border border-gray-700 ${index === currentQuestionIndex ? 'ring-2 ring-white' : ''} ${statusStyles[status]}`}
                                >{index + 1}</button>
                            );
                        })}
                    </div>
                </div>
                <div className="p-4 border-b border-gray-700 text-[11px] space-y-2">
                    <h4 className="font-semibold">Legend</h4>
                    <div className="grid grid-cols-2 gap-2">
                        <Legend color={statusStyles['answered']} label={`Answered (${counts.answered})`} />
                        <Legend color={statusStyles['not-answered']} label={`Not Answered (${counts.notAnswered})`} />
                        <Legend color={statusStyles['marked']} label={`Marked (${counts.marked})`} />
                        <Legend color={statusStyles['answered-marked']} label={`Answered & Marked (${counts.answeredMarked})`} />
                        <Legend color={statusStyles['not-visited']} label={`Not Visited (${counts.notVisited})`} />
                    </div>
                </div>
                <div className="mt-auto p-4 text-center text-[10px] text-gray-400">GATE Style Mock Interface</div>
            </div>
            {/* Mobile Palette Overlay */}
            {showMobilePalette && (
                <div className="lg:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex">
                    <div className="ml-auto w-full max-w-sm bg-gray-800 h-full flex flex-col">
                        <div className="p-4 border-b border-gray-700 flex items-center justify-between text-xs">
                            <h3 className="font-semibold">Question Palette</h3>
                            <button onClick={()=>setShowMobilePalette(false)} className="px-2 py-1 rounded bg-gray-700 hover:bg-gray-600">Close</button>
                        </div>
                        <div className="p-4 space-y-4 overflow-y-auto">
                            <div className="grid grid-cols-6 gap-2">
                                {test.questionDetails.map((q, index) => {
                                    const status = getQuestionStatus(q.id);
                                    return (
                                        <button
                                            key={q.id}
                                            onClick={() => { setCurrentQuestionIndex(index); setShowMobilePalette(false); }}
                                            className={`h-9 rounded text-xs font-semibold flex items-center justify-center transition-colors border border-gray-700 ${index === currentQuestionIndex ? 'ring-2 ring-white' : ''} ${statusStyles[status]}`}
                                        >{index + 1}</button>
                                    );
                                })}
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-[11px]">
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
