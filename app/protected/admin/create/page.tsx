"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/loading';

interface Question {
  id: string;
  question_text: string;
  question_type: 'MCQ' | 'MSQ' | 'NAT';
  options?: string[];
  correct_answer: string | string[] | number;
  marks: number;
  negative_marks: number;
  explanation?: string;
}

interface TestFormData {
  title: string;
  description: string;
  duration_minutes: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

const CreateTestPage = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Test form data
  const [testData, setTestData] = useState<TestFormData>({
    title: '',
    description: '',
    duration_minutes: 180,
    start_time: '',
    end_time: '',
    is_active: true
  });

  // Questions data
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Question>({
    id: crypto.randomUUID(),
    question_text: '',
    question_type: 'MCQ',
    options: ['', '', '', ''],
    correct_answer: '',
    marks: 2,
    negative_marks: 0.66,
    explanation: ''
  });

  // Form validation
  const validateTest = (): string | null => {
    if (!testData.title.trim()) return 'Test title is required';
    if (!testData.description.trim()) return 'Test description is required';
    if (testData.duration_minutes <= 0) return 'Duration must be greater than 0';
    if (!testData.start_time) return 'Start time is required';
    if (!testData.end_time) return 'End time is required';
    if (new Date(testData.start_time) >= new Date(testData.end_time)) {
      return 'End time must be after start time';
    }
    if (questions.length === 0) return 'At least one question is required';
    
    // Validate questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question_text.trim()) return `Question ${i + 1}: Question text is required`;
      if (q.marks <= 0) return `Question ${i + 1}: Marks must be greater than 0`;
      
      if (q.question_type === 'MCQ' || q.question_type === 'MSQ') {
        if (!q.options || q.options.some(opt => !opt.trim())) {
          return `Question ${i + 1}: All options must be filled`;
        }
        if (!q.correct_answer || (Array.isArray(q.correct_answer) && q.correct_answer.length === 0)) {
          return `Question ${i + 1}: Correct answer is required`;
        }
      }
      
      if (q.question_type === 'NAT') {
        if (!q.correct_answer || q.correct_answer === '') {
          return `Question ${i + 1}: Correct answer is required`;
        }
      }
    }
    
