-- Fix the tests table to match the API expectations
-- Add missing columns to the tests table

ALTER TABLE public.tests 
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS total_questions integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_marks decimal(8,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Update existing tests if any
UPDATE public.tests 
SET 
  description = 'No description provided' 
WHERE description IS NULL;

-- Fix the questions table to match the API expectations
-- Add missing columns and rename if needed

ALTER TABLE public.questions 
ADD COLUMN IF NOT EXISTS question_text text,
ADD COLUMN IF NOT EXISTS marks decimal(4,2) DEFAULT 1.00,
ADD COLUMN IF NOT EXISTS question_number integer DEFAULT 1;

-- Copy data from old columns to new columns if they exist
UPDATE public.questions 
SET question_text = question 
WHERE question_text IS NULL AND question IS NOT NULL;

UPDATE public.questions 
SET marks = mark 
WHERE marks IS NULL AND mark IS NOT NULL;

-- Verify the structure
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'tests' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Also verify questions table structure
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'questions' 
  AND table_schema = 'public'
ORDER BY ordinal_position;
