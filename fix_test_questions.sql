-- Quick fix to add questions for the test that's failing
-- Run this in your Supabase SQL Editor

-- Check current questions for the failing test
SELECT 
    t.id as test_id,
    t.title,
    COUNT(q.id) as question_count
FROM public.tests t
LEFT JOIN public.questions q ON t.id = q.test_id
WHERE t.id = '9a6f73a0-a007-4e52-a4ea-72398977d39d'
GROUP BY t.id, t.title;

-- Insert questions if they don't exist
INSERT INTO public.questions (
    test_id, 
    question, 
    question_type, 
    options, 
    correct_answer, 
    marks, 
    negative_marks, 
    tag, 
    explanation
) VALUES
-- Question 1: MCQ
('9a6f73a0-a007-4e52-a4ea-72398977d39d', 
 'What is the time complexity of binary search in a sorted array?', 
 'MCQ', 
 ARRAY['O(n)', 'O(log n)', 'O(n log n)', 'O(1)'], 
 'O(log n)', 
 2.00, 
 0.66, 
 'Algorithms', 
 'Binary search divides the search space in half with each comparison.'),

-- Question 2: MSQ
('9a6f73a0-a007-4e52-a4ea-72398977d39d', 
 'Which of the following are sorting algorithms? (Select all that apply)', 
 'MSQ', 
 ARRAY['Array', 'Stack', 'Quick Sort', 'Merge Sort', 'Binary Search'], 
 'Quick Sort,Merge Sort', 
 2.00, 
 0.66, 
 'Algorithms', 
 'Quick Sort and Merge Sort are sorting algorithms.'),

-- Question 3: NAT
('9a6f73a0-a007-4e52-a4ea-72398977d39d', 
 'How many comparisons are needed in the worst case to sort 8 elements using merge sort?', 
 'NAT', 
 NULL, 
 '17', 
 2.00, 
 0.00, 
 'Algorithms', 
 'Merge sort worst case: n*log(n) comparisons. For n=8: 8*log(8) = 8*3 = 24 operations, but actual comparisons are fewer.')
ON CONFLICT DO NOTHING;

-- Verify questions were inserted
SELECT 
    id,
    question,
    question_type,
    options,
    correct_answer
FROM public.questions 
WHERE test_id = '9a6f73a0-a007-4e52-a4ea-72398977d39d'
ORDER BY id;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Questions inserted for test 9a6f73a0-a007-4e52-a4ea-72398977d39d';
    RAISE NOTICE 'Total questions: %', (SELECT COUNT(*) FROM public.questions WHERE test_id = '9a6f73a0-a007-4e52-a4ea-72398977d39d');
    RAISE NOTICE 'Try starting the test again!';
END $$;
