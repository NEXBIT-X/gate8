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
      .select('*')
      .eq('attempt_id', attemptId);

    if (responsesError) {
      console.error('Error fetching responses:', responsesError);
      return NextResponse.json({ error: 'Failed to fetch responses' }, { status: 500 });
    }

    // Get ALL questions from the test (not just answered ones)
    const { data: allQuestions, error: questionsError } = await supabase
      .from('questions')
      .select('*')
      .eq('test_id', attempt.test_id)
      .order('id');

    if (questionsError) {
      console.error('Error fetching questions:', questionsError);
      return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 });
    }

    // Create a map of responses by question_id for quick lookup
    const responseMap = new Map(responses?.map(r => [r.question_id, r]) || []);

    // Transform all questions to include response data (or null if unanswered)
    const transformedResponses = allQuestions?.map(question => {
      const response = responseMap.get(question.id);
      
      if (response) {
        // Question was answered
        return {
          ...response,
          question
        };
      } else {
        // Question was not answered - create a mock response
        return {
          id: `unanswered-${question.id}`,
          attempt_id: attemptId,
          question_id: question.id,
          user_answer: null,
          is_correct: false,
          marks_obtained: 0,
          time_taken_seconds: 0,
          created_at: attempt.created_at,
          updated_at: attempt.created_at,
          question,
          unanswered: true // Flag to identify unanswered questions
        };
      }
    }) || [];

    // Calculate comprehensive statistics based on transformedResponses (covers all questions)
    const totalQuestions = transformedResponses.length;

    // Use transformedResponses to compute counts so unanswered questions are included and
    // counts cannot become negative due to duplicate/extra response rows
    const answeredQuestions = transformedResponses.filter(r => !r.unanswered).length;
    const correctAnswers = transformedResponses.filter(r => !r.unanswered && r.is_correct).length;
    const incorrectAnswers = transformedResponses.filter(r => !r.unanswered && !r.is_correct).length;
    const unansweredQuestions = transformedResponses.filter(r => r.unanswered).length;

    // Calculate total score (including negative marks) from transformedResponses (answered only)
    const totalScore = transformedResponses.reduce((sum, response: any) => {
      if (response.unanswered) return sum;
      return sum + (response.marks_obtained || 0);
    }, 0) || 0;

    const totalPossibleMarks = attempt.total_marks || 0;

    const result = {
      attempt,
      test: attempt.tests,
      responses: transformedResponses,
      score: {
        totalScore,
        totalPossibleMarks,
        totalQuestions,
        answeredQuestions,
        correctAnswers,
        incorrectAnswers,
        unansweredQuestions,
        obtained: totalScore,
        total: totalPossibleMarks
      }
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in GET /api/tests/result:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
