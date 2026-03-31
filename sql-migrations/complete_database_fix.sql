-- COMPLETE FIX FOR TEST FUNCTIONALITY
-- Run this ENTIRE script in your Supabase SQL Editor

-- Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Fix profiles table
DO $$ 
BEGIN
    -- Check if profiles table exists, if not create it
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'profiles' AND table_schema = 'public') THEN
        CREATE TABLE public.profiles (
            id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
            full_name text,
            role text NOT NULL DEFAULT 'student',
            created_at timestamp with time zone DEFAULT now()
        );
    ELSE
        -- Add missing columns if they don't exist
        ALTER TABLE public.profiles 
        ADD COLUMN IF NOT EXISTS full_name text,
        ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'student',
        ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now();
    END IF;
END $$;

-- Fix tests table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'tests' AND table_schema = 'public') THEN
        CREATE TABLE public.tests (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            title text NOT NULL,
            tags text[] DEFAULT '{}',
            start_time timestamp with time zone,
            end_time timestamp with time zone,
            duration_minutes integer NOT NULL DEFAULT 60,
            questions integer[] DEFAULT '{}',
            created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
            created_at timestamp with time zone DEFAULT now(),
            difficulty text CHECK (difficulty IN ('easy', 'medium', 'hard'))
        );
    ELSE
        ALTER TABLE public.tests 
        ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
        ADD COLUMN IF NOT EXISTS start_time timestamp with time zone,
        ADD COLUMN IF NOT EXISTS end_time timestamp with time zone,
        ADD COLUMN IF NOT EXISTS duration_minutes integer NOT NULL DEFAULT 60,
        ADD COLUMN IF NOT EXISTS questions integer[] DEFAULT '{}',
        ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now(),
        ADD COLUMN IF NOT EXISTS difficulty text CHECK (difficulty IN ('easy', 'medium', 'hard'));
    END IF;
END $$;

-- Completely recreate questions table to ensure it matches exactly
DROP TABLE IF EXISTS public.questions CASCADE;
CREATE TABLE public.questions (
    id serial NOT NULL,
    test_id uuid NOT NULL,
    question text NOT NULL,
    question_type text NOT NULL,
    options text[] NULL,
    correct_answer text NOT NULL,
    marks numeric(4, 2) NOT NULL DEFAULT 1.00,
    negative_marks numeric(4, 2) NOT NULL DEFAULT 0.00,
    tag text NULL,
    explanation text NULL,
    created_at timestamp with time zone NULL DEFAULT now(),
    difficulty text NULL,
    CONSTRAINT questions_pkey PRIMARY KEY (id),
    CONSTRAINT questions_test_id_fkey FOREIGN KEY (test_id) REFERENCES tests (id) ON DELETE CASCADE,
    CONSTRAINT questions_difficulty_check CHECK (
        difficulty = ANY (ARRAY['easy'::text, 'medium'::text, 'hard'::text])
    ),
    CONSTRAINT questions_question_type_check CHECK (
        question_type = ANY (ARRAY['MCQ'::text, 'MSQ'::text, 'NAT'::text])
    )
);

-- Completely recreate user_test_attempts table
DROP TABLE IF EXISTS public.user_test_attempts CASCADE;
CREATE TABLE public.user_test_attempts (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    test_id uuid NOT NULL,
    started_at timestamp with time zone NOT NULL DEFAULT now(),
    submitted_at timestamp with time zone NULL,
    answers jsonb NOT NULL DEFAULT '{}'::jsonb,
    total_marks integer NOT NULL DEFAULT 0,
    obtained_marks integer NOT NULL DEFAULT 0,
    is_completed boolean NOT NULL DEFAULT false,
    time_taken_seconds integer NULL DEFAULT 0,
    created_at timestamp with time zone NULL DEFAULT now(),
    total_score numeric(8, 2) DEFAULT 0.00,
    percentage numeric(5, 2) DEFAULT 0.00,
    CONSTRAINT user_test_attempts_pkey PRIMARY KEY (id),
    -- This constraint ensures one attempt per user per test
    CONSTRAINT user_test_attempts_user_id_test_id_key UNIQUE (user_id, test_id),
    CONSTRAINT user_test_attempts_test_id_fkey FOREIGN KEY (test_id) REFERENCES tests (id) ON DELETE CASCADE,
    CONSTRAINT user_test_attempts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE
);

