-- Verification script to check if the simple test was created properly
-- Run this after inserting the test data

-- Check if test exists
SELECT 
  id,
  title,
  duration_minutes,
  start_time < NOW() as is_started,
  end_time > NOW() as is_available,
  array_length(tags, 1) as tag_count
FROM public.tests 
WHERE id = '11111111-2222-3333-4444-555555555555';

-- Check questions for the test
SELECT 
  id,
  question_type,
  LEFT(question, 50) || '...' as question_preview,
  CASE 
    WHEN options IS NOT NULL THEN array_length(options, 1)
    ELSE 0
  END as option_count,
  correct_answer,
  marks,
  negative_marks
FROM public.questions 
WHERE test_id = '11111111-2222-3333-4444-555555555555'
ORDER BY id;

-- Count questions by type
SELECT 
  question_type,
  COUNT(*) as count,
  SUM(marks) as total_marks
FROM public.questions 
WHERE test_id = '11111111-2222-3333-4444-555555555555'
GROUP BY question_type;

-- Show test availability status
SELECT 
  CASE 
    WHEN NOW() < start_time THEN 'UPCOMING'
    WHEN NOW() BETWEEN start_time AND end_time THEN 'AVAILABLE'
    WHEN NOW() > end_time THEN 'ENDED'
  END as status,
  title,
  start_time,
  end_time
FROM public.tests 
WHERE id = '11111111-2222-3333-4444-555555555555';
