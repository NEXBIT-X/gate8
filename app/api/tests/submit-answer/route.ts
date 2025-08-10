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

    const { attemptId, questionId, answer } = await request.json();

    if (!attemptId || !questionId || answer === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify the attempt belongs to the user
    const { data: attempt, error: attemptError } = await supabase
      .from('user_test_attempts')
      .select('*')
      .eq('id', attemptId)
      .eq('user_id', user.id)
      .single();

    if (attemptError || !attempt) {
      return NextResponse.json({ error: 'Test attempt not found' }, { status: 404 });
    }

    if (attempt.is_completed) {
      return NextResponse.json({ error: 'Test already completed' }, { status: 400 });
    }

    // Get the question to check correct answer
    const { data: question, error: questionError } = await supabase
      .from('questions')
      .select('*')
      .eq('id', questionId)
      .single();

    if (questionError || !question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    // Evaluate the answer based on question type
    let isCorrect = false;
    let marksObtained = 0;

    switch (question.question_type) {
      case 'MCQ':
        isCorrect = question.correct_answers && question.correct_answers.includes(answer);
        marksObtained = isCorrect ? question.positive_marks : -question.negative_marks;
        break;
        
      case 'MSQ':
        // For MSQ, all correct answers must be selected and no incorrect ones
        if (question.correct_answers && Array.isArray(answer)) {
          const correctSet = new Set(question.correct_answers);
          const answerSet = new Set(answer);
          
          // Check if sets are equal
          isCorrect = correctSet.size === answerSet.size && 
                     [...correctSet].every(x => answerSet.has(x));
        }
        marksObtained = isCorrect ? question.positive_marks : -question.negative_marks;
        break;
        
      case 'NAT':
        // For NAT, check against numerical range
        const numAnswer = parseFloat(answer);
        if (!isNaN(numAnswer) && question.numerical_answer_range) {
          const range = question.numerical_answer_range;
          if (range.exact !== undefined) {
            isCorrect = Math.abs(numAnswer - range.exact) < 0.01; // Allow small floating point errors
          } else if (range.min !== undefined && range.max !== undefined) {
            isCorrect = numAnswer >= range.min && numAnswer <= range.max;
          }
        }
        // NAT questions typically don't have negative marking
        marksObtained = isCorrect ? question.positive_marks : 0;
        break;
    }

    // Update or insert question response
    const { error: responseError } = await supabase
      .from('user_question_responses')
      .upsert({
        attempt_id: attemptId,
        question_id: questionId,
        question_type: question.question_type,
        user_answer: answer,
        is_correct: isCorrect,
        marks_obtained: marksObtained
      });

    if (responseError) {
      console.error('Error saving response:', responseError);
      return NextResponse.json({ error: 'Failed to save answer' }, { status: 500 });
    }

    // Update attempt answers
    const updatedAnswers = {
      ...attempt.answers,
      [questionId]: answer
    };

    const { error: updateError } = await supabase
      .from('user_test_attempts')
      .update({ answers: updatedAnswers })
      .eq('id', attemptId);

    if (updateError) {
      console.error('Error updating attempt:', updateError);
      return NextResponse.json({ error: 'Failed to update attempt' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      isCorrect,
      marksObtained,
      questionType: question.question_type
    });
  } catch (error) {
    console.error('Error in POST /api/tests/submit-answer:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
