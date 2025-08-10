# Database Status Check

## Current Issue
You're getting "Failed to start test" errors because the database tables don't exist yet.

## Quick Fix
Run one of these scripts in your **Supabase SQL Editor**:

### Option 1: Quick Fix (Recommended)
```sql
-- File: fix_test_attempts.sql
-- This creates just the missing user_test_attempts table

-- Create user_test_attempts table
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
ALTER TABLE user_test_attempts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own attempts" ON user_test_attempts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own attempts" ON user_test_attempts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own attempts" ON user_test_attempts
    FOR UPDATE USING (auth.uid() = user_id);
```

### Option 2: Complete Setup
```sql
-- File: complete_setup.sql
-- This creates all tables and sample data
-- (Use this if you want the full GATE exam setup with sample questions)
```

## How to Run
1. Open your Supabase project
2. Go to **SQL Editor**
3. Copy and paste the script above
4. Click **RUN**

## After Running the Script
1. Refresh your dashboard page
2. Try starting the test again
3. The "Failed to start test" error should be resolved

## Verification
You can verify the tables exist by running this query in Supabase SQL Editor:
```sql
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_name IN ('tests', 'questions', 'user_test_attempts', 'user_question_responses')
ORDER BY table_name;
```

## Status
- ❌ Database tables missing (causing current errors)
- ✅ API routes properly configured
- ✅ Environment variables set up
- ✅ Authentication working

**Next Step: Run the SQL script above in Supabase SQL Editor**