-- Completely recreate user_question_responses table
DROP TABLE IF EXISTS public.user_question_responses CASCADE;
CREATE TABLE public.user_question_responses (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    attempt_id uuid NOT NULL,
    question_id integer NOT NULL,
    user_answer text NULL,
    is_correct boolean NOT NULL DEFAULT false,
    marks_obtained integer NOT NULL DEFAULT 0,
    time_spent_seconds integer NULL DEFAULT 0,
    created_at timestamp with time zone NULL DEFAULT now(),
    CONSTRAINT user_question_responses_pkey PRIMARY KEY (id),
    CONSTRAINT user_question_responses_attempt_id_fkey FOREIGN KEY (attempt_id) REFERENCES user_test_attempts (id) ON DELETE CASCADE,
    CONSTRAINT user_question_responses_question_id_fkey FOREIGN KEY (question_id) REFERENCES questions (id) ON DELETE CASCADE
);

-- Create all necessary indexes
CREATE INDEX IF NOT EXISTS questions_test_id_idx ON public.questions USING btree (test_id);
CREATE INDEX IF NOT EXISTS questions_type_idx ON public.questions USING btree (question_type);
CREATE INDEX IF NOT EXISTS questions_tag_idx ON public.questions USING btree (tag);
CREATE INDEX IF NOT EXISTS user_test_attempts_user_id_idx ON public.user_test_attempts USING btree (user_id);
CREATE INDEX IF NOT EXISTS user_test_attempts_test_id_idx ON public.user_test_attempts USING btree (test_id);
CREATE INDEX IF NOT EXISTS user_test_attempts_started_at_idx ON public.user_test_attempts USING btree (started_at);
CREATE INDEX IF NOT EXISTS user_question_responses_attempt_id_idx ON public.user_question_responses USING btree (attempt_id);
CREATE INDEX IF NOT EXISTS user_question_responses_question_id_idx ON public.user_question_responses USING btree (question_id);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_test_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_question_responses ENABLE ROW LEVEL SECURITY;

-- Drop and recreate all policies
-- Profiles policies
DROP POLICY IF EXISTS "profiles_read_self_or_admin" ON public.profiles;
CREATE POLICY "profiles_read_self_or_admin" ON public.profiles 
    FOR SELECT USING (auth.uid() = id OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "profiles_update_self" ON public.profiles;
CREATE POLICY "profiles_update_self" ON public.profiles 
    FOR UPDATE USING (auth.uid() = id);

-- Tests policies
DROP POLICY IF EXISTS "tests_read_all" ON public.tests;
CREATE POLICY "tests_read_all" ON public.tests 
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "tests_insert_admin" ON public.tests;
CREATE POLICY "tests_insert_admin" ON public.tests 
    FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- Questions policies
DROP POLICY IF EXISTS "questions_read_all" ON public.questions;
CREATE POLICY "questions_read_all" ON public.questions 
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "questions_insert_admin" ON public.questions;
CREATE POLICY "questions_insert_admin" ON public.questions 
    FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "questions_update_admin" ON public.questions;
CREATE POLICY "questions_update_admin" ON public.questions 
    FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- User test attempts policies
DROP POLICY IF EXISTS "attempts_insert_self" ON public.user_test_attempts;
CREATE POLICY "attempts_insert_self" ON public.user_test_attempts 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "attempts_read_self_or_admin" ON public.user_test_attempts;
CREATE POLICY "attempts_read_self_or_admin" ON public.user_test_attempts 
    FOR SELECT USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "attempts_update_self" ON public.user_test_attempts;
CREATE POLICY "attempts_update_self" ON public.user_test_attempts 
    FOR UPDATE USING (auth.uid() = user_id);

-- User question responses policies
DROP POLICY IF EXISTS "responses_insert_own_attempt" ON public.user_question_responses;
CREATE POLICY "responses_insert_own_attempt" ON public.user_question_responses 
    FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.user_test_attempts uta WHERE uta.id = attempt_id AND uta.user_id = auth.uid()));

