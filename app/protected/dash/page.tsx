// /workspaces/abc/g8/app/protected/dash/page.tsx
"use client";
import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Clock from './widgets/clock';
import { DatabaseLoading, LoadingSpinner } from '@/components/loading';
import TestInstructionsModal from '@/components/test-instructions-modal';
import type { Test, TestWithAttempt, UserTestAttempt } from '@/lib/types';

interface StartTestResponse {
    attempt?: {
        id: string;
    };
    error?: string;
    details?: string;
    raw?: string;
}

interface UserAttempt {
    id: string;
    test_id: string;
    started_at: string;
    submitted_at?: string;
    is_completed: boolean;
    total_score?: number;
    percentage?: number;
    time_taken_seconds?: number;
    test: Test;
}

const DateTime = ({ iso }: { iso: string }) => {
    const stable = new Date(iso).toISOString().replace('T', ' ').replace(/:\d{2}\..+$/, '') + ' UTC';
    const [display, setDisplay] = useState(stable);
    useEffect(() => {
        try { setDisplay(new Date(iso).toLocaleString()); } catch {}
    }, [iso]);
    return <time dateTime={iso} suppressHydrationWarning className="tabular-nums">{display}</time>;
};

const Section = ({ title, items, empty, onStartTest, startingTestId, onViewResult, onContinueTest }: { 
    title: string; 
    items: (Test | TestWithAttempt)[]; 
    empty: string;
    onStartTest?: (testId: string, testName: string) => void;
    startingTestId?: string | null;
    onViewResult?: (attemptId: string) => void;
    onContinueTest?: (testId: string, attemptId: string) => void;
}) => (
    <div className="rounded border p-4 ">
        <h2 className="text-lg font-semibold">{title}</h2>
        <hr />
        {items.length === 0 && <p className="text-sm">{empty}</p>}
        <ul className="space-y-2">
            {items.map(t => (
                <li key={t.id} className="w-full bg-card border-border border rounded p-3 flex flex-col gap-1">
                    <div className="flex justify-between flex-wrap gap-2">
                        <span className="font-medium">{t.title}</span>
                        <div className="flex gap-1 flex-wrap">
                            {t.tags?.map((tag: string) => (
                                <span key={tag} className="text-[10px] px-2 py-0.5 rounded">{tag}</span>
                            ))}
                        </div>
                    </div>
                    <div className="text-xs flex flex-wrap gap-x-2 gap-y-0.5">
                        <span>Duration:</span> {t.duration_minutes} min
                        <span className="opacity-60">|</span> <span>Q:</span> {t.questions?.length || 0}
                        <span className="opacity-60">|</span> 
                        {title === 'Available Tests' && (
                            <>
                                <span>Ends:</span> <DateTime iso={t.end_time} />
                            </>
                        )}
                        {title === 'Upcoming Tests' && (
                            <>
                                <span>Starts:</span> <DateTime iso={t.start_time} />
                            </>
                        )}
                        {title === 'Ended Tests' && (
                            <>
                                <span>Ended:</span> <DateTime iso={t.end_time} />
                            </>
                        )}
                        {title === 'Attempted Tests' && 'attempt' in t && t.attempt && (
                            <>
                                <span>Attempted:</span> <DateTime iso={t.attempt.started_at} />
                                {t.attempt.is_completed && t.attempt.percentage !== undefined && (
                                    <>
                                        <span className="opacity-60">|</span>
                                        <span>Score:</span> {Math.round(t.attempt.percentage * 100) / 100}%
                                    </>
                                )}
                            </>
                        )}
                    </div>
                    {title === 'Available Tests' && onStartTest && (
                        <button 
                            onClick={() => onStartTest(t.id, t.title)}
                            disabled={startingTestId === t.id}
                            className={`self-start text-xs rounded px-3 py-1 font-medium transition flex items-center gap-2 ${
                                startingTestId === t.id 
                                    ? 'bg-blue-500/20 text-blue-500 cursor-not-allowed' 
                                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                            }`}
                        >
                            {startingTestId === t.id ? (
                                <>
                                    <LoadingSpinner size="sm" variant="primary" />
                                    Starting...
                                </>
                            ) : (
                                'Start Test'
                            )}
                        </button>
                    )}
                    {title === 'Attempted Tests' && 'attempt' in t && t.attempt && (
                        <div className="flex gap-2">
                            {!t.attempt.is_completed && onContinueTest && (
                                <button 
                                    onClick={() => onContinueTest(t.id, t.attempt!.id)}
                                    className="text-xs px-3 py-1 rounded bg-blue-500 hover:bg-blue-600 text-white font-medium transition"
                                >
                                    Continue Test
                                </button>
                            )}
                            {t.attempt.is_completed && onViewResult && (
                                <button 
                                    onClick={() => onViewResult(t.attempt!.id)}
                                    className="text-xs px-3 py-1 rounded bg-green-500 hover:bg-green-600 text-white font-medium transition"
                                >
                                    View Results
                                </button>
                            )}
                        </div>
                    )}
                    {title === 'Ended Tests' && (
                        <button className="self-start text-xs px-2 py-1 rounded bg-gray-500 text-white">
                            Unavailable
                        </button>
                    )}
                </li>
            ))}
        </ul>
    </div>
);

