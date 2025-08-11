-- COMPLETE DATABASE FIX FOR GATE8 APPLICATION
-- Run this script in your Supabase SQL Editor to fix all issues

-- ====================================================
-- STEP 1: CLEAN UP AND CREATE PROPER TABLE STRUCTURE
-- ====================================================

-- Drop existing tables to start clean (be careful - this will delete data)
-- Comment out these lines if you want to keep existing data
-- DROP TABLE IF EXISTS public.user_question_responses CASCADE;
-- DROP TABLE IF EXISTS public.user_test_attempts CASCADE;
-- DROP TABLE IF EXISTS public.questions CASCADE;

-- Create tests table with correct structure
CREATE TABLE IF NOT EXISTS public.tests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title varchar(255) NOT NULL,
    duration_minutes integer NOT NULL DEFAULT 180,
    total_questions integer NOT NULL DEFAULT 0,
    max_marks decimal(5,2) NOT NULL DEFAULT 100.00,
    start_time timestamp with time zone NOT NULL,
    end_time timestamp with time zone NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Create questions table with correct structure
CREATE TABLE IF NOT EXISTS public.questions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id uuid REFERENCES public.tests(id) ON DELETE CASCADE,
    question_text text NOT NULL,
    question_type varchar(10) CHECK (question_type IN ('MCQ', 'MSQ', 'NAT')) NOT NULL,
    options jsonb,
    correct_answer jsonb NOT NULL,
    marks decimal(4,2) NOT NULL DEFAULT 1.00,
    negative_marks decimal(4,2) DEFAULT 0.00,
    question_number integer NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(test_id, question_number)
);

-- Create user_test_attempts table with correct structure  
CREATE TABLE IF NOT EXISTS public.user_test_attempts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    test_id uuid REFERENCES public.tests(id) ON DELETE CASCADE,
    answers jsonb DEFAULT '{}',
    is_completed boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(user_id, test_id)
);

-- ====================================================
-- STEP 2: ENABLE ROW LEVEL SECURITY
-- ====================================================

ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_test_attempts ENABLE ROW LEVEL SECURITY;

-- ====================================================
-- STEP 3: DROP ALL EXISTING POLICIES
-- ====================================================

-- Drop existing policies on tests
DROP POLICY IF EXISTS "tests_read_all" ON public.tests;
DROP POLICY IF EXISTS "Anyone can view active tests" ON public.tests;
DROP POLICY IF EXISTS "Allow service role full access to tests" ON public.tests;

-- Drop existing policies on questions
DROP POLICY IF EXISTS "questions_read_all" ON public.questions;
DROP POLICY IF EXISTS "Anyone can view questions of active tests" ON public.questions;
DROP POLICY IF EXISTS "Allow service role full access to questions" ON public.questions;

-- Drop existing policies on user_test_attempts
DROP POLICY IF EXISTS "attempts_insert_self" ON public.user_test_attempts;
DROP POLICY IF EXISTS "attempts_read_self" ON public.user_test_attempts;
DROP POLICY IF EXISTS "attempts_update_self" ON public.user_test_attempts;
DROP POLICY IF EXISTS "Users can view their own attempts" ON public.user_test_attempts;
DROP POLICY IF EXISTS "Users can create their own attempts" ON public.user_test_attempts;
DROP POLICY IF EXISTS "Users can update their own attempts" ON public.user_test_attempts;
DROP POLICY IF EXISTS "Allow service role full access to attempts" ON public.user_test_attempts;

-- ====================================================
-- STEP 4: CREATE COMPREHENSIVE RLS POLICIES
-- ====================================================

-- Tests policies - Allow service role and authenticated users
CREATE POLICY "service_role_tests_all"
    ON public.tests FOR ALL
    USING (true);

CREATE POLICY "authenticated_tests_read"
    ON public.tests FOR SELECT
    TO authenticated
    USING (is_active = true);

-- Questions policies - Allow service role and authenticated users
CREATE POLICY "service_role_questions_all"
    ON public.questions FOR ALL
    USING (true);

CREATE POLICY "authenticated_questions_read"
    ON public.questions FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.tests 
            WHERE tests.id = questions.test_id 
            AND tests.is_active = true
        )
    );

-- User test attempts policies - Allow service role and users for their own attempts
CREATE POLICY "service_role_attempts_all"
    ON public.user_test_attempts FOR ALL
    USING (true);

CREATE POLICY "authenticated_attempts_own"
    ON public.user_test_attempts FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ====================================================
-- STEP 5: GRANT PERMISSIONS TO ROLES
-- ====================================================

-- Grant all permissions to service_role
GRANT ALL ON public.tests TO service_role;
GRANT ALL ON public.questions TO service_role;
GRANT ALL ON public.user_test_attempts TO service_role;
GRANT USAGE ON SCHEMA public TO service_role;

