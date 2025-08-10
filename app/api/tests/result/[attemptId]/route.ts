import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

interface RouteParams {
  params: Promise<{ attemptId: string }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const supabase = await createClient();
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { attemptId } = await params;

    // Get the test attempt with test details
    const { data: attempt, error: attemptError } = await supabase
      .from('user_test_attempts')
      .select(`
        *,
        tests (*)
      `)
      .eq('id', attemptId)
      .eq('user_id', user.id)
      .single();

    if (attemptError || !attempt) {
      return NextResponse.json({ error: 'Test attempt not found' }, { status: 404 });
    }

    // Get all responses for this attempt with question details
    const { data: responses, error: responsesError } = await supabase
      .from('user_question_responses')
      .select(`
        *,
        questions (*)
      `)
      .eq('attempt_id', attemptId);

    if (responsesError) {
      console.error('Error fetching responses:', responsesError);
      return NextResponse.json({ error: 'Failed to fetch responses' }, { status: 500 });
    }

    // Transform the response data and calculate statistics
    const transformedResponses = responses?.map(response => ({
      ...response,
      question: response.questions
    })) || [];

    // Calculate comprehensive statistics
    const totalQuestions = transformedResponses.length;
    const answeredQuestions = transformedResponses.filter(r => r.marks_obtained !== null).length;
    const correctAnswers = transformedResponses.filter(r => r.is_correct).length;
    const incorrectAnswers = transformedResponses.filter(r => !r.is_correct && r.marks_obtained !== null).length;
    const unansweredQuestions = totalQuestions - answeredQuestions;
    
    // Calculate total score (including negative marks)
    const totalScore = transformedResponses.reduce((sum, response) => {
      return sum + (response.marks_obtained || 0);
    }, 0);

    const totalPossibleMarks = attempt.tests?.total_marks || 0;
    const percentage = attempt.percentage || 0;

    const result = {
      attempt,
      test: attempt.tests,
      responses: transformedResponses,
      score: {
        totalScore,
        totalPossibleMarks,
        percentage,
        totalQuestions,
        answeredQuestions,
        correctAnswers,
        incorrectAnswers,
        unansweredQuestions
      }
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in GET /api/tests/result:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
