-- Fix Database Schema to Match Application Requirements
-- Run this in your Supabase SQL Editor

-- Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Update profiles table to match the schema you provided
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS full_name text,
ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'student',
ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now();

-- Update tests table structure
ALTER TABLE public.tests 
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS start_time timestamp with time zone,
ADD COLUMN IF NOT EXISTS end_time timestamp with time zone,
ADD COLUMN IF NOT EXISTS duration_minutes integer NOT NULL DEFAULT 60,
ADD COLUMN IF NOT EXISTS questions integer[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now(),
ADD COLUMN IF NOT EXISTS difficulty text CHECK (difficulty IN ('easy', 'medium', 'hard'));

-- Update questions table to match your schema exactly
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

-- Create indexes for questions
CREATE INDEX IF NOT EXISTS questions_test_id_idx ON public.questions USING btree (test_id);
CREATE INDEX IF NOT EXISTS questions_type_idx ON public.questions USING btree (question_type);
CREATE INDEX IF NOT EXISTS questions_tag_idx ON public.questions USING btree (tag);

-- Create user_test_attempts table matching your schema
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
    -- Additional columns needed by the application
    total_score numeric(8, 2) DEFAULT 0.00,
    percentage numeric(5, 2) DEFAULT 0.00,
    CONSTRAINT user_test_attempts_pkey PRIMARY KEY (id),
    CONSTRAINT user_test_attempts_user_id_test_id_key UNIQUE (user_id, test_id),
    CONSTRAINT user_test_attempts_test_id_fkey FOREIGN KEY (test_id) REFERENCES tests (id) ON DELETE CASCADE,
    CONSTRAINT user_test_attempts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE
);

-- Create indexes for user_test_attempts
CREATE INDEX IF NOT EXISTS user_test_attempts_user_id_idx ON public.user_test_attempts USING btree (user_id);
CREATE INDEX IF NOT EXISTS user_test_attempts_test_id_idx ON public.user_test_attempts USING btree (test_id);
CREATE INDEX IF NOT EXISTS user_test_attempts_started_at_idx ON public.user_test_attempts USING btree (started_at);

-- Create user_question_responses table matching your schema
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

-- Create indexes for user_question_responses
CREATE INDEX IF NOT EXISTS user_question_responses_attempt_id_idx ON public.user_question_responses USING btree (attempt_id);
CREATE INDEX IF NOT EXISTS user_question_responses_question_id_idx ON public.user_question_responses USING btree (question_id);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_test_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_question_responses ENABLE ROW LEVEL SECURITY;

-- Drop existing policies and create new ones
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

-- Trigger to create profile on signup
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
