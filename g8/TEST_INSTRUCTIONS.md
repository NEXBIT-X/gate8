# Simple CS Test - Testing Instructions

## Test Details
- **Test Name**: Simple CS Test
- **Duration**: 30 minutes
- **Questions**: 3 questions (1 MCQ, 1 MSQ, 1 NAT)
- **Total Marks**: 6 marks
- **Status**: Available now, ends in 2 hours

## Questions Overview

### Question 1 (MCQ) - 2 marks, -0.5 negative
**Topic**: Algorithms - Binary Search
**Type**: Single correct answer
**Correct Answer**: B (O(log n))

### Question 2 (MSQ) - 2 marks, -0.5 negative  
**Topic**: Data Structures - Linear structures
**Type**: Multiple correct answers
**Correct Answers**: A, B, D (Array, Stack, Queue)

### Question 3 (NAT) - 2 marks, no negative
**Topic**: Data Structures - Binary tree height
**Type**: Numerical input
**Correct Answer**: 2

## Setup Instructions

1. **Insert Test Data**:
   ```sql
   -- Copy and run simple_test_data.sql in Supabase SQL Editor
   ```

2. **Verify Data**:
   ```sql
   -- Copy and run verify_test_data.sql to check the data
   ```

3. **Test Application**:
   ```bash
   npm run dev
   # Visit: http://localhost:3000/protected/dash
   # Look for "Simple CS Test" in Available Tests
   # Click "Start Test"
   ```

## Expected Test Flow

1. **Dashboard**: Should show "Simple CS Test" as available
2. **Question 1**: MCQ with 4 radio button options
3. **Question 2**: MSQ with 5 checkbox options (select multiple)
4. **Question 3**: NAT with numerical input field
5. **Submit**: Calculate score with negative marking
6. **Results**: Show detailed breakdown

## Sample Answers for Testing

- **Question 1**: Select option B
- **Question 2**: Select options A, B, and D
- **Question 3**: Enter "2"

**Expected Score**: 6/6 marks (100%)
