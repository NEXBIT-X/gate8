import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { testId: string } }
) {
  try {
    const supabase = await createClient();
    const serviceSupabase = createServiceClient();
    
    const testId = params.testId;
    
    if (!testId) {
      return NextResponse.json({ error: 'Test ID is required' }, { status: 400 });
    }

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        details: userError?.message || 'No user found'
      }, { status: 401 });
    }

    console.log('Loading test session for user:', user.id, 'testId:', testId);

    // Check if user has an existing attempt for this test
    const { data: existingAttempt, error: attemptError } = await serviceSupabase
      .from('user_test_attempts')
      .select('*')
      .eq('user_id', user.id)
      .eq('test_id', testId)
      .single();

    if (attemptError && attemptError.code !== 'PGRST116') {
      console.error('Error checking existing attempt:', attemptError);
      return NextResponse.json({ 
        error: 'Failed to check existing attempts', 
        details: attemptError.message
      }, { status: 500 });
    }

    if (!existingAttempt) {
      // No existing attempt - user needs to start the test first
      return NextResponse.json({ 
        error: 'No test attempt found', 
        details: 'You need to start this test first from the dashboard.',
        requiresStart: true
      }, { status: 404 });
    }

    // Get test details
    const { data: test, error: testError } = await serviceSupabase
      .from('tests')
      .select('*')
      .eq('id', testId)
      .single();

    if (testError || !test) {
      console.error('Test fetch error:', testError);
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    // Get questions for this test
    const { data: questions, error: questionsError } = await serviceSupabase
      .from('questions')
      .select('*')
      .eq('test_id', testId)
      .order('id');

    if (questionsError) {
      console.error('Error fetching questions:', questionsError);
      return NextResponse.json({ 
        error: 'Failed to fetch questions', 
        details: questionsError.message 
      }, { status: 500 });
    }

    if (!questions || questions.length === 0) {
      return NextResponse.json({ 
        error: 'No questions found for this test'
      }, { status: 400 });
    }

    // Transform questions to match the expected interface
    const transformedQuestions = questions.map(q => ({
      id: q.id,
      test_id: q.test_id,
      question: q.question,
      question_type: q.question_type,
      options: q.options,
      correct_answer: q.correct_answer,
      marks: q.marks,
      negative_marks: q.negative_marks,
      created_at: q.created_at
    }));

    console.log('Successfully loaded test session with', transformedQuestions.length, 'questions');

    return NextResponse.json({ 
      success: true,
      attempt: existingAttempt,
      test: {
        ...test,
        questions: transformedQuestions
      }
    });

  } catch (error) {
    console.error('Error in test session API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    
    return NextResponse.json({ 
      error: 'Internal server error',
      details: errorMessage
    }, { status: 500 });
  }
}