DROP POLICY IF EXISTS "responses_read_own_attempt" ON public.user_question_responses;
CREATE POLICY "responses_read_own_attempt" ON public.user_question_responses 
    FOR SELECT USING (EXISTS (SELECT 1 FROM public.user_test_attempts uta WHERE uta.id = attempt_id AND (uta.user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))));

DROP POLICY IF EXISTS "responses_update_own_attempt" ON public.user_question_responses;
CREATE POLICY "responses_update_own_attempt" ON public.user_question_responses 
    FOR UPDATE USING (EXISTS (SELECT 1 FROM public.user_test_attempts uta WHERE uta.id = attempt_id AND uta.user_id = auth.uid()));

-- Create or replace the user profile trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, role)
    VALUES (new.id, new.raw_user_meta_data->>'full_name', COALESCE(new.raw_user_meta_data->>'role','student'))
    ON CONFLICT (id) DO NOTHING;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- NOW INSERT TEST DATA WITH PROPER RELATIONSHIPS

-- Insert a working test
INSERT INTO public.tests (id, title, tags, start_time, end_time, duration_minutes) VALUES 
('550e8400-e29b-41d4-a716-446655440000', 'Working Computer Science Test', 
 ARRAY['CS', 'Programming', 'Algorithms'], 
 NOW() - INTERVAL '1 hour', 
 NOW() + INTERVAL '1 day', 
 120)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    tags = EXCLUDED.tags,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    duration_minutes = EXCLUDED.duration_minutes;

-- Insert questions for the test
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
 'Which of the following are sorting algorithms? (Select all that apply)', 
 'MSQ', 
 ARRAY['Quick Sort', 'Binary Search', 'Merge Sort', 'Bubble Sort', 'Linear Search'], 
 'Quick Sort,Merge Sort,Bubble Sort', 
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
 'A complete binary tree of height h has 2^(h+1) - 1 nodes. For height 3: 2^4 - 1 = 15 nodes.'),

('550e8400-e29b-41d4-a716-446655440000', 
 'What is the worst-case time complexity of QuickSort?', 
 'MCQ', 
 ARRAY['O(n)', 'O(n log n)', 'O(n²)', 'O(log n)'], 
 'O(n²)', 
 2.0, 
 0.5, 
 'Algorithms',
 'QuickSort has O(n²) worst-case complexity when the pivot is always the smallest or largest element.'),

('550e8400-e29b-41d4-a716-446655440000', 
 'Which data structures use LIFO principle?', 
 'MSQ', 
 ARRAY['Stack', 'Queue', 'Deque', 'Priority Queue', 'Array'], 
 'Stack', 
 2.0, 
 0.5, 
 'Data Structures',
 'Stack follows Last In First Out (LIFO) principle. Queue follows FIFO, others have different access patterns.');

-- Update the test to include the question IDs (get the actual IDs that were just inserted)
UPDATE public.tests 
SET questions = (
    SELECT ARRAY_AGG(id ORDER BY id) 
    FROM public.questions 
    WHERE test_id = '550e8400-e29b-41d4-a716-446655440000'
)
WHERE id = '550e8400-e29b-41d4-a716-446655440000';

-- Verify the setup worked
SELECT 
    t.title,
    t.duration_minutes,
    t.start_time < NOW() as has_started,
    t.end_time > NOW() as still_available,
    COUNT(q.id) as question_count,
    ARRAY_AGG(q.id ORDER BY q.id) as question_ids
FROM tests t
LEFT JOIN questions q ON t.id = q.test_id
WHERE t.id = '550e8400-e29b-41d4-a716-446655440000'
GROUP BY t.id, t.title, t.duration_minutes, t.start_time, t.end_time;

-- Show confirmation message
SELECT 'Database setup complete! Test data inserted successfully.' as status;
