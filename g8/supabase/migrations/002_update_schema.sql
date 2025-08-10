-- Migration script to update database from old schema to new schema
-- Run this in your Supabase SQL Editor

-- Step 1: Add new columns to existing tables
ALTER TABLE public.tests 
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS start_time timestamp with time zone,
ADD COLUMN IF NOT EXISTS end_time timestamp with time zone,
ADD COLUMN IF NOT EXISTS questions integer[] DEFAULT '{}';

-- Step 2: Modify questions table structure
-- First, add new columns
ALTER TABLE public.questions 
ADD COLUMN IF NOT EXISTS question text,
ADD COLUMN IF NOT EXISTS correct_answer text,
ADD COLUMN IF NOT EXISTS mark int DEFAULT 1,
ADD COLUMN IF NOT EXISTS type text DEFAULT 'multiple_choice',
ADD COLUMN IF NOT EXISTS tag text;

-- Update existing data if needed (copy body to question if question is null)
UPDATE public.questions 
SET question = body 
WHERE question IS NULL AND body IS NOT NULL;

-- Step 3: Create new tables for user attempts and responses
CREATE TABLE IF NOT EXISTS public.user_test_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  test_id uuid not null references public.tests(id) on delete cascade,
  started_at timestamp with time zone not null default now(),
  submitted_at timestamp with time zone,
  answers jsonb not null default '{}', -- {question_id: user_answer}
  total_marks int not null default 0,
  obtained_marks int not null default 0,
  is_completed boolean not null default false,
  time_taken_seconds int default 0,
  created_at timestamp with time zone default now(),
  unique(user_id, test_id)
);

CREATE TABLE IF NOT EXISTS public.user_question_responses (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.user_test_attempts(id) on delete cascade,
  question_id int not null,
  user_answer text,
  is_correct boolean not null default false,
  marks_obtained int not null default 0,
  time_spent_seconds int default 0,
  created_at timestamp with time zone default now()
);

-- Step 4: Add new indexes
CREATE INDEX IF NOT EXISTS user_test_attempts_user_id_idx ON public.user_test_attempts(user_id);
CREATE INDEX IF NOT EXISTS user_test_attempts_test_id_idx ON public.user_test_attempts(test_id);
CREATE INDEX IF NOT EXISTS user_question_responses_attempt_id_idx ON public.user_question_responses(attempt_id);
CREATE INDEX IF NOT EXISTS user_question_responses_question_id_idx ON public.user_question_responses(question_id);
CREATE INDEX IF NOT EXISTS tests_start_time_idx ON public.tests(start_time);
CREATE INDEX IF NOT EXISTS tests_end_time_idx ON public.tests(end_time);

-- Step 5: Enable RLS on new tables
ALTER TABLE public.user_test_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_question_responses ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS policies for new tables
-- user_test_attempts policies
DROP POLICY IF EXISTS "attempts_insert_self" ON public.user_test_attempts;
CREATE POLICY "attempts_insert_self"
  ON public.user_test_attempts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "attempts_read_self_or_admin" ON public.user_test_attempts;
CREATE POLICY "attempts_read_self_or_admin"
  ON public.user_test_attempts FOR SELECT
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "attempts_update_self" ON public.user_test_attempts;
CREATE POLICY "attempts_update_self"
  ON public.user_test_attempts FOR UPDATE
  USING (auth.uid() = user_id);

-- user_question_responses policies
DROP POLICY IF EXISTS "responses_insert_own_attempt" ON public.user_question_responses;
CREATE POLICY "responses_insert_own_attempt"
  ON public.user_question_responses FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_test_attempts uta WHERE uta.id = attempt_id AND uta.user_id = auth.uid()));

DROP POLICY IF EXISTS "responses_read_own_attempt" ON public.user_question_responses;
CREATE POLICY "responses_read_own_attempt"
  ON public.user_question_responses FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.user_test_attempts uta WHERE uta.id = attempt_id AND (uta.user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))));

DROP POLICY IF EXISTS "responses_update_own_attempt" ON public.user_question_responses;
CREATE POLICY "responses_update_own_attempt"
  ON public.user_question_responses FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.user_test_attempts uta WHERE uta.id = attempt_id AND uta.user_id = auth.uid()));

-- Step 7: Update questions table to use serial ID instead of UUID for easier referencing
-- Note: This is optional and only if you want to start fresh with questions
-- If you have existing questions, you might want to keep them as UUID

-- For new installations or if you want to reset questions:
-- DROP TABLE IF EXISTS public.questions CASCADE;
-- CREATE TABLE public.questions (
--   id serial primary key,
--   question text not null,
--   correct_answer text not null,
--   mark int not null default 1,
--   type text not null default 'multiple_choice',
--   tag text,
--   explanation text,
--   options text[] not null,
--   created_at timestamp with time zone default now()
-- );

-- Re-enable RLS and recreate policies for questions if recreated
-- ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "questions_read_all" ON public.questions FOR SELECT USING (auth.role() = 'authenticated');
-- CREATE POLICY "questions_insert_admin" ON public.questions FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
-- CREATE POLICY "questions_update_admin" ON public.questions FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- Step 8: Sample data update for existing tests (optional)
-- Update existing tests to have start/end times if they don't exist
UPDATE public.tests 
SET 
  start_time = COALESCE(start_time, created_at),
  end_time = COALESCE(end_time, created_at + interval '2 hours'),
  tags = COALESCE(tags, ARRAY['general'])
WHERE start_time IS NULL OR end_time IS NULL OR tags IS NULL;

-- Migration complete message
DO $$
BEGIN
  RAISE NOTICE 'Database migration completed successfully!';
  RAISE NOTICE 'New tables created: user_test_attempts, user_question_responses';
  RAISE NOTICE 'Existing tables updated with new columns: tests, questions';
  RAISE NOTICE 'You can now use the new test application features!';
END $$;
