-- Sample LaTeX test data for demonstrating mathematical expressions
-- Insert this into the Supabase SQL Editor to test LaTeX rendering

-- First, create a test with mathematical content
INSERT INTO tests (title, description, duration_minutes, total_marks, start_time, end_time, created_by, is_published) 
VALUES (
  'Mathematics & Physics Test (LaTeX Demo)', 
  'Test featuring mathematical expressions rendered with LaTeX including calculus, algebra, and physics formulas',
  90, 
  6,
  NOW() - INTERVAL '1 hour',
  NOW() + INTERVAL '30 days',
  (SELECT id FROM auth.users LIMIT 1),
  true
) RETURNING id;

-- Note: Replace the test_id in the following INSERT with the ID returned above

-- Question 1: Calculus with LaTeX
INSERT INTO questions (
  test_id, 
  question_text, 
  question_type, 
  options, 
  correct_answer, 
  marks, 
  negative_marks, 
  explanation
) VALUES (
  'YOUR_TEST_ID_HERE', -- Replace with actual test ID
  'What is the derivative of $f(x) = x^3 + 2x^2 - 5x + 3$ with respect to $x$?',
  'MCQ',
  ARRAY[
    '$f''(x) = 3x^2 + 4x - 5$',
    '$f''(x) = 3x^2 + 2x - 5$', 
    '$f''(x) = x^3 + 4x - 5$',
    '$f''(x) = 3x + 4x - 5$'
  ],
  '$f''(x) = 3x^2 + 4x - 5$',
  2,
  0.67,
  'Using the power rule: $\frac{d}{dx}[x^n] = nx^{n-1}$. For $f(x) = x^3 + 2x^2 - 5x + 3$, we get $f''(x) = 3x^2 + 4x - 5$.'
);

-- Question 2: Physics formula with LaTeX
INSERT INTO questions (
  test_id, 
  question_text, 
  question_type, 
  options, 
  correct_answer, 
  marks, 
  negative_marks, 
  explanation
) VALUES (
  'YOUR_TEST_ID_HERE', -- Replace with actual test ID
  'Einstein''s mass-energy equivalence is given by $$E = mc^2$$ where $E$ is energy, $m$ is mass, and $c$ is the speed of light. If an object has a mass of $2 \times 10^{-3}$ kg, what is its rest energy? (Use $c = 3 \times 10^8$ m/s)',
  'NAT',
  NULL,
  '1.8e14',
  2,
  0,
  'Using $E = mc^2$: $$E = (2 \times 10^{-3}) \times (3 \times 10^8)^2 = 2 \times 10^{-3} \times 9 \times 10^{16} = 1.8 \times 10^{14} \text{ Joules}$$'
);

-- Question 3: Mathematical series
INSERT INTO questions (
  test_id, 
  question_text, 
  question_type, 
  options, 
  correct_answer, 
  marks, 
  negative_marks, 
  explanation
) VALUES (
  'YOUR_TEST_ID_HERE', -- Replace with actual test ID
  'Which of the following infinite series converge? Select all that apply. $$\text{(I) } \sum_{n=1}^{\infty} \frac{1}{n^2} \quad \text{(II) } \sum_{n=1}^{\infty} \frac{1}{n} \quad \text{(III) } \sum_{n=1}^{\infty} \frac{1}{2^n} \quad \text{(IV) } \sum_{n=1}^{\infty} \frac{1}{n!}$$',
  'MSQ',
  ARRAY[
    'Series (I): $\sum_{n=1}^{\infty} \frac{1}{n^2}$',
    'Series (II): $\sum_{n=1}^{\infty} \frac{1}{n}$',
    'Series (III): $\sum_{n=1}^{\infty} \frac{1}{2^n}$',
    'Series (IV): $\sum_{n=1}^{\infty} \frac{1}{n!}$'
  ],
  ARRAY['Series (I): $\sum_{n=1}^{\infty} \frac{1}{n^2}$', 'Series (III): $\sum_{n=1}^{\infty} \frac{1}{2^n}$', 'Series (IV): $\sum_{n=1}^{\infty} \frac{1}{n!}$'],
  2,
  0.67,
  'Series (I) converges by the p-test ($p=2>1$). Series (II) is the harmonic series and diverges. Series (III) is a geometric series with ratio $r=\frac{1}{2}<1$, so it converges. Series (IV) converges faster than any exponential series. Only series (II) diverges.'
);

-- Instructions for manual insertion:
-- 1. Run the first INSERT to create the test and note the returned ID
-- 2. Replace 'YOUR_TEST_ID_HERE' with the actual test ID in all three question INSERT statements
-- 3. Run each question INSERT statement
-- 4. Visit your application and look for "Mathematics & Physics Test (LaTeX Demo)" in the available tests
-- 5. Start the test to see LaTeX rendering in action
