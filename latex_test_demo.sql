-- Sample LaTeX Test Data for GATE8
-- This demonstrates the LaTeX rendering capabilities

-- Insert a test with LaTeX questions
INSERT INTO tests (title, description, duration_minutes, start_time, end_time, created_by) 
VALUES (
  'Mathematics & LaTeX Demo Test',
  'A demonstration test showcasing LaTeX mathematical notation rendering capabilities',
  45,
  NOW(),
  NOW() + INTERVAL '7 days',
  (SELECT id FROM auth.users WHERE email = 'admin@gate8.com' LIMIT 1)
);

-- Get the test ID for questions
-- Note: Replace with actual test ID after running the above INSERT

-- Sample LaTeX Questions
INSERT INTO questions (
  test_id,
  question_text,
  question_type,
  options,
  correct_answer,
  marks,
  negative_marks,
  explanation,
  question_number
) VALUES 
(
  (SELECT id FROM tests WHERE title = 'Mathematics & LaTeX Demo Test' LIMIT 1),
  'What is the derivative of $f(x) = x^2 + 3x + 2$ with respect to $x$?',
  'MCQ',
  ARRAY['$2x + 3$', '$x^2 + 3$', '$2x + 2$', '$x + 3$'],
  '$2x + 3$',
  2,
  0.67,
  'Using the power rule: $\frac{d}{dx}[x^n] = nx^{n-1}$, we get $\frac{d}{dx}[x^2] = 2x$ and $\frac{d}{dx}[3x] = 3$. Therefore, $f''(x) = 2x + 3$.',
  1
),
(
  (SELECT id FROM tests WHERE title = 'Mathematics & LaTeX Demo Test' LIMIT 1),
  'Which of the following integrals are equal to $\ln|x| + C$? (Select all that apply)',
  'MSQ',
  ARRAY['$\int \frac{1}{x} dx$', '$\int x^{-1} dx$', '$\int \frac{2}{2x} dx$', '$\int \frac{x^2}{x^3} dx$'],
  ARRAY['$\int \frac{1}{x} dx$', '$\int x^{-1} dx$', '$\int \frac{2}{2x} dx$'],
  2,
  0.67,
  'All three expressions are equivalent: $$\int \frac{1}{x} dx = \int x^{-1} dx = \int \frac{2}{2x} dx = \ln|x| + C$$ However, $\int \frac{x^2}{x^3} dx = \int x^{-1} dx$ only when simplified.',
  2
),
(
  (SELECT id FROM tests WHERE title = 'Mathematics & LaTeX Demo Test' LIMIT 1),
  'Calculate the limit: $$\lim_{x \to 0} \frac{\sin(3x)}{2x}$$',
  'NAT',
  NULL,
  '1.5',
  2,
  0,
  'Using L''Hôpital''s rule or the standard limit $\lim_{u \to 0} \frac{\sin u}{u} = 1$: $$\lim_{x \to 0} \frac{\sin(3x)}{2x} = \lim_{x \to 0} \frac{3\sin(3x)}{3 \cdot 2x} = \frac{3}{2} \lim_{x \to 0} \frac{\sin(3x)}{3x} = \frac{3}{2} \cdot 1 = 1.5$$',
  3
),
(
  (SELECT id FROM tests WHERE title = 'Mathematics & LaTeX Demo Test' LIMIT 1),
  'The time complexity of the merge sort algorithm is:',
  'MCQ',
  ARRAY['$O(n)$', '$O(n \log n)$', '$O(n^2)$', '$O(2^n)$'],
  '$O(n \log n)$',
  2,
  0.67,
  'Merge sort divides the array into halves recursively ($\log n$ levels) and merges them in $O(n)$ time at each level, giving total complexity $O(n \log n)$.',
  4
),
(
  (SELECT id FROM tests WHERE title = 'Mathematics & LaTeX Demo Test' LIMIT 1),
  'In the context of probability, if $P(A) = 0.6$ and $P(B) = 0.4$, and events $A$ and $B$ are independent, what is $P(A \cap B)$?',
  'NAT',
  NULL,
  '0.24',
  2,
  0,
  'For independent events: $P(A \cap B) = P(A) \times P(B) = 0.6 \times 0.4 = 0.24$',
  5
);
