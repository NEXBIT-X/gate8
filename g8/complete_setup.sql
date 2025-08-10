-- COMPLETE SETUP: Database + Test Data
-- Copy and run this ENTIRE script in your Supabase SQL Editor

-- ==============================================
-- PART 1: DATABASE SETUP
-- ==============================================

-- Step 1: Create tests table (if not exists)
CREATE TABLE IF NOT EXISTS public.tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  tags text[] DEFAULT ARRAY[]::text[],
  start_time timestamp with time zone DEFAULT now(),
  end_time timestamp with time zone DEFAULT (now() + interval '2 hours'),
  duration_minutes integer NOT NULL DEFAULT 60,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now()
);

-- Step 2: Create questions table with GATE exam types
CREATE TABLE IF NOT EXISTS public.questions (
  id serial PRIMARY KEY,
  test_id uuid NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  question text NOT NULL,
  question_type text NOT NULL CHECK (question_type IN ('MCQ', 'MSQ', 'NAT')),
  options text[], -- NULL for NAT questions
  correct_answer text NOT NULL, -- For MCQ: 'A', 'B', etc. For MSQ: 'A,B,C'. For NAT: numeric value
  marks decimal(4,2) NOT NULL DEFAULT 1.00,
  negative_marks decimal(4,2) NOT NULL DEFAULT 0.00,
  tag text,
  explanation text,
  created_at timestamp with time zone DEFAULT now()
);

-- Step 3: Create user attempt tracking tables
CREATE TABLE IF NOT EXISTS public.user_test_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  test_id uuid NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb, -- {question_id: user_answer}
  total_score decimal(8,2) NOT NULL DEFAULT 0.00,
  percentage decimal(5,2) NOT NULL DEFAULT 0.00,
  is_completed boolean NOT NULL DEFAULT false,
  time_taken_seconds integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, test_id)
);

CREATE TABLE IF NOT EXISTS public.user_question_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES public.user_test_attempts(id) ON DELETE CASCADE,
  question_id integer NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  question_type text NOT NULL,
  user_answer text,
  is_correct boolean NOT NULL DEFAULT false,
  marks_obtained decimal(4,2) NOT NULL DEFAULT 0.00,
  created_at timestamp with time zone DEFAULT now()
);

-- Step 4: Create indexes for better performance
CREATE INDEX IF NOT EXISTS questions_test_id_idx ON public.questions(test_id);
CREATE INDEX IF NOT EXISTS questions_type_idx ON public.questions(question_type);
CREATE INDEX IF NOT EXISTS user_test_attempts_user_id_idx ON public.user_test_attempts(user_id);
CREATE INDEX IF NOT EXISTS user_test_attempts_test_id_idx ON public.user_test_attempts(test_id);
CREATE INDEX IF NOT EXISTS user_question_responses_attempt_id_idx ON public.user_question_responses(attempt_id);
CREATE INDEX IF NOT EXISTS tests_start_time_idx ON public.tests(start_time);
CREATE INDEX IF NOT EXISTS tests_end_time_idx ON public.tests(end_time);

-- Step 5: Enable RLS on all tables
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_test_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_question_responses ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS policies

-- Tests policies (allow all authenticated users to read)
DROP POLICY IF EXISTS "tests_read_all" ON public.tests;
CREATE POLICY "tests_read_all"
  ON public.tests FOR SELECT
  USING (auth.role() = 'authenticated');

-- Questions policies (allow all authenticated users to read)
DROP POLICY IF EXISTS "questions_read_all" ON public.questions;
CREATE POLICY "questions_read_all"
  ON public.questions FOR SELECT
  USING (auth.role() = 'authenticated');

-- User test attempts policies
DROP POLICY IF EXISTS "attempts_insert_self" ON public.user_test_attempts;
CREATE POLICY "attempts_insert_self"
  ON public.user_test_attempts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "attempts_read_self" ON public.user_test_attempts;
CREATE POLICY "attempts_read_self"
  ON public.user_test_attempts FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "attempts_update_self" ON public.user_test_attempts;
CREATE POLICY "attempts_update_self"
  ON public.user_test_attempts FOR UPDATE
  USING (auth.uid() = user_id);

-- User question responses policies
DROP POLICY IF EXISTS "responses_insert_own_attempt" ON public.user_question_responses;
CREATE POLICY "responses_insert_own_attempt"
  ON public.user_question_responses FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_test_attempts uta 
      WHERE uta.id = attempt_id AND uta.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "responses_read_own_attempt" ON public.user_question_responses;
CREATE POLICY "responses_read_own_attempt"
  ON public.user_question_responses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_test_attempts uta 
      WHERE uta.id = attempt_id AND uta.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "responses_update_own_attempt" ON public.user_question_responses;
CREATE POLICY "responses_update_own_attempt"
  ON public.user_question_responses FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_test_attempts uta 
      WHERE uta.id = attempt_id AND uta.user_id = auth.uid()
    )
  );

-- ==============================================
-- PART 2: INSERT TEST DATA
-- ==============================================

-- Insert the test
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

-- ==============================================
-- PART 3: VERIFICATION
-- ==============================================

-- Check if everything was created successfully
DO $$
DECLARE
  test_count INTEGER;
  question_count INTEGER;
BEGIN
  -- Count tests
  SELECT COUNT(*) INTO test_count FROM public.tests WHERE id = '11111111-2222-3333-4444-555555555555';
  
  -- Count questions
  SELECT COUNT(*) INTO question_count FROM public.questions WHERE test_id = '11111111-2222-3333-4444-555555555555';
  
  RAISE NOTICE '=== SETUP COMPLETED SUCCESSFULLY ===';
  RAISE NOTICE 'Database tables: ✓ Created';
  RAISE NOTICE 'RLS policies: ✓ Enabled';
  RAISE NOTICE 'Test created: % (ID: 11111111-2222-3333-4444-555555555555)', test_count;
  RAISE NOTICE 'Questions created: %', question_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Test Details:';
  RAISE NOTICE '- Title: Simple CS Test';
  RAISE NOTICE '- Duration: 30 minutes';
  RAISE NOTICE '- Available: NOW (for 2 hours)';
  RAISE NOTICE '- Questions: % (MCQ, MSQ, NAT)', question_count;
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Ready to test the application!';
  RAISE NOTICE 'Visit: http://localhost:3000/protected/dash';
END $$;
