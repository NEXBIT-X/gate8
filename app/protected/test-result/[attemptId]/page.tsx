"use client";
import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import type { UserTestAttempt, UserQuestionResponse, Question, Test } from '@/lib/types';

interface TestResult {
    attempt: UserTestAttempt;
    test: Test;
    responses: (UserQuestionResponse & { question: Question; unanswered?: boolean })[];
    score: {
        obtained?: number;
        total?: number;
        totalScore?: number;
        totalPossibleMarks?: number;
        totalQuestions?: number;
        answeredQuestions?: number;
        correctAnswers?: number;
        incorrectAnswers?: number;
        unansweredQuestions?: number;
    };
}

interface AIExplanation {
    explanation: string;
    success: boolean;
    error?: string;
}

const TestResultPage = () => {
    const router = useRouter();
    const params = useParams();
    const attemptId = params.attemptId as string;

    const [result, setResult] = useState<TestResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [explanations, setExplanations] = useState<Map<string, AIExplanation>>(new Map());
    const [loadingExplanations, setLoadingExplanations] = useState<Set<string>>(new Set());
    const [showAllExplanations, setShowAllExplanations] = useState(false);

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

    const generateExplanation = async (response: UserQuestionResponse & { question: Question; unanswered?: boolean }) => {
        const responseId = response.unanswered ? `unanswered-${response.question.id}` : response.id;
        
        if (explanations.has(responseId) || loadingExplanations.has(responseId)) {
            return;
        }

        setLoadingExplanations(prev => new Set(prev).add(responseId));

        try {
            const explanationResponse = await fetch('/api/ai/explanation', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    question: response.question.question,
                    options: response.question.options,
                    correct_answer: response.question.correct_answer,
                    user_answer: response.user_answer,
                    is_correct: response.is_correct,
                    question_type: response.question.question_type
                }),
            });

            const explanation = await explanationResponse.json();
            
            setExplanations(prev => new Map(prev).set(responseId, explanation));
        } catch (error) {
            console.error('Error generating explanation:', error);
            setExplanations(prev => new Map(prev).set(responseId, {
                explanation: 'Failed to generate explanation. Please try again.',
                success: false,
                error: 'Network error'
            }));
        } finally {
            setLoadingExplanations(prev => {
                const newSet = new Set(prev);
                newSet.delete(responseId);
                return newSet;
            });
        }
    };

    const generateAllExplanations = async () => {
        if (!result?.responses) return;
        
        setShowAllExplanations(true);
        
        // Generate explanations for all questions that don't have one yet
        const promises = result.responses
            .filter(response => {
                const responseId = response.unanswered ? `unanswered-${response.question.id}` : response.id;
                return !explanations.has(responseId);
            })
            .map(response => generateExplanation(response));
            
        await Promise.all(promises);
    };

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

    return (
        <div className="min-h-screen bg-black text-white">
            {/* Header */}
            <div className="border-b border-neutral-800 p-4">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-2xl font-bold">{result.test.title} - Results</h1>
                    <p className="text-gray-400">Test completed on {new Date(result.attempt.submitted_at || result.attempt.created_at).toLocaleString()}</p>
                </div>
            </div>

            <div className="max-w-4xl mx-auto p-6">
                {/* Score Overview */}
                <div className="bg-neutral-900 rounded-lg p-6 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-center">
                        <div>
                            <div className="text-4xl font-bold text-white">
                                {result.score.obtained || result.score.totalScore || 0}/{result.score.total || result.score.totalPossibleMarks || 0}
                            </div>
                            <div className="text-sm text-gray-400">Score</div>
                        </div>
                        <div>
                            <div className="text-4xl font-bold text-green-400">
                                {result.score.correctAnswers || 0}
                            </div>
                            <div className="text-sm text-gray-400">Correct</div>
                        </div>
                        <div>
                            <div className="text-4xl font-bold text-red-400">
                                {result.score.incorrectAnswers || 0}
                            </div>
                            <div className="text-sm text-gray-400">Incorrect</div>
                        </div>
                        <div>
                            <div className="text-4xl font-bold text-gray-400">
                                {result.score.unansweredQuestions || 0}
                            </div>
                            <div className="text-sm text-gray-400">Unanswered</div>
                        </div>
                    </div>
                    
                    {/* Additional Stats Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-center mt-6 pt-6 border-t border-neutral-800">
                        <div>
                            <div className="text-2xl font-bold text-white">
                                {result.score.totalQuestions || 0}
                            </div>
                            <div className="text-sm text-gray-400">Total Questions</div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-white">
                                {formatTime(result.attempt.time_taken_seconds || 0)}
                            </div>
                            <div className="text-sm text-gray-400">Time Taken</div>
                        </div>
                    </div>
                </div>

                {/* Question Reviews */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold">Question Review</h2>
                        <button
                            onClick={generateAllExplanations}
                            disabled={showAllExplanations}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
                        >
                            {showAllExplanations ? 'Generating Explanations...' : 'Generate AI Explanations for All'}
                        </button>
                    </div>
                    
                    {result.responses.map((response, index) => {
                        const responseId = response.unanswered ? `unanswered-${response.question.id}` : response.id;
                        const responseExplanation = explanations.get(responseId);
                        const isLoadingExplanation = loadingExplanations.has(responseId);
                        
                        return (
                            <div key={responseId} className="bg-neutral-900 rounded-lg p-4">
                                <div className="flex justify-between items-start mb-3">
                                    <h3 className="font-semibold">
                                        Question {index + 1}: {response.question.question}
                                    </h3>
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2 py-1 rounded text-xs ${
                                            response.unanswered
                                                ? 'bg-gray-600 text-white'
                                                : response.is_correct 
                                                ? 'bg-green-600 text-white' 
                                                : 'bg-red-600 text-white'
                                        }`}>
                                            {response.unanswered ? 'Unanswered' : response.is_correct ? 'Correct' : 'Incorrect'}
                                        </span>
                                        <span className="text-sm text-gray-400">
                                            {response.marks_obtained}/{response.question.marks} pts
                                        </span>
                                    </div>
                                </div>
                                
                                {/* Display options if available */}
                                {response.question.options && response.question.options.length > 0 && (
                                    <div className="mb-3">
                                        <div className="text-sm text-gray-400 mb-2">Options:</div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                            {response.question.options.map((option, optIndex) => (
                                                <div 
                                                    key={optIndex}
                                                    className={`p-2 rounded text-sm ${
                                                        option === response.question.correct_answer
                                                            ? 'bg-green-900/30 border border-green-600/50 text-green-300'
                                                            : option === response.user_answer && !response.unanswered
                                                            ? 'bg-red-900/30 border border-red-600/50 text-red-300'
                                                            : 'bg-neutral-800 text-gray-300'
                                                    }`}
                                                >
                                                    <span className="font-medium">{String.fromCharCode(65 + optIndex)}.</span> {option}
                                                    {option === response.question.correct_answer && (
                                                        <span className="ml-2 text-xs text-green-400">✓ Correct</span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                
                                <div className="space-y-2 text-sm">
                                    <div>
                                        <span className="text-gray-400">Your answer: </span>
                                        <span className={
                                            response.unanswered 
                                                ? 'text-gray-500' 
                                                : response.is_correct 
                                                ? 'text-green-400' 
                                                : 'text-red-400'
                                        }>
                                            {response.user_answer || (response.unanswered ? 'Not attempted' : 'No answer')}
                                        </span>
                                    </div>
                                    
                                    {/* Always show correct answer for unanswered or incorrect questions */}
                                    {(response.unanswered || !response.is_correct) && (
                                        <div>
                                            <span className="text-gray-400">Correct answer: </span>
                                            <span className="text-green-400">{response.question.correct_answer}</span>
                                        </div>
                                    )}
                                    
                                    {/* Show potential marks for unanswered questions */}
                                    {response.unanswered && (
                                        <div className="mt-2 p-2 bg-yellow-900/20 border border-yellow-600/30 rounded text-xs">
                                            <span className="text-yellow-400">
                                                ⚠️ This question was not attempted. You could have earned {response.question.marks} marks.
                                            </span>
                                        </div>
                                    )}
                                    
                                    {/* Original explanation if available */}
                                    {response.question.explanation && (
                                        <div className="mt-2 p-3 bg-neutral-800 rounded">
                                            <span className="text-gray-400">Explanation: </span>
                                            <span className="text-gray-300">{response.question.explanation}</span>
                                        </div>
                                    )}
                                    
                                    {/* AI Explanation Section */}
                                    <div className="mt-3">
                                        {!responseExplanation && !isLoadingExplanation && (
                                            <button
                                                onClick={() => generateExplanation(response)}
                                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-xs font-medium transition-colors"
                                            >
                                                🤖 Get AI Explanation
                                            </button>
                                        )}
                                        
                                        {isLoadingExplanation && (
                                            <div className="flex items-center gap-2 text-sm text-gray-400">
                                                <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                                                Generating AI explanation...
                                            </div>
                                        )}
                                        
                                        {responseExplanation && (
                                            <div className={`mt-2 p-3 rounded border-l-4 ${
                                                responseExplanation.success 
                                                    ? 'bg-blue-900/20 border-blue-500' 
                                                    : 'bg-yellow-900/20 border-yellow-500'
                                            }`}>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="text-sm font-medium text-blue-400">
                                                        🤖 AI Explanation
                                                    </span>
                                                    {!responseExplanation.success && (
                                                        <span className="text-xs text-yellow-400">(Fallback)</span>
                                                    )}
                                                </div>
                                                <div className="text-sm text-gray-300 leading-relaxed">
                                                    {responseExplanation.explanation}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
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
