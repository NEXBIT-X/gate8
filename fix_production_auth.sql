-- Fix Production Authentication Issues
-- Run this in your production Supabase SQL Editor

-- 1. First, ensure all required tables exist
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
    total_score DECIMAL(5,2) DEFAULT 0.00,
    percentage DECIMAL(5,2) DEFAULT 0.00,
    is_completed BOOLEAN DEFAULT FALSE,
    time_taken_seconds INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, test_id)
);

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

-- 2. Enable RLS on all tables
ALTER TABLE tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_test_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_question_responses ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Anyone can view active tests" ON tests;
DROP POLICY IF EXISTS "Anyone can view questions of active tests" ON questions;
DROP POLICY IF EXISTS "Users can view their own attempts" ON user_test_attempts;
DROP POLICY IF EXISTS "Users can create their own attempts" ON user_test_attempts;
DROP POLICY IF EXISTS "Users can update their own attempts" ON user_test_attempts;
DROP POLICY IF EXISTS "Users can view their own responses" ON user_question_responses;
DROP POLICY IF EXISTS "Users can create their own responses" ON user_question_responses;
DROP POLICY IF EXISTS "Users can update their own responses" ON user_question_responses;

-- 4. Create comprehensive RLS policies

-- Tests policies - Allow authenticated users to read active tests
CREATE POLICY "Authenticated users can view active tests" ON tests
    FOR SELECT TO authenticated USING (is_active = true);

-- Questions policies - Allow authenticated users to read questions of active tests
CREATE POLICY "Authenticated users can view questions" ON questions
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM tests 
            WHERE tests.id = questions.test_id 
            AND tests.is_active = true
        )
    );

-- User test attempts policies - Allow authenticated users to manage their own attempts
CREATE POLICY "Users can view their own attempts" ON user_test_attempts
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own attempts" ON user_test_attempts
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own attempts" ON user_test_attempts
    FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- User question responses policies
CREATE POLICY "Users can view their own responses" ON user_question_responses
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM user_test_attempts 
            WHERE user_test_attempts.id = user_question_responses.attempt_id 
            AND user_test_attempts.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create their own responses" ON user_question_responses
    FOR INSERT TO authenticated WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_test_attempts 
            WHERE user_test_attempts.id = user_question_responses.attempt_id 
            AND user_test_attempts.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own responses" ON user_question_responses
    FOR UPDATE TO authenticated USING (
        EXISTS (
            SELECT 1 FROM user_test_attempts 
            WHERE user_test_attempts.id = user_question_responses.attempt_id 
            AND user_test_attempts.user_id = auth.uid()
        )
    );

-- 5. Create admin policies for data management
-- Admin emails - Update this list with your admin emails
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM auth.users 
        WHERE id = user_id 
        AND email IN (
            'examapp109@gmail.com',
            'abhijeethvn@gmail.com',
            'admin@gate8.onrender.com'
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin policies for tests
CREATE POLICY "Admins can manage tests" ON tests
    FOR ALL TO authenticated USING (is_admin(auth.uid()));

-- Admin policies for questions  
CREATE POLICY "Admins can manage questions" ON questions
    FOR ALL TO authenticated USING (is_admin(auth.uid()));

-- Admin policies for viewing all attempts
CREATE POLICY "Admins can view all attempts" ON user_test_attempts
    FOR SELECT TO authenticated USING (is_admin(auth.uid()));

-- Admin policies for viewing all responses
CREATE POLICY "Admins can view all responses" ON user_question_responses
    FOR SELECT TO authenticated USING (is_admin(auth.uid()));

-- 6. Grant necessary permissions to authenticated role
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 7. Insert sample test data if not exists
INSERT INTO tests (
    id,
    title, 
    description, 
    duration_minutes, 
    total_questions, 
    max_marks,
    start_time, 
    end_time
) VALUES (
    '11111111-2222-3333-4444-555555555555',
    'GATE CSE Mock Test 1',
    'Computer Science and Engineering mock test with MCQ, MSQ, and NAT questions',
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
('11111111-2222-3333-4444-555555555555', 'What is the time complexity of binary search?', 'MCQ', 
 '["O(n)", "O(log n)", "O(n log n)", "O(1)"]', 
 '"O(log n)"', 2.00, 0.66, 1),

('11111111-2222-3333-4444-555555555555', 'Which of the following are sorting algorithms? (Select all that apply)', 'MSQ', 
 '["Bubble Sort", "Binary Search", "Quick Sort", "Merge Sort", "Linear Search"]', 
 '["Bubble Sort", "Quick Sort", "Merge Sort"]', 2.00, 0.66, 2),

('11111111-2222-3333-4444-555555555555', 'How many nodes are there in a complete binary tree of height 3? (Enter numerical value)', 'NAT', 
 null, 
 '15', 2.00, 0.00, 3)
ON CONFLICT (test_id, question_number) DO NOTHING;

-- 8. Verify setup
SELECT 
    'Setup completed successfully!' as status,
    (SELECT count(*) FROM tests) as test_count,
    (SELECT count(*) FROM questions) as question_count,
    (SELECT count(*) FROM user_test_attempts) as attempt_count;
