-- Quick fix to ensure test data exists
-- Run this if you still get "No questions found" error

-- First, let's see what we have
SELECT 'Current tests:' as info;
SELECT id, title, 
       start_time < NOW() as started, 
       end_time > NOW() as available,
       duration_minutes
FROM tests;

SELECT 'Current questions:' as info;
SELECT test_id, COUNT(*) as question_count 
FROM questions 
GROUP BY test_id;

-- Delete any existing test and recreate with proper data
DELETE FROM questions WHERE test_id = '550e8400-e29b-41d4-a716-446655440000';
DELETE FROM tests WHERE id = '550e8400-e29b-41d4-a716-446655440000';

-- Insert the test
INSERT INTO tests (id, title, tags, start_time, end_time, duration_minutes) 
VALUES (
    '550e8400-e29b-41d4-a716-446655440000',
    'Debug Test - Computer Science',
    ARRAY['CS', 'Debug', 'Test'],
    NOW() - INTERVAL '1 hour',
    NOW() + INTERVAL '24 hours',
    90
);

-- Insert questions one by one to ensure they work
INSERT INTO questions (test_id, question, question_type, options, correct_answer, marks, negative_marks, tag, explanation)
VALUES (
    '550e8400-e29b-41d4-a716-446655440000',
    'What is 2 + 2?',
    'MCQ',
    ARRAY['3', '4', '5', '6'],
    '4',
    1.0,
    0.25,
    'Math',
    'Basic arithmetic: 2 + 2 = 4'
);

INSERT INTO questions (test_id, question, question_type, options, correct_answer, marks, negative_marks, tag, explanation)
VALUES (
    '550e8400-e29b-41d4-a716-446655440000',
    'Which are programming languages?',
    'MSQ',
    ARRAY['Python', 'HTML', 'JavaScript', 'CSS', 'Java'],
    'Python,JavaScript,Java',
    2.0,
    0.5,
    'Programming',
    'Python, JavaScript, and Java are programming languages. HTML and CSS are markup/styling languages.'
);

INSERT INTO questions (test_id, question, question_type, options, correct_answer, marks, negative_marks, tag, explanation)
VALUES (
    '550e8400-e29b-41d4-a716-446655440000',
    'What is the square root of 16?',
    'NAT',
    NULL,
    '4',
    1.0,
    0.0,
    'Math',
    'Square root of 16 is 4 because 4 × 4 = 16'
);

-- Verify the data
SELECT 'Verification:' as info;
SELECT 
    t.title,
    t.duration_minutes,
    t.start_time < NOW() as test_started,
    t.end_time > NOW() as test_available,
    COUNT(q.id) as question_count
FROM tests t
LEFT JOIN questions q ON t.id = q.test_id
WHERE t.id = '550e8400-e29b-41d4-a716-446655440000'
GROUP BY t.id, t.title, t.duration_minutes, t.start_time, t.end_time;

SELECT 'Questions details:' as info;
SELECT id, question, question_type, marks FROM questions 
WHERE test_id = '550e8400-e29b-41d4-a716-446655440000'
ORDER BY id;
