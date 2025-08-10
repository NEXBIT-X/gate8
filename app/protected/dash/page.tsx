// /workspaces/abc/g8/app/protected/dash/page.tsx
"use client";
import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Clock from './widgets/clock';
import { DatabaseLoading, LoadingSpinner } from '@/components/loading';
import type { Test } from '@/lib/types';

const DateTime = ({ iso }: { iso: string }) => {
    const stable = new Date(iso).toISOString().replace('T', ' ').replace(/:\d{2}\..+$/, '') + ' UTC';
    const [display, setDisplay] = useState(stable);
    useEffect(() => {
        try { setDisplay(new Date(iso).toLocaleString()); } catch {}
    }, [iso]);
    return <time dateTime={iso} suppressHydrationWarning className="tabular-nums">{display}</time>;
};

const Section = ({ title, items, empty, onStartTest, startingTestId }: { 
    title: string; 
    items: Test[]; 
    empty: string;
    onStartTest?: (testId: string) => void;
    startingTestId?: string | null;
}) => (
    <div className="rounded border p-4 space-y-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        <hr />
        {items.length === 0 && <p className="text-sm">{empty}</p>}
        <ul className="space-y-2">
            {items.map(t => (
                <li key={t.id} className="border rounded p-3 flex flex-col gap-1">
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
                    </div>
                    {title === 'Available Tests' && onStartTest && (
                        <button 
                            onClick={() => onStartTest(t.id)}
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
                    {title === 'Ended Tests' && (
                        <button className="self-start text-xs px-2 py-1 rounded">
                            View Result
                        </button>
                    )}
                </li>
            ))}
        </ul>
    </div>
);

const Dash = () => {
    const [tests, setTests] = useState<Test[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [startingTestId, setStartingTestId] = useState<string | null>(null);
    const router = useRouter();

    const handleStartTest = async (testId: string) => {
        try {
            console.log('Starting test with ID:', testId);
            setError(null); // Clear any previous errors
            setStartingTestId(testId); // Show loading for specific test
            
            const response = await fetch('/api/tests/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ testId }),
            });
            
            console.log('API Response status:', response.status);
            
            let errorData: any = {};
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

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch('/api/tests', { cache: 'no-store' });
                if (!res.ok) throw new Error(res.statusText);
                const data: Test[] = await res.json();
                if (!cancelled) setTests(data);
            } catch (e: any) {
                if (!cancelled) setError(e.message || 'Failed to load tests');
            }
        })();
        return () => { cancelled = true; };
    }, []);

    const now = Date.now();

    const { available, upcoming, ended } = useMemo(() => {
        const base: Test[] = tests || [];
        const avail: Test[] = [];
        const up: Test[] = [];
        const end: Test[] = [];
        base.forEach(t => {
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
        return { available: avail, upcoming: up, ended: end };
    }, [tests, now]);

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
                    <div className="grid gap-6 md:grid-cols-3">
                        <Section title="Available Tests" items={available} empty="No tests currently available." onStartTest={handleStartTest} startingTestId={startingTestId} />
                        <Section title="Upcoming Tests" items={upcoming} empty="No upcoming tests scheduled." />
                        <Section title="Ended Tests" items={ended} empty="No tests have ended yet." />
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dash;
