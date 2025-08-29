import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { unshuffleAnswers, evaluateShuffledAnswers, type UserAnswer } from '@/lib/utils/answerEvaluation';
import type { ShuffleConfig } from '@/lib/utils/shuffle';
import { validateLaTeX } from '@/lib/utils/latex';

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

    // Get shuffle configuration from attempt
    const shuffleConfig: ShuffleConfig | undefined = attempt.answers?._shuffle_config;
    
    if (!shuffleConfig) {
      return NextResponse.json({ error: 'Shuffle configuration not found' }, { status: 400 });
    }

    // Convert shuffled answer back to original question/option mapping
    const userAnswers: UserAnswer[] = [{
      question_id: questionId,
      answer: answer
    }];
    
    const unshuffledAnswers = unshuffleAnswers(userAnswers, shuffleConfig);
    const unshuffled = unshuffledAnswers[0];
    
    if (!unshuffled) {
      return NextResponse.json({ error: 'Failed to unshuffle answer' }, { status: 400 });
    }

    // Get the original question using the unshuffled question ID
    const { data: question, error: questionError } = await supabase
      .from('questions')
      .select('*')
      .eq('id', unshuffled.original_question_id)
      .single();

    if (questionError || !question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    // Evaluate the unshuffled answer against the original question
    let isCorrect = false;
    let marksObtained = 0;

    // Server-side LaTeX validation for text answers (for NAT we still ensure numeric, for others validate string fields)
    try {
      // Only validate string answers (MCQ/MSQ options and free-text answers)
      if (typeof unshuffled.original_answer === 'string') {
        const val = validateLaTeX(unshuffled.original_answer);
        if (!val.valid) {
          return NextResponse.json({ error: 'Invalid LaTeX in submitted answer', details: val.errors }, { status: 400 });
        }
      }
      if (Array.isArray(unshuffled.original_answer)) {
        for (const ansPart of unshuffled.original_answer) {
          if (typeof ansPart === 'string') {
            const val = validateLaTeX(ansPart);
            if (!val.valid) {
              return NextResponse.json({ error: 'Invalid LaTeX in submitted answer', details: val.errors }, { status: 400 });
            }
          }
        }
      }
    } catch (e) {
      console.error('LaTeX validation failed:', e);
      return NextResponse.json({ error: 'Invalid LaTeX in submitted answer' }, { status: 400 });
    }

    switch (question.question_type) {
      case 'MCQ':
        isCorrect = question.correct_answer === unshuffled.original_answer;
        marksObtained = isCorrect ? question.marks : (unshuffled.original_answer !== '' ? -question.negative_marks : 0);
        break;
        
      case 'MSQ':
        let correctAnswers: string[] = [];
        try {
          correctAnswers = JSON.parse(question.correct_answer);
        } catch {
          correctAnswers = question.correct_answer.split(',').map((a: string) => a.trim());
        }
        
        if (Array.isArray(unshuffled.original_answer)) {
          const correctSet = new Set(correctAnswers);
          const answerSet = new Set(unshuffled.original_answer);
          
          isCorrect = correctSet.size === answerSet.size && 
                     [...correctSet].every(x => answerSet.has(x));
        }
        marksObtained = isCorrect ? question.marks : (unshuffled.original_answer && unshuffled.original_answer.length > 0 ? -question.negative_marks : 0);
        break;
        
      case 'NAT':
        const numAnswer = parseFloat(String(unshuffled.original_answer));
        const correctNum = parseFloat(question.correct_answer);
        if (!isNaN(numAnswer) && !isNaN(correctNum)) {
          isCorrect = Math.abs(numAnswer - correctNum) <= 0.01;
        }
        marksObtained = isCorrect ? question.marks : 0;
        break;
    }

    // Update or insert question response (use original question ID for consistency)
    const { error: responseError } = await supabase
      .from('user_question_responses')
      .upsert({
        attempt_id: attemptId,
        question_id: unshuffled.original_question_id, // Use original question ID
        user_answer: typeof unshuffled.original_answer === 'object' ? JSON.stringify(unshuffled.original_answer) : String(unshuffled.original_answer),
        is_correct: isCorrect,
        marks_obtained: marksObtained
      });

    if (responseError) {
      console.error('Error saving response:', responseError);
      return NextResponse.json({ error: 'Failed to save answer' }, { status: 500 });
    }

    // Update attempt answers (store shuffled answer with shuffled question ID for UI consistency)
    const updatedAnswers = {
      ...attempt.answers,
      [questionId]: answer // Keep shuffled question ID for frontend
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
      marksObtained: parseFloat(String(marksObtained)).toFixed(2), // Ensure marks are returned as a string with 2 decimal places
      questionType: question.question_type,
      originalQuestionId: unshuffled.original_question_id,
      shuffledAnswer: answer,
      originalAnswer: unshuffled.original_answer
    });
  } catch (error) {
    console.error('Error in POST /api/tests/submit-answer:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
