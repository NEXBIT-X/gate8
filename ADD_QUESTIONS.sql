-- Quick fix to add sample questions to your test
-- Run this in your Supabase SQL Editor after running CRITICAL_FIX.sql

-- First check if questions exist
SELECT COUNT(*) as question_count FROM questions WHERE test_id = '9a6f73a0-a007-4e52-a4ea-72398977d39d';

-- If no questions, insert them
INSERT INTO questions (test_id, question_text, question_type, options, correct_answer, marks, negative_marks, question_number) 
VALUES 
('9a6f73a0-a007-4e52-a4ea-72398977d39d', 'What is the time complexity of binary search?', 'MCQ', 
 '["O(n)", "O(log n)", "O(n log n)", "O(1)"]', 
 '"O(log n)"', 2.00, 0.66, 1),

('9a6f73a0-a007-4e52-a4ea-72398977d39d', 'Which of the following are sorting algorithms? (Select all that apply)', 'MSQ', 
 '["Bubble Sort", "Binary Search", "Quick Sort", "Merge Sort", "Linear Search"]', 
 '["Bubble Sort", "Quick Sort", "Merge Sort"]', 2.00, 0.66, 2),

('9a6f73a0-a007-4e52-a4ea-72398977d39d', 'How many nodes are in a complete binary tree of height 3? (Enter numerical value)', 'NAT', 
 null, 
 '15', 2.00, 0.00, 3)
ON CONFLICT (test_id, question_number) DO UPDATE SET
    question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    options = EXCLUDED.options,
    correct_answer = EXCLUDED.correct_answer,
    marks = EXCLUDED.marks,
    negative_marks = EXCLUDED.negative_marks;

-- Verify questions were inserted
SELECT id, question_text, question_type, question_number FROM questions WHERE test_id = '9a6f73a0-a007-4e52-a4ea-72398977d39d' ORDER BY question_number;
