-- Simple CS Test with 3 Questions (MCQ, MSQ, NAT) for Testing
-- Run this in your Supabase SQL Editor after running the main migration

-- Insert a simple test
INSERT INTO public.tests (id, title, tags, start_time, end_time, duration_minutes, created_by) VALUES
('11111111-2222-3333-4444-555555555555', 'Simple CS Test', ARRAY['CS', 'Test'], NOW() - INTERVAL '1 hour', NOW() + INTERVAL '2 hours', 30, NULL)
ON CONFLICT (id) DO NOTHING;

-- Insert 3 different types of questions
INSERT INTO public.questions (test_id, question, question_type, options, correct_answer, marks, negative_marks, tag, explanation) VALUES

-- Question 1: MCQ (Multiple Choice - Single Answer)
('11111111-2222-3333-4444-555555555555', 
 'What is the time complexity of searching in a sorted array using binary search?', 
 'MCQ', 
 ARRAY['O(n)', 'O(log n)', 'O(n²)', 'O(1)'], 
 'B', 
 2.00, 
 0.50, 
 'Algorithms', 
 'Binary search divides the search space in half with each comparison, resulting in O(log n) time complexity.'),

-- Question 2: MSQ (Multiple Select - Multiple Answers)
('11111111-2222-3333-4444-555555555555', 
 'Which of the following are linear data structures? (Select all correct answers)', 
 'MSQ', 
 ARRAY['Array', 'Stack', 'Tree', 'Queue', 'Graph'], 
 'A,B,D', 
 2.00, 
 0.50, 
 'Data Structures', 
 'Array, Stack, and Queue are linear data structures. Tree and Graph are non-linear data structures.'),

-- Question 3: NAT (Numerical Answer Type)
('11111111-2222-3333-4444-555555555555', 
 'A binary tree has 7 nodes. What is the minimum possible height of this tree? (Consider height of single node as 0)', 
 'NAT', 
 NULL, 
 '2', 
 2.00, 
 0.00, 
 'Data Structures', 
 'For minimum height with 7 nodes: Level 0: 1 node, Level 1: 2 nodes, Level 2: 4 nodes. Total = 7 nodes. Height = 2.');

-- Verify the data was inserted
DO $$
BEGIN
  RAISE NOTICE '=== TEST DATA INSERTED SUCCESSFULLY ===';
  RAISE NOTICE 'Test Created: Simple CS Test (ID: 11111111-2222-3333-4444-555555555555)';
  RAISE NOTICE 'Duration: 30 minutes';
  RAISE NOTICE 'Questions:';
  RAISE NOTICE '1. MCQ: Binary search time complexity';
  RAISE NOTICE '2. MSQ: Linear data structures (multi-select)';
  RAISE NOTICE '3. NAT: Binary tree minimum height (numerical)';
  RAISE NOTICE '';
  RAISE NOTICE 'Test is AVAILABLE NOW and ends in 2 hours';
  RAISE NOTICE 'You can now test the application!';
END $$;
