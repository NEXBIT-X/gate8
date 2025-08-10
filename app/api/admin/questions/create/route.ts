import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin permissions
    const allowedEmails = ["abhijeethvn2006@gmail.com", "pavan03062006@gmail.com"];
    if (!user?.email || !allowedEmails.includes(user.email)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { testId, questions } = body;

    // Validate required fields
    if (!testId || !questions || !Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: testId and questions array' },
        { status: 400 }
      );
    }

    // Verify test exists
    const { data: test, error: testError } = await supabase
      .from('tests')
      .select('id')
      .eq('id', testId)
      .single();

    if (testError || !test) {
      return NextResponse.json(
        { error: 'Test not found' },
        { status: 404 }
      );
    }

    // Validate and prepare questions for insertion
    const questionsToInsert = questions.map((q: any, index: number) => {
            // Validate each question
      if (!q.question_text || !q.question_type || q.marks === undefined) {
        throw new Error(`Question ${index + 1}: Missing required fields (question_text, question_type, marks)`);
      }

      // Validate question type
      if (!['MCQ', 'MSQ', 'NAT'].includes(q.question_type)) {
        throw new Error(`Question ${index + 1}: Invalid question type`);
      }

      // Validate correct answer format based on question type
      let correct_answer;
      if (q.question_type === 'MCQ') {
        if (!q.correct_answer || typeof q.correct_answer !== 'string') {
          throw new Error(`Question ${index + 1}: MCQ requires a single correct answer`);
        }
        correct_answer = JSON.stringify(q.correct_answer);
      } else if (q.question_type === 'MSQ') {
        if (!q.correct_answer || !Array.isArray(q.correct_answer) || q.correct_answer.length === 0) {
          throw new Error(`Question ${index + 1}: MSQ requires an array of correct answers`);
        }
        correct_answer = JSON.stringify(q.correct_answer);
      } else if (q.question_type === 'NAT') {
        if (q.correct_answer === undefined || q.correct_answer === '') {
          throw new Error(`Question ${index + 1}: NAT requires a correct answer`);
        }
        correct_answer = JSON.stringify(q.correct_answer.toString());
      }

      // Prepare options for MCQ/MSQ
      let options = null;
      if (q.question_type === 'MCQ' || q.question_type === 'MSQ') {
        if (!q.options || !Array.isArray(q.options) || q.options.length === 0) {
          throw new Error(`Question ${index + 1}: ${q.question_type} requires options`);
        }
        options = JSON.stringify(q.options);
      }

      return {
        test_id: testId,
        question: q.question_text, // Map question_text to question
        question_type: q.question_type,
        options,
        correct_answer,
        marks: parseFloat(q.marks),
        negative_marks: parseFloat(q.negative_marks) || 0,
        // Note: question_number column doesn't exist in current schema
        // tag: q.question_number ? `Q${q.question_number}` : `Q${index + 1}`
      };
    });

    // Insert questions into database
    const { data: insertedQuestions, error: questionsError } = await supabase
      .from('questions')
      .insert(questionsToInsert)
      .select();

    if (questionsError) {
      console.error('Error creating questions:', questionsError);
      return NextResponse.json(
        { error: 'Failed to create questions', details: questionsError.message },
        { status: 500 }
      );
    }

    // Update test with total questions and max marks
    // Note: These columns don't exist in current schema
    /*
    const totalQuestions = insertedQuestions.length;
    const maxMarks = insertedQuestions.reduce((sum: number, q: any) => sum + q.marks, 0);

    const { error: updateError } = await supabase
      .from('tests')
      .update({
        total_questions: totalQuestions,
        max_marks: maxMarks
      })
      .eq('id', testId);

    if (updateError) {
      console.error('Error updating test totals:', updateError);
      // Don't fail the request for this, but log it
    }
    */

    console.log(`Created ${insertedQuestions.length} questions for test ${testId}`);

    return NextResponse.json({
      success: true,
      questions: insertedQuestions,
      totalQuestions: insertedQuestions.length,
      maxMarks: insertedQuestions.reduce((sum: number, q: { marks: number }) => sum + q.marks, 0),
      message: `Successfully created ${insertedQuestions.length} questions`
    });

  } catch (error) {
    console.error('Error in POST /api/admin/questions/create:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
