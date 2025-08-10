-- Essential Database Setup for GATE Exam System
-- Run this in your Supabase SQL Editor

-- 1. Create tests table (if not exists)
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

-- 2. Create questions table (if not exists)
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

-- 3. Create user_test_attempts table (the missing one causing errors)
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

-- 4. Create user_question_responses table
CREATE TABLE IF NOT EXISTS user_question_responses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    attempt_id UUID REFERENCES user_test_attempts(id) ON DELETE CASCADE,
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    user_answer JSONB,
    is_correct BOOLEAN,
    marks_obtained DECIMAL(4,2) DEFAULT 0.00,
    time_spent_seconds INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(attempt_id, question_id)
);

-- 5. Enable Row Level Security on all tables
ALTER TABLE tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_test_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_question_responses ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS Policies

-- Tests policies (public read for active tests)
CREATE POLICY "Anyone can view active tests" ON tests
    FOR SELECT USING (is_active = true);

-- Questions policies (public read for questions of active tests)
CREATE POLICY "Anyone can view questions of active tests" ON questions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM tests 
            WHERE tests.id = questions.test_id 
            AND tests.is_active = true
        )
    );

-- User test attempts policies
CREATE POLICY "Users can view their own attempts" ON user_test_attempts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own attempts" ON user_test_attempts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own attempts" ON user_test_attempts
    FOR UPDATE USING (auth.uid() = user_id);

-- User question responses policies
CREATE POLICY "Users can view their own responses" ON user_question_responses
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_test_attempts 
            WHERE user_test_attempts.id = user_question_responses.attempt_id 
            AND user_test_attempts.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create their own responses" ON user_question_responses
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_test_attempts 
            WHERE user_test_attempts.id = user_question_responses.attempt_id 
            AND user_test_attempts.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own responses" ON user_question_responses
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_test_attempts 
            WHERE user_test_attempts.id = user_question_responses.attempt_id 
            AND user_test_attempts.user_id = auth.uid()
        )
    );

-- 7. Insert a sample test for development
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
    180,
    3,
    10.00,
    NOW() - INTERVAL '1 hour',
    NOW() + INTERVAL '7 days'
) ON CONFLICT DO NOTHING;

-- 8. Get the test ID for inserting questions
DO $$
DECLARE
    test_uuid UUID;
BEGIN
    SELECT id INTO test_uuid FROM tests WHERE title = 'GATE CSE Mock Test 1' LIMIT 1;
    
    IF test_uuid IS NOT NULL THEN
        -- Insert sample questions
        INSERT INTO questions (test_id, question_text, question_type, options, correct_answer, marks, negative_marks, question_number) VALUES
        (test_uuid, 'What is the time complexity of binary search?', 'MCQ', 
         '["O(n)", "O(log n)", "O(n log n)", "O(1)"]', 
         '"O(log n)"', 2.00, 0.66, 1),
        
        (test_uuid, 'Which of the following are sorting algorithms? (Select all that apply)', 'MSQ', 
         '["Bubble Sort", "Binary Search", "Quick Sort", "Merge Sort", "Linear Search"]', 
         '["Bubble Sort", "Quick Sort", "Merge Sort"]', 2.00, 0.66, 2),
        
        (test_uuid, 'How many nodes are there in a complete binary tree of height 3? (Enter numerical value)', 'NAT', 
         null, 
         '15', 2.00, 0.00, 3)
        ON CONFLICT (test_id, question_number) DO NOTHING;
    END IF;
END $$;

-- 9. Verify the setup
SELECT 
    'tests' as table_name, 
    count(*) as row_count 
FROM tests
UNION ALL
SELECT 
    'questions' as table_name, 
    count(*) as row_count 
FROM questions
UNION ALL
SELECT 
    'user_test_attempts' as table_name, 
    count(*) as row_count 
FROM user_test_attempts
UNION ALL
SELECT 
    'user_question_responses' as table_name, 
    count(*) as row_count 
FROM user_question_responses
ORDER BY table_name;
