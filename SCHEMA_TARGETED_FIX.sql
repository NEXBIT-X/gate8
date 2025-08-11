-- TARGETED FIX FOR EXISTING GATE8 DATABASE SCHEMA
-- Run this in your Supabase SQL Editor

-- ====================================================
-- STEP 1: ENSURE PROPER RLS POLICIES FOR EXISTING TABLES
-- ====================================================

-- Enable RLS on all tables (if not already enabled)
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_test_attempts ENABLE ROW LEVEL SECURITY;

-- ====================================================
-- STEP 2: DROP EXISTING POLICIES TO AVOID CONFLICTS
-- ====================================================

-- Drop existing policies on tests
DROP POLICY IF EXISTS "tests_read_all" ON public.tests;
DROP POLICY IF EXISTS "service_role_tests_all" ON public.tests;
DROP POLICY IF EXISTS "authenticated_tests_read" ON public.tests;

-- Drop existing policies on questions
DROP POLICY IF EXISTS "questions_read_all" ON public.questions;
DROP POLICY IF EXISTS "service_role_questions_all" ON public.questions;
DROP POLICY IF EXISTS "authenticated_questions_read" ON public.questions;

-- Drop existing policies on user_test_attempts
DROP POLICY IF EXISTS "attempts_insert_self" ON public.user_test_attempts;
DROP POLICY IF EXISTS "attempts_read_self" ON public.user_test_attempts;
DROP POLICY IF EXISTS "attempts_update_self" ON public.user_test_attempts;
DROP POLICY IF EXISTS "service_role_attempts_all" ON public.user_test_attempts;
DROP POLICY IF EXISTS "authenticated_attempts_own" ON public.user_test_attempts;

-- ====================================================
-- STEP 3: CREATE NEW RLS POLICIES FOR SERVICE ROLE ACCESS
-- ====================================================

-- Tests policies - Allow service role full access and authenticated users to read
CREATE POLICY "service_role_full_access_tests"
    ON public.tests FOR ALL
    USING (true);

CREATE POLICY "authenticated_read_tests"
    ON public.tests FOR SELECT
    TO authenticated
    USING (true);

-- Questions policies - Allow service role full access and authenticated users to read
CREATE POLICY "service_role_full_access_questions"
    ON public.questions FOR ALL
    USING (true);

CREATE POLICY "authenticated_read_questions"
    ON public.questions FOR SELECT
    TO authenticated
    USING (true);

-- User test attempts policies - Allow service role full access and users for their own attempts
CREATE POLICY "service_role_full_access_attempts"
    ON public.user_test_attempts FOR ALL
    USING (true);

CREATE POLICY "users_manage_own_attempts"
    ON public.user_test_attempts FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ====================================================
-- STEP 4: GRANT PERMISSIONS TO ROLES
-- ====================================================

-- Grant all permissions to service_role
GRANT ALL ON public.tests TO service_role;
GRANT ALL ON public.questions TO service_role;
GRANT ALL ON public.user_test_attempts TO service_role;
GRANT ALL ON public.user_question_responses TO service_role;
GRANT ALL ON public.submissions TO service_role;
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Grant specific permissions to authenticated users
GRANT SELECT ON public.tests TO authenticated;
GRANT SELECT ON public.questions TO authenticated;
GRANT ALL ON public.user_test_attempts TO authenticated;
GRANT ALL ON public.user_question_responses TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ====================================================
-- STEP 5: INSERT TEST DATA MATCHING YOUR SCHEMA
-- ====================================================

-- Insert test with the exact ID from your error logs
INSERT INTO public.tests (
    id,
    title, 
    duration_minutes, 
    start_time, 
    end_time,
    tags,
    created_at
) VALUES (
    '9a6f73a0-a007-4e52-a4ea-72398977d39d',
    'GATE CSE Mock Test 1',
    180,
    NOW() - INTERVAL '1 hour',
    NOW() + INTERVAL '7 days',
    ARRAY['CS', 'GATE', 'Mock'],
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    start_time = NOW() - INTERVAL '1 hour',
    end_time = NOW() + INTERVAL '7 days',
    title = 'GATE CSE Mock Test 1',
    duration_minutes = 180,
    tags = ARRAY['CS', 'GATE', 'Mock'];

-- Insert sample questions matching your schema (id is serial, not uuid)
-- First, delete any existing questions for this test to avoid conflicts
DELETE FROM public.questions WHERE test_id = '9a6f73a0-a007-4e52-a4ea-72398977d39d';

-- Insert questions (note: options as text[] and correct_answer as text, not jsonb)
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
 'Binary search divides the search space in half with each comparison, resulting in O(log n) time complexity.'),

-- Question 2: MSQ
('9a6f73a0-a007-4e52-a4ea-72398977d39d', 
 'Which of the following are linear data structures? (Select all that apply)', 
 'MSQ', 
 ARRAY['Array', 'Stack', 'Tree', 'Queue', 'Graph'], 
 'Array,Stack,Queue', 
 2.00, 
 0.66, 
 'Data Structures', 
 'Array, Stack, and Queue are linear data structures. Tree and Graph are non-linear data structures.'),

-- Question 3: NAT
('9a6f73a0-a007-4e52-a4ea-72398977d39d', 
 'How many nodes are in a complete binary tree of height 3? (Height of single node is 0)', 
 'NAT', 
 NULL, 
 '15', 
 2.00, 
 0.00, 
 'Data Structures', 
 'For minimum height with 7 nodes: Level 0: 1 node, Level 1: 2 nodes, Level 2: 4 nodes. Total = 7 nodes. Height = 2.');

-- ====================================================
-- STEP 6: VERIFICATION
-- ====================================================

-- Verify the data
DO $$
DECLARE
    test_count integer;
    question_count integer;
    test_record record;
BEGIN
    -- Count tests
    SELECT COUNT(*) INTO test_count 
    FROM public.tests 
    WHERE id = '9a6f73a0-a007-4e52-a4ea-72398977d39d';
    
    -- Count questions
    SELECT COUNT(*) INTO question_count 
    FROM public.questions 
    WHERE test_id = '9a6f73a0-a007-4e52-a4ea-72398977d39d';
    
    -- Get test details
    SELECT title, duration_minutes, start_time, end_time INTO test_record
    FROM public.tests 
    WHERE id = '9a6f73a0-a007-4e52-a4ea-72398977d39d';
    
    RAISE NOTICE '=========================================';
    RAISE NOTICE '✅ GATE8 DATABASE FIX COMPLETED!';
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'Tests found: %', test_count;
    RAISE NOTICE 'Questions created: %', question_count;
    RAISE NOTICE '';
    RAISE NOTICE '🎯 Test Details:';
    RAISE NOTICE 'ID: 9a6f73a0-a007-4e52-a4ea-72398977d39d';
    RAISE NOTICE 'Title: %', test_record.title;
    RAISE NOTICE 'Duration: % minutes', test_record.duration_minutes;
    RAISE NOTICE 'Start Time: %', test_record.start_time;
    RAISE NOTICE 'End Time: %', test_record.end_time;
    RAISE NOTICE '';
    RAISE NOTICE '✅ RLS policies configured for service_role';
    RAISE NOTICE '✅ Permissions granted correctly';
    RAISE NOTICE '✅ Test data with % questions inserted', question_count;
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Your application should now work!';
    RAISE NOTICE 'Try starting the test again.';
    RAISE NOTICE '=========================================';
END $$;
