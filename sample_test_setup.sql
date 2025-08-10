-- Quick Setup: Sample Test with Questions
-- Run this in your Supabase SQL Editor

-- 1. Ensure tables exist (if not already created)
CREATE TABLE IF NOT EXISTS tests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    duration_minutes INTEGER NOT NULL DEFAULT 180,
    total_questions INTEGER NOT NULL DEFAULT 0,
    max_marks DECIMAL(5,2) NOT NULL DEFAULT 100.00,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS questions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    test_id UUID REFERENCES tests(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type VARCHAR(10) CHECK (question_type IN ('MCQ', 'MSQ', 'NAT')) NOT NULL,
    options JSONB, -- For MCQ/MSQ: array of options, For NAT: null
    correct_answer JSONB NOT NULL, -- For MCQ: single value, MSQ: array, NAT: numeric value
    marks DECIMAL(4,2) NOT NULL DEFAULT 1.00,
    negative_marks DECIMAL(4,2) DEFAULT 0.00,
    question_number INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(test_id, question_number)
);

CREATE TABLE IF NOT EXISTS user_test_attempts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    test_id UUID REFERENCES tests(id) ON DELETE CASCADE,
    answers JSONB DEFAULT '{}',
    total_score DECIMAL(5,2) DEFAULT 0.00,
    percentage DECIMAL(5,2) DEFAULT 0.00,
    is_completed BOOLEAN DEFAULT FALSE,
    time_taken_seconds INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, test_id)
);

-- Enable RLS
ALTER TABLE tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_test_attempts ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
DROP POLICY IF EXISTS "Anyone can view active tests" ON tests;
CREATE POLICY "Anyone can view active tests" ON tests
    FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Anyone can view questions of active tests" ON questions;
CREATE POLICY "Anyone can view questions of active tests" ON questions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM tests 
            WHERE tests.id = questions.test_id 
            AND tests.is_active = true
        )
    );

DROP POLICY IF EXISTS "Users can view their own attempts" ON user_test_attempts;
CREATE POLICY "Users can view their own attempts" ON user_test_attempts
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own attempts" ON user_test_attempts;
CREATE POLICY "Users can create their own attempts" ON user_test_attempts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own attempts" ON user_test_attempts;
CREATE POLICY "Users can update their own attempts" ON user_test_attempts
    FOR UPDATE USING (auth.uid() = user_id);

-- 2. Delete any existing sample data to avoid conflicts
DELETE FROM questions WHERE test_id IN (SELECT id FROM tests WHERE title LIKE 'GATE CSE%');
DELETE FROM tests WHERE title LIKE 'GATE CSE%';

-- 3. Create a sample test
INSERT INTO tests (
    title, 
    description, 
    duration_minutes, 
    total_questions, 
    max_marks,
    start_time, 
    end_time
) VALUES (
    'GATE CSE Mock Test 1',
    'Computer Science and Engineering mock test with MCQ, MSQ, and NAT questions',
    60,
    5,
    10.00,
    NOW() - INTERVAL '1 hour',
    NOW() + INTERVAL '7 days'
);

-- 4. Get the test ID and insert questions
DO $$
DECLARE
    test_uuid UUID;
BEGIN
    SELECT id INTO test_uuid FROM tests WHERE title = 'GATE CSE Mock Test 1' LIMIT 1;
    
    IF test_uuid IS NOT NULL THEN
        -- Insert 5 sample questions
        INSERT INTO questions (test_id, question_text, question_type, options, correct_answer, marks, negative_marks, question_number) VALUES
        
        (test_uuid, 'What is the time complexity of binary search in a sorted array?', 'MCQ', 
         '["O(n)", "O(log n)", "O(n log n)", "O(1)"]', 
         '"O(log n)"', 2.00, 0.66, 1),
        
        (test_uuid, 'Which of the following are sorting algorithms? (Select all correct options)', 'MSQ', 
         '["Bubble Sort", "Binary Search", "Quick Sort", "Merge Sort", "Linear Search"]', 
         '["Bubble Sort", "Quick Sort", "Merge Sort"]', 2.00, 0.66, 2),
        
        (test_uuid, 'How many nodes are there in a complete binary tree of height 3? (Enter numerical value only)', 'NAT', 
         null, 
         '15', 2.00, 0.00, 3),
        
        (test_uuid, 'Which data structure uses LIFO (Last In First Out) principle?', 'MCQ', 
         '["Queue", "Stack", "Array", "Linked List"]', 
         '"Stack"', 2.00, 0.66, 4),
        
        (test_uuid, 'What is the maximum number of edges in a simple graph with n vertices? (Enter numerical formula: use n for vertices)', 'NAT', 
         null, 
         'n*(n-1)/2', 2.00, 0.00, 5);
        
        -- Update total questions count
        UPDATE tests SET total_questions = 5 WHERE id = test_uuid;
    END IF;
END $$;

-- 5. Verify the setup
SELECT 
    'Tests' as table_name, 
    COUNT(*) as count,
    STRING_AGG(title, ', ') as titles
FROM tests
WHERE is_active = true
UNION ALL
SELECT 
    'Questions' as table_name, 
    COUNT(*) as count,
    STRING_AGG(DISTINCT question_type, ', ') as types
FROM questions
UNION ALL
SELECT 
    'User Attempts' as table_name, 
    COUNT(*) as count,
    'N/A' as info
FROM user_test_attempts
ORDER BY table_name;
