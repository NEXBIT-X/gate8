-- QUICK FIX: Create essential tables for test attempts
-- Run this in your Supabase SQL Editor

-- 1. Create user_test_attempts table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_test_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  test_id uuid NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  total_score decimal(8,2) NOT NULL DEFAULT 0.00,
  percentage decimal(5,2) NOT NULL DEFAULT 0.00,
  is_completed boolean NOT NULL DEFAULT false,
  time_taken_seconds integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, test_id)
);

-- 2. Enable RLS
ALTER TABLE public.user_test_attempts ENABLE ROW LEVEL SECURITY;

-- 3. Create policies for user_test_attempts
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

-- 4. Check if the test exists
SELECT 
  id, 
  title, 
  start_time < NOW() as started,
  end_time > NOW() as available
FROM public.tests 
WHERE id = '11111111-2222-3333-4444-555555555555';

-- 5. Success message
DO $$
BEGIN
  RAISE NOTICE '✅ user_test_attempts table created/verified';
  RAISE NOTICE '✅ RLS policies created';
  RAISE NOTICE 'You can now try starting the test again!';
END $$;
