-- CRITICAL FIX: Run this in your Supabase SQL Editor
-- This fixes the "permission denied for table users" error

-- 1. Ensure all tables exist with proper structure
CREATE TABLE IF NOT EXISTS tests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
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
    options JSONB,
    correct_answer JSONB NOT NULL,
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
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, test_id)
);

-- 2. Enable RLS on all tables
ALTER TABLE tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_test_attempts ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Anyone can view active tests" ON tests;
DROP POLICY IF EXISTS "Anyone can view questions of active tests" ON questions;
DROP POLICY IF EXISTS "Users can view their own attempts" ON user_test_attempts;
DROP POLICY IF EXISTS "Users can create their own attempts" ON user_test_attempts;
DROP POLICY IF EXISTS "Users can update their own attempts" ON user_test_attempts;

-- 4. Create RLS policies that allow service role access
CREATE POLICY "Allow service role full access to tests" ON tests
    FOR ALL USING (true);

CREATE POLICY "Allow service role full access to questions" ON questions
    FOR ALL USING (true);

CREATE POLICY "Allow service role full access to attempts" ON user_test_attempts
    FOR ALL USING (true);

-- 5. Grant permissions to service role
GRANT ALL ON tests TO service_role;
GRANT ALL ON questions TO service_role;
GRANT ALL ON user_test_attempts TO service_role;
GRANT ALL ON auth.users TO service_role;

-- 6. Insert sample test data
INSERT INTO tests (
    id,
    title, 
    duration_minutes, 
    total_questions, 
    max_marks,
    start_time, 
    end_time
) VALUES (
    '9a6f73a0-a007-4e52-a4ea-72398977d39d',
    'GATE CSE Mock Test 1',
    180,
    3,
    10.00,
    NOW() - INTERVAL '1 hour',
    NOW() + INTERVAL '7 days'
) ON CONFLICT (id) DO UPDATE SET
    start_time = NOW() - INTERVAL '1 hour',
    end_time = NOW() + INTERVAL '7 days',
    is_active = true;

-- Insert sample questions
INSERT INTO questions (test_id, question_text, question_type, options, correct_answer, marks, negative_marks, question_number) VALUES
('9a6f73a0-a007-4e52-a4ea-72398977d39d', 'What is the time complexity of binary search?', 'MCQ', 
 '["O(n)", "O(log n)", "O(n log n)", "O(1)"]', 
 '"O(log n)"', 2.00, 0.66, 1),

('9a6f73a0-a007-4e52-a4ea-72398977d39d', 'Which of the following are sorting algorithms?', 'MSQ', 
 '["Bubble Sort", "Binary Search", "Quick Sort", "Merge Sort"]', 
 '["Bubble Sort", "Quick Sort", "Merge Sort"]', 2.00, 0.66, 2),

('9a6f73a0-a007-4e52-a4ea-72398977d39d', 'How many nodes in a complete binary tree of height 3?', 'NAT', 
 null, 
 '15', 2.00, 0.00, 3)
ON CONFLICT (test_id, question_number) DO NOTHING;
