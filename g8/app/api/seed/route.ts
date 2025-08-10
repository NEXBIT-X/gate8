import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const supabase = await createClient();
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create GATE-style sample questions
    const sampleQuestions = [
      // MCQ Questions
      {
        question: 'The time complexity of binary search algorithm is:',
        question_type: 'MCQ',
        subject: 'Computer Science',
        topic: 'Algorithms',
        difficulty: 'Easy',
        options: ['O(n)', 'O(log n)', 'O(n log n)', 'O(n²)'],
        correct_answers: ['O(log n)'],
        positive_marks: 1.0,
        negative_marks: 0.33,
        explanation: 'Binary search divides the search space in half at each step, resulting in O(log n) time complexity.',
        solution_steps: [
          'Binary search works on sorted arrays',
          'At each step, it compares the target with middle element',
          'It eliminates half of the remaining elements',
          'This results in logarithmic time complexity'
        ]
      },
      {
        question: 'Which of the following is/are correct about deadlock?',
        question_type: 'MCQ',
        subject: 'Operating Systems',
        topic: 'Process Management',
        difficulty: 'Medium',
        options: [
          'Deadlock can occur only when mutual exclusion condition holds',
          'Prevention is always preferable over avoidance',
          'Banker\'s algorithm is used for deadlock detection',
          'All processes must request resources in same order to prevent deadlock'
        ],
        correct_answers: ['Deadlock can occur only when mutual exclusion condition holds'],
        positive_marks: 1.0,
        negative_marks: 0.33,
        explanation: 'Mutual exclusion is one of the four necessary conditions for deadlock to occur.'
      },
      
      // MSQ Questions
      {
        question: 'Which of the following are true about SQL?',
        question_type: 'MSQ',
        subject: 'Database Management',
        topic: 'SQL',
        difficulty: 'Medium',
        options: [
          'SQL is a declarative language',
          'SQL supports both DDL and DML operations',
          'SQL is case-sensitive for keywords',
          'SQL supports nested queries'
        ],
        correct_answers: ['SQL is a declarative language', 'SQL supports both DDL and DML operations', 'SQL supports nested queries'],
        positive_marks: 2.0,
        negative_marks: 0.66,
        explanation: 'SQL is declarative, supports DDL/DML, allows nested queries, but keywords are not case-sensitive.',
        solution_steps: [
          'SQL is declarative - you specify what you want, not how to get it',
          'DDL: CREATE, ALTER, DROP; DML: SELECT, INSERT, UPDATE, DELETE',
          'Keywords like SELECT, FROM are not case-sensitive',
          'Subqueries can be nested within main queries'
        ]
      },
      {
        question: 'In graph theory, which of the following statements are correct?',
        question_type: 'MSQ',
        subject: 'Mathematics',
        topic: 'Graph Theory',
        difficulty: 'Hard',
        options: [
          'A tree with n vertices has exactly n-1 edges',
          'Every connected graph has a spanning tree',
          'A graph is bipartite if and only if it contains no odd cycles',
          'The chromatic number of a complete graph Kn is n'
        ],
        correct_answers: [
          'A tree with n vertices has exactly n-1 edges',
          'Every connected graph has a spanning tree',
          'A graph is bipartite if and only if it contains no odd cycles',
          'The chromatic number of a complete graph Kn is n'
        ],
        positive_marks: 2.0,
        negative_marks: 0.66,
        explanation: 'All given statements about graph theory are correct.'
      },
      
      // NAT Questions
      {
        question: 'A binary tree has 15 nodes. What is the minimum possible height of the tree? (Consider height of single node as 0)',
        question_type: 'NAT',
        subject: 'Computer Science',
        topic: 'Data Structures',
        difficulty: 'Medium',
        options: null,
        correct_answers: null,
        numerical_answer_range: { exact: 3 },
        positive_marks: 1.0,
        negative_marks: 0.0,
        explanation: 'For minimum height with 15 nodes, create a complete binary tree. Height = floor(log₂(15)) = 3.',
        solution_steps: [
          'For minimum height, create a complete binary tree',
          'A complete binary tree with height h has at most 2^(h+1) - 1 nodes',
          'For 15 nodes: 2^(h+1) - 1 ≥ 15',
          '2^(h+1) ≥ 16, so h+1 ≥ 4, therefore h ≥ 3',
          'Minimum height = 3'
        ]
      },
      {
        question: 'Consider a hash table with 10 slots using linear probing for collision resolution. If keys 22, 32, 12, 13, 23 are inserted in this order, how many comparisons are needed to search for key 23?',
        question_type: 'NAT',
        subject: 'Computer Science',
        topic: 'Hashing',
        difficulty: 'Hard',
        options: null,
        correct_answers: null,
        numerical_answer_range: { exact: 4 },
        positive_marks: 2.0,
        negative_marks: 0.0,
        explanation: 'Key 23 will be stored at position 6 after collisions, requiring 4 comparisons to find.',
        solution_steps: [
          'Hash function: key % 10',
          '22 → position 2, 32 → position 2 (collision) → position 3',
          '12 → position 2 (collision) → position 4',
          '13 → position 3 (collision) → position 5',
          '23 → position 3 (collision) → position 6',
          'To search 23: check positions 3, 4, 5, 6 = 4 comparisons'
        ]
      },
      {
        question: 'A system has 4 processes and 3 resource types. The allocation matrix is [[0,1,0],[2,0,0],[3,0,2],[2,1,1]] and the max matrix is [[7,5,3],[3,2,2],[9,0,2],[2,2,2]]. If the available vector is [3,3,2], how many processes can complete execution? Enter the count.',
        question_type: 'NAT',
        subject: 'Operating Systems',
        topic: 'Deadlock Avoidance',
        difficulty: 'Hard',
        options: null,
        correct_answers: null,
        numerical_answer_range: { exact: 2 },
        positive_marks: 2.0,
        negative_marks: 0.0,
        explanation: 'Using Banker\'s algorithm, processes P1 and P3 can complete execution.',
        solution_steps: [
          'Calculate Need matrix = Max - Allocation',
          'Need = [[7,4,3],[1,2,2],[6,0,0],[0,1,1]]',
          'Available = [3,3,2]',
          'P1 needs [1,2,2] ≤ [3,3,2] ✓ → P1 completes → Available = [5,3,2]',
          'P3 needs [0,1,1] ≤ [5,3,2] ✓ → P3 completes → Available = [7,4,4]',
          'P0 needs [7,4,3] > [7,4,4] (resource 2) ✗',
          'P2 needs [6,0,0] ≤ [7,4,4] ✓ but already checked',
          'Total processes that can complete: 2'
        ]
      }
    ];

    // Insert questions
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .insert(sampleQuestions)
      .select();

    if (questionsError) {
      console.error('Error creating questions:', questionsError);
      return NextResponse.json({ error: 'Failed to create questions' }, { status: 500 });
    }

    const questionIds = questions?.map(q => q.id) || [];

    // Create sample tests
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    const sampleTests = [
      {
        title: 'GATE Computer Science - Mock Test 1',
        tags: ['GATE', 'Computer Science', 'Mock Test'],
        start_time: oneHourAgo.toISOString(),
        end_time: twoHoursFromNow.toISOString(),
        duration_minutes: 180,
        questions: questionIds.slice(0, 4),
        instructions: 'This is a GATE-style mock test. Read all instructions carefully before starting. MCQ: Single correct answer, MSQ: Multiple correct answers, NAT: Numerical answer type.',
        created_by: user.id
      },
      {
        title: 'Computer Science Fundamentals',
        tags: ['CS', 'Algorithms', 'Data Structures'],
        start_time: oneHourFromNow.toISOString(),
        end_time: threeDaysFromNow.toISOString(),
        duration_minutes: 120,
        questions: questionIds.slice(2, 6),
        instructions: 'Practice test covering algorithms, data structures, and operating systems concepts.',
        created_by: user.id
      },
      {
        title: 'Advanced Topics Assessment',
        tags: ['Advanced', 'Database', 'OS', 'Mathematics'],
        start_time: now.toISOString(),
        end_time: twoHoursFromNow.toISOString(),
        duration_minutes: 150,
        questions: questionIds.slice(1, 7),
        instructions: 'Advanced level questions covering multiple computer science domains.',
        created_by: user.id
      }
    ];

    // Insert tests
    const { data: tests, error: testsError } = await supabase
      .from('tests')
      .insert(sampleTests)
      .select();

    if (testsError) {
      console.error('Error creating tests:', testsError);
      return NextResponse.json({ error: 'Failed to create tests' }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'Sample data created successfully',
      testsCreated: tests?.length || 0,
      questionsCreated: questions?.length || 0,
      tests: tests,
      questions: questions
    });
  } catch (error) {
    console.error('Error in POST /api/seed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
