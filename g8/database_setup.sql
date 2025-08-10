-- Complete Database Setup for GATE Exam System
-- Run this FIRST in your Supabase SQL Editor

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

-- Success message
DO $$
BEGIN
  RAISE NOTICE '=== DATABASE SETUP COMPLETED ===';
  RAISE NOTICE 'Tables created: tests, questions, user_test_attempts, user_question_responses';
  RAISE NOTICE 'RLS policies enabled for security';
  RAISE NOTICE 'Ready for test data insertion!';
END $$;
