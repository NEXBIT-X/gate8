-- Database Diagnostic Script
-- Run this to check your database setup

-- Check if tables exist
SELECT 
  schemaname,
  tablename,
  tableowner,
  hasindexes,
  hasrules,
  hastriggers
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('tests', 'questions', 'user_test_attempts', 'user_question_responses')
ORDER BY tablename;

-- Check if the test exists
SELECT 
  'Test Check' as check_type,
  COUNT(*) as count,
  ARRAY_AGG(id) as test_ids
FROM public.tests;

-- Check if questions exist for the test
SELECT 
  'Questions Check' as check_type,
  COUNT(*) as count,
  test_id
FROM public.questions 
WHERE test_id = '11111111-2222-3333-4444-555555555555'
GROUP BY test_id;

-- Check RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('tests', 'questions', 'user_test_attempts', 'user_question_responses')
ORDER BY tablename, policyname;

-- Check table structure for user_test_attempts
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'user_test_attempts'
ORDER BY ordinal_position;

-- Test if we can insert into user_test_attempts (this will fail but show the error)
DO $$
BEGIN
  -- This is just a test, we'll rollback
  BEGIN
    INSERT INTO public.user_test_attempts (user_id, test_id, answers) 
    VALUES (
      '00000000-0000-0000-0000-000000000000',  -- dummy user ID
      '11111111-2222-3333-4444-555555555555',   -- test ID
      '{}'::jsonb
    );
    RAISE NOTICE '✅ Insert test passed - table structure is correct';
    ROLLBACK;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '❌ Insert test failed: %', SQLERRM;
      ROLLBACK;
  END;
END $$;