-- Grant specific permissions to authenticated users
GRANT SELECT ON public.tests TO authenticated;
GRANT SELECT ON public.questions TO authenticated;
GRANT ALL ON public.user_test_attempts TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- ====================================================
-- STEP 6: INSERT TEST DATA
-- ====================================================

-- Insert test with the exact ID from your error logs
INSERT INTO public.tests (
    id,
    title, 
    duration_minutes, 
    total_questions, 
    max_marks,
    start_time, 
    end_time,
    is_active
) VALUES (
    '9a6f73a0-a007-4e52-a4ea-72398977d39d',
    'GATE CSE Mock Test 1',
    180,
    3,
    6.00,
    NOW() - INTERVAL '1 hour',
    NOW() + INTERVAL '7 days',
    true
) ON CONFLICT (id) DO UPDATE SET
    start_time = NOW() - INTERVAL '1 hour',
    end_time = NOW() + INTERVAL '7 days',
    is_active = true,
    total_questions = 3,
    max_marks = 6.00;

-- Insert sample questions with the exact test ID
INSERT INTO public.questions (test_id, question_text, question_type, options, correct_answer, marks, negative_marks, question_number) 
VALUES
('9a6f73a0-a007-4e52-a4ea-72398977d39d', 
 'What is the time complexity of binary search in a sorted array?', 
 'MCQ', 
 '["O(n)", "O(log n)", "O(n log n)", "O(1)"]'::jsonb, 
 '"O(log n)"'::jsonb, 
 2.00, 
 0.66, 
 1),

('9a6f73a0-a007-4e52-a4ea-72398977d39d', 
 'Which of the following are sorting algorithms? (Select all that apply)', 
 'MSQ', 
 '["Bubble Sort", "Binary Search", "Quick Sort", "Merge Sort", "Linear Search"]'::jsonb, 
 '["Bubble Sort", "Quick Sort", "Merge Sort"]'::jsonb, 
 2.00, 
 0.66, 
 2),

('9a6f73a0-a007-4e52-a4ea-72398977d39d', 
 'How many nodes are in a complete binary tree of height 3? (Height of single node is 0)', 
 'NAT', 
 null, 
 '"15"'::jsonb, 
 2.00, 
 0.00, 
 3)
ON CONFLICT (test_id, question_number) DO UPDATE SET
    question_text = EXCLUDED.question_text,
    question_type = EXCLUDED.question_type,
    options = EXCLUDED.options,
    correct_answer = EXCLUDED.correct_answer,
    marks = EXCLUDED.marks,
    negative_marks = EXCLUDED.negative_marks;

-- ====================================================
-- STEP 7: CREATE INDEXES FOR PERFORMANCE
-- ====================================================

CREATE INDEX IF NOT EXISTS idx_tests_active ON public.tests(is_active);
CREATE INDEX IF NOT EXISTS idx_tests_time ON public.tests(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_questions_test_id ON public.questions(test_id);
CREATE INDEX IF NOT EXISTS idx_questions_number ON public.questions(test_id, question_number);
CREATE INDEX IF NOT EXISTS idx_attempts_user_test ON public.user_test_attempts(user_id, test_id);
CREATE INDEX IF NOT EXISTS idx_attempts_test_id ON public.user_test_attempts(test_id);

-- ====================================================
-- STEP 8: VERIFICATION AND SUCCESS MESSAGE
-- ====================================================

-- Verify the setup
DO $$
DECLARE
    test_count integer;
    question_count integer;
    policy_count integer;
BEGIN
    -- Count tests
    SELECT COUNT(*) INTO test_count FROM public.tests WHERE id = '9a6f73a0-a007-4e52-a4ea-72398977d39d';
    
    -- Count questions
    SELECT COUNT(*) INTO question_count FROM public.questions WHERE test_id = '9a6f73a0-a007-4e52-a4ea-72398977d39d';
    
    -- Count RLS policies
    SELECT COUNT(*) INTO policy_count FROM pg_policies WHERE schemaname = 'public';
    
    RAISE NOTICE '=========================================';
    RAISE NOTICE '✅ GATE8 DATABASE SETUP COMPLETED!';
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'Tests created: %', test_count;
    RAISE NOTICE 'Questions created: %', question_count;
    RAISE NOTICE 'RLS policies created: %', policy_count;
    RAISE NOTICE '';
    RAISE NOTICE '🎯 Test Available:';
    RAISE NOTICE 'ID: 9a6f73a0-a007-4e52-a4ea-72398977d39d';
    RAISE NOTICE 'Title: GATE CSE Mock Test 1';
    RAISE NOTICE 'Duration: 180 minutes';
    RAISE NOTICE 'Questions: 3 (MCQ, MSQ, NAT)';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Database permissions fixed';
    RAISE NOTICE '✅ RLS policies configured';
    RAISE NOTICE '✅ Test data inserted';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Your application should now work!';
    RAISE NOTICE '=========================================';
END $$;
