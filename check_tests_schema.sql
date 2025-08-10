-- Check current table structure
-- Run this in your local database to see what columns exist

SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'tests' 
AND table_schema = 'public'
ORDER BY ordinal_position;