const Dash = () => {
    const [tests, setTests] = useState<Test[] | null>(null);
    const [userAttempts, setUserAttempts] = useState<UserAttempt[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [startingTestId, setStartingTestId] = useState<string | null>(null);
    const [showInstructionsModal, setShowInstructionsModal] = useState(false);
    const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
    const [selectedTestName, setSelectedTestName] = useState<string>('');
    const router = useRouter();

    const handleViewResult = (attemptId: string) => {
        router.push(`/protected/test-result/${attemptId}`);
    };

    const handleContinueTest = (testId: string, attemptId: string) => {
        router.push(`/protected/test/${testId}?attempt=${attemptId}`);
    };

    // Show instructions modal when start test is clicked
    const handleStartTestClick = (testId: string, testName: string) => {
        setSelectedTestId(testId);
        setSelectedTestName(testName);
        setShowInstructionsModal(true);
    };

    // Actual test start function after instructions are confirmed
    const handleStartTest = async (testId: string) => {
        try {
            console.log('Starting test with ID:', testId);
            setError(null); // Clear any previous errors
            setStartingTestId(testId); // Show loading for specific test
            
            // Enter fullscreen before starting the test
            try {
                // Check if fullscreen is supported and document is not already in fullscreen
                if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
                    console.log('Requesting fullscreen...');
                    await document.documentElement.requestFullscreen();
                    console.log('Entered fullscreen mode for test');
                } else if (document.fullscreenElement) {
                    console.log('Already in fullscreen mode');
                } else {
                    console.warn('Fullscreen not supported');
                }
            } catch (fullscreenError) {
                console.warn('Could not enter fullscreen:', fullscreenError);
                // Don't block test start if fullscreen fails - just log the error
                if (fullscreenError instanceof Error) {
                    console.warn('Fullscreen error details:', fullscreenError.message);
                }
            }
            
            const response = await fetch('/api/tests/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ testId }),
            });
            
            console.log('API Response status:', response.status);
            
            let errorData: StartTestResponse = {};
            let responseText = '';
            
            try {
                responseText = await response.text();
                console.log('Raw response:', responseText);
                
                if (responseText) {
                    errorData = JSON.parse(responseText);
                    console.log('Parsed response:', errorData);
                }
            } catch (parseError) {
                console.error('Failed to parse response:', parseError);
                errorData = { error: 'Invalid response from server', raw: responseText };
            }
            
            if (!response.ok) {
                console.error('API Error Response:', errorData);
                const errorMessage = errorData.error || errorData.details || `HTTP ${response.status}: Request failed`;
                throw new Error(errorMessage);
            }
            
            if (!errorData.attempt?.id) {
                console.error('No attempt ID in response:', errorData);
                throw new Error('No attempt ID received from server');
            }
            
            console.log('Test started successfully, redirecting...');
            router.push(`/protected/test/${testId}?attempt=${errorData.attempt.id}`);
            
        } catch (error) {
            console.error('Error starting test:', error);
            
            // Enhanced error message handling
            let errorMessage = 'Failed to start test: ';
            
            if (error instanceof Error) {
                errorMessage += error.message;
                
                // Check for database setup related errors
                if (error.message.includes('Database not properly set up') || 
                    error.message.includes('Database tables missing') ||
                    error.message.includes('user_test_attempts table does not exist')) {
                    errorMessage = `Database Setup Required\n\n`;
                    errorMessage += `The exam system database tables are missing. Please run the database setup script in your Supabase SQL Editor.\n\n`;
                    errorMessage += `Script to run: fix_test_attempts.sql\n\n`;
                    errorMessage += `This will create the required tables for the exam system to work properly.`;
                }
            } else {
                errorMessage += 'Unknown error occurred';
            }
            
            setError(errorMessage);
            
            // Show error for 12 seconds for setup messages
            const timeout = errorMessage.includes('Database Setup Required') ? 12000 : 8000;
            setTimeout(() => setError(null), timeout);
        } finally {
            setStartingTestId(null); // Clear loading state
        }
    };

    // Handle proceeding from instructions modal
    const handleProceedToTest = async () => {
        setShowInstructionsModal(false);
        if (selectedTestId) {
            await handleStartTest(selectedTestId);
        }
    };

    // Handle closing instructions modal
    const handleCloseInstructions = () => {
        setShowInstructionsModal(false);
        setSelectedTestId(null);
        setSelectedTestName('');
    };

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                // Fetch tests and user attempts in parallel
                const [testsRes, attemptsRes] = await Promise.all([
                    fetch('/api/tests', { cache: 'no-store' }),
                    fetch('/api/user/attempts', { cache: 'no-store' })
                ]);
                
                if (!testsRes.ok) throw new Error(`Tests: ${testsRes.statusText}`);
                
                const testsData: Test[] = await testsRes.json();
                let attemptsData: UserAttempt[] = [];
                
                // User attempts might fail if user hasn't attempted any tests yet
                if (attemptsRes.ok) {
                    try {
                        attemptsData = await attemptsRes.json();
                    } catch (e) {
                        console.warn('Failed to parse attempts data:', e);
                    }
                }
                
                if (!cancelled) {
                    setTests(testsData);
                    setUserAttempts(attemptsData);
                }
            } catch (e: unknown) {
                if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load data');
            }
        })();
        return () => { cancelled = true; };
    }, []);

    const now = Date.now();

    const { available, upcoming, ended, attempted } = useMemo(() => {
        const base: Test[] = tests || [];
        const attempts: UserAttempt[] = userAttempts || [];
        
        // Create a set of test IDs that have been attempted
        const attemptedTestIds = new Set(attempts.map(attempt => attempt.test_id));
        
        const avail: Test[] = [];
        const up: Test[] = [];
        const end: Test[] = [];
        const attemptedWithTests: TestWithAttempt[] = [];
        
        // Process attempted tests first
        attempts.forEach(attempt => {
            const testWithAttempt: TestWithAttempt = {
                ...attempt.test,
                attempt: {
                    id: attempt.id,
                    user_id: '', // Not needed for display
                    test_id: attempt.test_id,
                    started_at: attempt.started_at,
                    submitted_at: attempt.submitted_at,
                    answers: {},
                    total_marks: 0,
                    obtained_marks: attempt.total_score || 0,
                    is_completed: attempt.is_completed,
                    time_taken_seconds: attempt.time_taken_seconds || 0,
                    created_at: attempt.started_at,
                    total_score: attempt.total_score,
                    percentage: attempt.percentage
                }
            };
            attemptedWithTests.push(testWithAttempt);
        });
        
        // Process all tests, excluding attempted ones from available
        base.forEach(t => {
            // Skip if this test has been attempted
            if (attemptedTestIds.has(t.id)) {
                return;
            }
            
            const startTime = new Date(t.start_time).getTime();
            const endTime = new Date(t.end_time).getTime();
            if (now >= startTime && now <= endTime) {
                avail.push(t);
            } else if (now < startTime) {
                up.push(t);
            } else if (now > endTime) {
                end.push(t);
            }
        });
        
        avail.sort((a, b) => new Date(a.end_time).getTime() - new Date(b.end_time).getTime());
        up.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
        end.sort((a, b) => new Date(b.end_time).getTime() - new Date(a.end_time).getTime());
        attemptedWithTests.sort((a, b) => new Date(b.attempt!.started_at).getTime() - new Date(a.attempt!.started_at).getTime());
        
        return { available: avail, upcoming: up, ended: end, attempted: attemptedWithTests };
    }, [tests, userAttempts, now]);

    return (
        <div className="min-h-screen">
            <div className="flex justify-center pt-8 pb-4">
                <div className="inline-flex items-center justify-center">
                    <Clock unit="hours" />
                    <span className="text-4xl font-bold mx-2">:</span>
                    <Clock unit="minutes" />
                    <span className="text-4xl font-bold mx-2">:</span>
                    <Clock unit="seconds" />
                </div>
            </div>
            <div className="w-full max-w-6xl mx-auto p-6 space-y-8">
                <header className="flex items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold">Student Dashboard</h1>
                        <p className="text-sm">Overview of your tests</p>
                    </div>
                </header>
                {error && (
                    <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
                        <p className="text-red-700 dark:text-red-300 whitespace-pre-line">{error}</p>
                    </div>
                )}
                {!tests && !error && (
                    <div className="flex justify-center py-8">
                        <DatabaseLoading operation="loading" detail="Fetching available tests..." />
                    </div>
                )}
                {tests && (
                    <div className="space-y-8">
                        {/* Practice Mock Test Tutorial Card */}
                        <div className="rounded-lg border p-6 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950/30 dark:via-indigo-950/30 dark:to-purple-950/30 flex flex-col gap-3">
                            <h2 className="text-xl font-semibold flex items-center gap-2">
                                <span role="img" aria-label="rocket">🚀</span>
                                Practice Mock Test (Tutorial)
                            </h2>
                            <p className="text-sm leading-relaxed max-w-3xl">
                                New here? Try the practice mock test to understand how MCQ, MSQ and NAT questions work, how the timer looks, and how submissions feel—without affecting your real attempts. You get instant feedback and explanations.
                            </p>
                            <div className="flex flex-wrap gap-3 text-xs">
                                <span className="px-2 py-1 rounded bg-blue-500/10 text-blue-600 dark:text-blue-300">3 Questions</span>
                                <span className="px-2 py-1 rounded bg-purple-500/10 text-purple-600 dark:text-purple-300">~5 min</span>
                                <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">No Scoring Penalty</span>
                            </div>
                            <button
                                onClick={() => router.push('/protected/practice')}
                                className="w-fit mt-1 px-4 py-2 rounded bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                Start Practice
                            </button>
                        </div>
                        <div className="gap-6 grid  ">
                            <Section  title="Available Tests" items={available} empty="No tests currently available." onStartTest={handleStartTestClick} startingTestId={startingTestId} />
                            <Section title="Attempted Tests" items={attempted} empty="You haven't attempted any tests yet." onViewResult={handleViewResult} onContinueTest={handleContinueTest} />
                            <Section title="Upcoming Tests" items={upcoming} empty="No upcoming tests scheduled." />
                            <Section title="Ended Tests" items={ended} empty="No tests have ended yet." />
                        </div>
                    </div>
                )}
                
                {/* Test Instructions Modal */}
                <TestInstructionsModal
                    isOpen={showInstructionsModal}
                    onClose={handleCloseInstructions}
                    onProceed={handleProceedToTest}
                    testName={selectedTestName}
                />
            </div>
        </div>
    );
};

export default Dash;