    return null;
  };

  // Handle test form changes
  const handleTestChange = (field: keyof TestFormData, value: string | number | boolean) => {
    setTestData(prev => ({ ...prev, [field]: value }));
  };

  // Handle question changes
  const handleQuestionChange = (field: keyof Question, value: string | string[] | number | undefined) => {
    setCurrentQuestion(prev => ({ ...prev, [field]: value }));
  };

  // Handle option changes for MCQ/MSQ
  const handleOptionChange = (index: number, value: string) => {
    setCurrentQuestion(prev => ({
      ...prev,
      options: prev.options?.map((opt, i) => i === index ? value : opt) || []
    }));
  };

  // Add current question to questions list
  const addQuestion = () => {
    const validation = validateCurrentQuestion();
    if (validation) {
      setError(validation);
      return;
    }

    setQuestions(prev => [...prev, { ...currentQuestion, id: crypto.randomUUID() }]);
    
    // Reset current question
    setCurrentQuestion({
      id: crypto.randomUUID(),
      question_text: '',
      question_type: 'MCQ',
      options: ['', '', '', ''],
      correct_answer: '',
      marks: 2,
      negative_marks: 0.66,
      explanation: ''
    });
    
    setError(null);
  };

  // Validate current question
  const validateCurrentQuestion = (): string | null => {
    if (!currentQuestion.question_text.trim()) return 'Question text is required';
    if (currentQuestion.marks <= 0) return 'Marks must be greater than 0';
    
    if (currentQuestion.question_type === 'MCQ' || currentQuestion.question_type === 'MSQ') {
      if (!currentQuestion.options || currentQuestion.options.some(opt => !opt.trim())) {
        return 'All options must be filled';
      }
      if (!currentQuestion.correct_answer || (Array.isArray(currentQuestion.correct_answer) && currentQuestion.correct_answer.length === 0)) {
        return 'Correct answer is required';
      }
    }
    
    if (currentQuestion.question_type === 'NAT') {
      if (!currentQuestion.correct_answer || currentQuestion.correct_answer === '') {
        return 'Correct answer is required';
      }
    }
    
    return null;
  };

  // Remove question
  const removeQuestion = (id: string) => {
    setQuestions(prev => prev.filter(q => q.id !== id));
  };

  // Submit test
  const handleSubmit = async () => {
    const validation = validateTest();
    if (validation) {
      setError(validation);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create test
      const testResponse = await fetch('/api/admin/tests/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...testData,
          total_questions: questions.length,
          max_marks: questions.reduce((sum, q) => sum + q.marks, 0)
        })
      });

      if (!testResponse.ok) {
        const errorData = await testResponse.json();
        throw new Error(errorData.error || 'Failed to create test');
      }

      const { test } = await testResponse.json();

      // Create questions
      const questionsResponse = await fetch('/api/admin/questions/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testId: test.id,
          questions: questions.map((q, index) => ({
            ...q,
            question_number: index + 1,
            test_id: test.id
          }))
        })
      });

      if (!questionsResponse.ok) {
        const errorData = await questionsResponse.json();
        throw new Error(errorData.error || 'Failed to create questions');
      }

      setSuccess(`Test "${testData.title}" created successfully with ${questions.length} questions!`);
      
      // Reset form after success
      setTimeout(() => {
        router.push('/protected/admin');
      }, 2000);

    } catch (error) {
      console.error('Error creating test:', error);
      setError(error instanceof Error ? error.message : 'Failed to create test');
    } finally {
      setLoading(false);
    }
  };

  // Auto-fill demo data
  const fillDemoData = () => {
    setTestData({
      title: 'GATE CSE Sample Test',
      description: 'Computer Science and Engineering sample test with mixed question types',
      duration_minutes: 120,
      start_time: new Date().toISOString().slice(0, 16),
      end_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
      is_active: true
    });

    setQuestions([
      {
        id: '1',
        question_text: 'What is the time complexity of binary search?',
        question_type: 'MCQ',
        options: ['O(n)', 'O(log n)', 'O(n log n)', 'O(1)'],
        correct_answer: 'O(log n)',
        marks: 2,
        negative_marks: 0.66,
        explanation: 'Binary search divides the search space in half each time'
      },
      {
        id: '2',
        question_text: 'Which are sorting algorithms?',
        question_type: 'MSQ',
        options: ['Bubble Sort', 'Binary Search', 'Quick Sort', 'Merge Sort'],
        correct_answer: ['Bubble Sort', 'Quick Sort', 'Merge Sort'],
        marks: 2,
        negative_marks: 0.66,
        explanation: 'Binary search is a searching algorithm, not sorting'
      }
    ]);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Create New Test</h1>
            <p className="text-muted-foreground">Design and configure a new examination</p>
          </div>
          <div className="flex gap-2">
            <button title='a'
              onClick={fillDemoData}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              Fill Demo Data
            </button>
            <button title='a'
              onClick={() => router.back()}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <p className="text-green-700 dark:text-green-300">{success}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Test Configuration */}
          <div className="space-y-6">
            <div className="bg-card rounded-lg border p-6">
              <h2 className="text-xl font-semibold mb-4">Test Configuration</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Test Title *</label>
                  < input 
                  title="a"
                    type="text"
                    value={testData.title}
                    onChange={(e) => handleTestChange('title', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter test title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Description *</label>
                  <textarea
                    value={testData.description}
                    onChange={(e) => handleTestChange('description', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    placeholder="Enter test description"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Duration (minutes) *</label>
                  < input 
                  title="a"
                    type="number"
                    value={testData.duration_minutes}
                    onChange={(e) => handleTestChange('duration_minutes', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min="1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Start Time *</label>
                    < input 
                    title="a"
                      type="datetime-local"
                      value={testData.start_time}
                      onChange={(e) => handleTestChange('start_time', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">End Time *</label>
                    < input 
                    title="a"
                      type="datetime-local"
                      value={testData.end_time}
                      onChange={(e) => handleTestChange('end_time', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  < input 
                  title="a"
                    type="checkbox"
                    id="is_active"
                    checked={testData.is_active}
                    onChange={(e) => handleTestChange('is_active', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="is_active" className="text-sm font-medium">
                    Activate test immediately
                  </label>
                </div>
              </div>
            </div>

            {/* Questions Summary */}
            <div className="bg-card rounded-lg border p-6">
              <h2 className="text-xl font-semibold mb-4">Questions Summary</h2>
              
              {questions.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No questions added yet</p>
              ) : (
                <div className="space-y-3">
                  {questions.map((question, index) => (
                    <div key={question.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">Q{index + 1}: {question.question_text.slice(0, 50)}...</p>
                        <p className="text-xs text-muted-foreground">
                          {question.question_type} • {question.marks} marks • -{question.negative_marks} penalty
                        </p>
                      </div>
                      <button title='a'
                      
                        onClick={() => removeQuestion(question.id)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                  
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                    <div className="text-sm text-blue-700 dark:text-blue-300">
                      <p>Total Questions: {questions.length}</p>
                      <p>Total Marks: {questions.reduce((sum, q) => sum + q.marks, 0)}</p>
                      <p>Question Types: {Array.from(new Set(questions.map(q => q.question_type))).join(', ')}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Add Question */}
          <div className="space-y-6">
            <div className="bg-card rounded-lg border p-6">
              <h2 className="text-xl font-semibold mb-4">Add Question</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Question Text *</label>
                  <textarea
                    value={currentQuestion.question_text}
                    onChange={(e) => handleQuestionChange('question_text', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    placeholder="Enter question text"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Question Type *</label>
                  <select
                    title="a"
                    value={currentQuestion.question_type}
                    onChange={(e) => {
                      const type = e.target.value as 'MCQ' | 'MSQ' | 'NAT';
                      handleQuestionChange('question_type', type);
                      
                      // Reset options and answers based on type
                      if (type === 'NAT') {
                        handleQuestionChange('options', undefined);
                        handleQuestionChange('correct_answer', '');
                      } else {
                        handleQuestionChange('options', ['', '', '', '']);
                        handleQuestionChange('correct_answer', type === 'MCQ' ? '' : []);
                      }
                    }}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="MCQ">Multiple Choice (MCQ)</option>
                    <option value="MSQ">Multiple Select (MSQ)</option>
                    <option value="NAT">Numerical Answer (NAT)</option>
                  </select>
                </div>

                {/* Options for MCQ/MSQ */}
                {(currentQuestion.question_type === 'MCQ' || currentQuestion.question_type === 'MSQ') && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Options *</label>
                    <div className="space-y-2">
                      {currentQuestion.options?.map((option, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <span className="text-sm font-medium w-6">{String.fromCharCode(65 + index)}.</span>
                          < input 
                          title="a"
                            type="text"
                            value={option}
                            onChange={(e) => handleOptionChange(index, e.target.value)}
                            className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder={`Option ${String.fromCharCode(65 + index)}`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Correct Answer */}
                <div>
                  <label className="block text-sm font-medium mb-1">Correct Answer *</label>
                  {currentQuestion.question_type === 'MCQ' && (
                    <select
                    title='a'
                      value={currentQuestion.correct_answer as string}
                      onChange={(e) => handleQuestionChange('correct_answer', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select correct option</option>
                      {currentQuestion.options?.map((option, index) => (
                        <option key={index} value={option}>
                          {String.fromCharCode(65 + index)}. {option}
                        </option>
                      ))}
                    </select>
                  )}

                  {currentQuestion.question_type === 'MSQ' && (
                    <div className="space-y-2">
                      {currentQuestion.options?.map((option, index) => (
                        <div key={index} className="flex items-center gap-2">
                          < input 
                          title="a"
                            type="checkbox"
                            checked={(currentQuestion.correct_answer as string[])?.includes(option) || false}
                            onChange={(e) => {
                              const currentAnswers = (currentQuestion.correct_answer as string[]) || [];
                              if (e.target.checked) {
                                handleQuestionChange('correct_answer', [...currentAnswers, option]);
                              } else {
                                handleQuestionChange('correct_answer', currentAnswers.filter(a => a !== option));
                              }
                            }}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm">{String.fromCharCode(65 + index)}. {option}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {currentQuestion.question_type === 'NAT' && (
                    < input 
                    title="a"
                      type="text"
                      value={currentQuestion.correct_answer as string}
                      onChange={(e) => handleQuestionChange('correct_answer', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter numerical answer or formula"
                    />
                  )}
                </div>

                {/* Marks and Negative Marks */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Marks *</label>
                    < input 
                    title="a"
                      type="number"
                      value={currentQuestion.marks}
                      onChange={(e) => handleQuestionChange('marks', parseFloat(e.target.value))}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      min="0"
                      step="0.5"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Negative Marks</label>
                    < input 
                    title="a"
                      type="number"
                      value={currentQuestion.negative_marks}
                      onChange={(e) => handleQuestionChange('negative_marks', parseFloat(e.target.value))}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>

                {/* Explanation */}
                <div>
                  <label className="block text-sm font-medium mb-1">Explanation (Optional)</label>
                  <textarea
                    value={currentQuestion.explanation}
                    onChange={(e) => handleQuestionChange('explanation', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={2}
                    placeholder="Explain the correct answer"
                  />
                </div>

                <button title='a'
                  onClick={addQuestion}
                  className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add Question
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-center pt-6">
          <button title='a'
            onClick={handleSubmit}
            disabled={loading || questions.length === 0}
            className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {loading ? (
              <>
                <LoadingSpinner size="sm" variant="primary" />
                Creating Test...
              </>
            ) : (
              'Create Test'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateTestPage;