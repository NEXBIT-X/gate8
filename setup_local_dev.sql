-- Local Development Database Setup
-- Run this in your local Supabase SQL Editor to fix permission issues

-- 1. Ensure all required tables exist with the correct schema
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

-- 2. Enable RLS
ALTER TABLE tests ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Anyone can view active tests" ON tests;
DROP POLICY IF EXISTS "Authenticated users can view active tests" ON tests;
DROP POLICY IF EXISTS "Admins can manage tests" ON tests;

-- 4. Create permissive policies for development
-- Allow authenticated users to do everything for development
CREATE POLICY "Dev: Authenticated users can do everything on tests" ON tests
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 6. Create a simple admin check function
CREATE OR REPLACE FUNCTION is_admin_dev(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- For development, check if user email is in allowed list
    RETURN EXISTS (
        SELECT 1 FROM auth.users 
        WHERE id = user_id 
        AND email IN (
            'abhijeethvn2006@gmail.com',
            'pavan03062006@gmail.com',
            'abhijeethvn@gmail.com',
            'examapp109@gmail.com'
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Insert test data if not exists
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

-- 8. Verify setup
SELECT 'Setup completed!' as status, count(*) as test_count FROM tests;
