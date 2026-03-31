-- Sample Test Data for Testing the Application
-- Run this after running the fix_database_schema.sql

-- Insert a sample test
INSERT INTO public.tests (id, title, tags, start_time, end_time, duration_minutes) VALUES 
('550e8400-e29b-41d4-a716-446655440000', 'Sample Computer Science Test', 
 ARRAY['CS', 'Programming', 'Algorithms'], 
 NOW() - INTERVAL '1 hour', 
 NOW() + INTERVAL '1 day', 
 120);

-- Insert sample questions for the test
INSERT INTO public.questions (test_id, question, question_type, options, correct_answer, marks, negative_marks, tag, explanation) VALUES 
('550e8400-e29b-41d4-a716-446655440000', 
 'What is the time complexity of binary search?', 
 'MCQ', 
 ARRAY['O(n)', 'O(log n)', 'O(n log n)', 'O(1)'], 
 'O(log n)', 
 2.0, 
 0.5, 
 'Algorithms',
 'Binary search divides the search space in half with each comparison, resulting in O(log n) time complexity.'),

('550e8400-e29b-41d4-a716-446655440000', 
 'Which of the following are sorting algorithms?', 
 'MSQ', 
 ARRAY['Quick Sort', 'Binary Search', 'Merge Sort', 'Bubble Sort', 'Linear Search'], 
 '["Quick Sort", "Merge Sort", "Bubble Sort"]', 
 3.0, 
 1.0, 
 'Algorithms',
 'Quick Sort, Merge Sort, and Bubble Sort are all sorting algorithms. Binary Search and Linear Search are searching algorithms.'),

('550e8400-e29b-41d4-a716-446655440000', 
 'How many nodes are there in a complete binary tree of height 3?', 
 'NAT', 
 NULL, 
 '15', 
 2.0, 
 0.0, 
 'Data Structures',
 'A complete binary tree of height h has 2^(h+1) - 1 nodes. For height 3: 2^4 - 1 = 15 nodes.');

-- Verify data was inserted
SELECT 
    t.title,
    COUNT(q.id) as question_count
FROM tests t
LEFT JOIN questions q ON t.id = q.test_id
WHERE t.id = '550e8400-e29b-41d4-a716-446655440000'
GROUP BY t.id, t.title;
