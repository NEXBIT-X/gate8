import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { attemptId } = await request.json();

    if (!attemptId) {
      return NextResponse.json({ error: 'Attempt ID is required' }, { status: 400 });
    }

    // Verify the attempt belongs to the user
    const { data: attempt, error: attemptError } = await supabase
      .from('user_test_attempts')
      .select('*, tests(*)')
      .eq('id', attemptId)
      .eq('user_id', user.id)
      .single();

    if (attemptError || !attempt) {
      return NextResponse.json({ error: 'Test attempt not found' }, { status: 404 });
    }

    if (attempt.is_completed) {
      return NextResponse.json({ error: 'Test already completed' }, { status: 400 });
    }

    // Calculate comprehensive score and statistics
    const { data: responses, error: responsesError } = await supabase
      .from('user_question_responses')
      .select('marks_obtained, is_correct')
      .eq('attempt_id', attemptId);

    if (responsesError) {
      console.error('Error fetching responses:', responsesError);
      return NextResponse.json({ error: 'Failed to calculate score' }, { status: 500 });
    }

    // Calculate detailed statistics
    const totalQuestions = responses?.length || 0;
    const answeredQuestions = responses?.filter(r => r.marks_obtained !== null).length || 0;
    const correctAnswers = responses?.filter(r => r.is_correct).length || 0;
    const incorrectAnswers = responses?.filter(r => !r.is_correct && r.marks_obtained !== null).length || 0;
    const unansweredQuestions = totalQuestions - answeredQuestions;
    
    // Calculate total score (including negative marks)
    const totalScore = responses?.reduce((sum, response) => {
      return sum + (response.marks_obtained || 0);
    }, 0) || 0;

    // Calculate total possible marks from test questions
    const { data: testQuestions, error: questionsError } = await supabase
      .from('questions')
      .select('marks')
      .eq('test_id', attempt.test_id);

    const totalPossibleMarks = testQuestions?.reduce((sum, q) => sum + q.marks, 0) || 0;
    const percentage = totalPossibleMarks > 0 ? (Math.max(0, totalScore) / totalPossibleMarks) * 100 : 0;
    
    const timeTaken = Math.floor((new Date().getTime() - new Date(attempt.started_at).getTime()) / 1000);

    // Update the attempt as completed
    const { data: completedAttempt, error: updateError } = await supabase
      .from('user_test_attempts')
      .update({
        is_completed: true,
        submitted_at: new Date().toISOString(),
        total_score: totalScore,
        percentage: Math.round(percentage * 100) / 100,
        time_taken_seconds: timeTaken,
        obtained_marks: totalScore,
        total_marks: totalPossibleMarks
      })
      .eq('id', attemptId)
      .select()
      .single();

    if (updateError) {
      console.error('Error completing test:', updateError);
      return NextResponse.json({ error: 'Failed to complete test' }, { status: 500 });
    }

    return NextResponse.json({ 
      attempt: completedAttempt,
      results: {
        totalScore,
        totalPossibleMarks,
        percentage: Math.round(percentage * 100) / 100,
        totalQuestions,
        answeredQuestions,
        correctAnswers,
        incorrectAnswers,
        unansweredQuestions,
        timeTaken
      }
    });
  } catch (error) {
    console.error('Error in POST /api/tests/complete:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
