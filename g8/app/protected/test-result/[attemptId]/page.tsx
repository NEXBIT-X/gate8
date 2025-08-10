"use client";
import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import type { UserTestAttempt, UserQuestionResponse, Question, Test } from '@/lib/types';

interface TestResult {
    attempt: UserTestAttempt;
    test: Test;
    responses: (UserQuestionResponse & { question: Question })[];
    score: {
        obtained: number;
        total: number;
        percentage: number;
    };
}

const TestResultPage = () => {
    const router = useRouter();
    const params = useParams();
    const attemptId = params.attemptId as string;

    const [result, setResult] = useState<TestResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadResult = async () => {
            try {
                const response = await fetch(`/api/tests/result/${attemptId}`);

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to load result');
                }

                const data = await response.json();
                setResult(data);
                setLoading(false);
            } catch (error) {
                console.error('Error loading result:', error);
                setError(error instanceof Error ? error.message : 'Failed to load result');
                setLoading(false);
            }
        };

        if (attemptId) {
            loadResult();
        }
    }, [attemptId]);

    if (loading) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center">
                <p>Loading results...</p>
            </div>
        );
    }

    if (error || !result) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center">
                <div className="text-center">
                    <p className="text-red-400 mb-4">{error || 'Result not found'}</p>
                    <button 
                        onClick={() => router.push('/protected/dash')}
                        className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    const formatTime = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        if (hours > 0) {
            return `${hours}h ${minutes}m ${secs}s`;
        }
        return `${minutes}m ${secs}s`;
    };

    const getGradeColor = (percentage: number) => {
        if (percentage >= 90) return 'text-green-400';
        if (percentage >= 80) return 'text-blue-400';
        if (percentage >= 70) return 'text-yellow-400';
        if (percentage >= 60) return 'text-orange-400';
        return 'text-red-400';
    };

    const getGradeLetter = (percentage: number) => {
        if (percentage >= 90) return 'A+';
        if (percentage >= 85) return 'A';
        if (percentage >= 80) return 'B+';
        if (percentage >= 75) return 'B';
        if (percentage >= 70) return 'C+';
        if (percentage >= 65) return 'C';
        if (percentage >= 60) return 'D';
        return 'F';
    };

    return (
        <div className="min-h-screen bg-black text-white">
            {/* Header */}
            <div className="border-b border-neutral-800 p-4">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-2xl font-bold">{result.test.title} - Results</h1>
                    <p className="text-gray-400">Test completed on {new Date(result.attempt.submitted_at!).toLocaleString()}</p>
                </div>
            </div>

            <div className="max-w-4xl mx-auto p-6">
                {/* Score Overview */}
                <div className="bg-neutral-900 rounded-lg p-6 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-center">
                        <div>
                            <div className={`text-4xl font-bold ${getGradeColor(result.score.percentage)}`}>
                                {result.score.percentage}%
                            </div>
                            <div className="text-sm text-gray-400">Score</div>
                        </div>
                        <div>
                            <div className={`text-4xl font-bold ${getGradeColor(result.score.percentage)}`}>
                                {getGradeLetter(result.score.percentage)}
                            </div>
                            <div className="text-sm text-gray-400">Grade</div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-white">
                                {result.score.obtained}/{result.score.total}
                            </div>
                            <div className="text-sm text-gray-400">Points</div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-white">
                                {formatTime(result.attempt.time_taken_seconds)}
                            </div>
                            <div className="text-sm text-gray-400">Time Taken</div>
                        </div>
                    </div>
                </div>

                {/* Question Reviews */}
                <div className="space-y-4">
                    <h2 className="text-xl font-bold mb-4">Question Review</h2>
                    {result.responses.map((response, index) => (
                        <div key={response.id} className="bg-neutral-900 rounded-lg p-4">
                            <div className="flex justify-between items-start mb-3">
                                <h3 className="font-semibold">
                                    Question {index + 1}: {response.question.question}
                                </h3>
                                <div className="flex items-center gap-2">
                                    <span className={`px-2 py-1 rounded text-xs ${
                                        response.is_correct 
                                            ? 'bg-green-600 text-white' 
                                            : 'bg-red-600 text-white'
                                    }`}>
                                        {response.is_correct ? 'Correct' : 'Incorrect'}
                                    </span>
                                    <span className="text-sm text-gray-400">
                                        {response.marks_obtained}/{response.question.mark} pts
                                    </span>
                                </div>
                            </div>
                            
                            <div className="space-y-2 text-sm">
                                <div>
                                    <span className="text-gray-400">Your answer: </span>
                                    <span className={response.is_correct ? 'text-green-400' : 'text-red-400'}>
                                        {response.user_answer || 'No answer'}
                                    </span>
                                </div>
                                {!response.is_correct && (
                                    <div>
                                        <span className="text-gray-400">Correct answer: </span>
                                        <span className="text-green-400">{response.question.correct_answer}</span>
                                    </div>
                                )}
                                {response.question.explanation && (
                                    <div className="mt-2 p-3 bg-neutral-800 rounded">
                                        <span className="text-gray-400">Explanation: </span>
                                        <span className="text-gray-300">{response.question.explanation}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Actions */}
                <div className="mt-8 flex justify-center">
                    <button
                        onClick={() => router.push('/protected/dash')}
                        className="px-6 py-3 bg-blue-600 rounded-lg hover:bg-blue-700 font-medium"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TestResultPage;
