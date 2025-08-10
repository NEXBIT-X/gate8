-- Check what tables exist in your database
-- Run this FIRST to see what's missing

SELECT 
    tablename,
    schemaname
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Check if auth schema exists
SELECT 
    tablename,
    schemaname  
FROM pg_tables 
WHERE schemaname = 'auth'
  AND tablename = 'users'
LIMIT 1;
