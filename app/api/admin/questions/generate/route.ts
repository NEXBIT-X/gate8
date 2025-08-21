import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import { generateGATEQuestions, QuestionGenerationRequest } from '@/lib/ai/gateQuestions';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      subjects, 
      questionCount, 
      difficulty, 
      questionTypes, 
      testId, 
      syllabus,
      topics,
      aiEngine
  } = body as QuestionGenerationRequest & { testId?: string; aiEngine?: 'groq' | 'gemini' | 'openai'; topics?: string[] };

    // Validate required fields
    if (!subjects || !Array.isArray(subjects) || subjects.length === 0) {
      return NextResponse.json(
        { error: 'At least one subject must be selected' },
        { status: 400 }
      );
    }

    if (!questionCount || questionCount < 1 || questionCount > 50) {
      return NextResponse.json(
        { error: 'Question count must be between 1 and 50' },
        { status: 400 }
      );
    }

    if (!questionTypes || !Array.isArray(questionTypes) || questionTypes.length === 0) {
      return NextResponse.json(
        { error: 'At least one question type must be selected' },
        { status: 400 }
      );
    }

    // Check authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check admin permissions (same as admin page)
    const allowedEmails = [
      "abhijeethvn2006@gmail.com",
      "pavan03062006@gmail.com",
      "devash217@gmail.com",
      "b.lakshminarayanan2007@gmail.com"
    ];

    if (!allowedEmails.includes(user.email || '')) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Generate questions using AI
    const generationResult = await generateGATEQuestions({
      subjects,
      questionCount,
      difficulty,
      questionTypes,
  syllabus,
  topics
    }, aiEngine || 'groq');

    if (!generationResult.success) {
      return NextResponse.json(
        { error: generationResult.error || 'Failed to generate questions' },
        { status: 500 }
      );
    }

    // If testId is provided, add questions to the test
    let pushedToTest = false;
    let testInfo = null;

    if (testId) {
      // Verify test exists
      const { data: test, error: testError } = await supabase
        .from('tests')
        .select('id, title, questions')
        .eq('id', testId)
        .single();

      if (testError || !test) {
        return NextResponse.json(
          { error: 'Test not found' },
          { status: 404 }
        );
      }

      // Insert questions into the questions table
      const questionsToInsert = generationResult.questions.map((q) => {
        // Validate and sanitize the data to match actual schema
        
        // For correct_answer, handle different question types
        let correctAnswer = '';
        if (Array.isArray(q.correct_answer)) {
          correctAnswer = q.correct_answer.join(','); // Join multiple answers with comma
        } else {
          correctAnswer = String(q.correct_answer || '');
        }
        
        return {
          test_id: testId, // Required for the actual schema
          question: q.question_text?.substring(0, 1000) || 'Generated question',
          question_type: q.question_type || 'MCQ',
          options: q.options || ['Option A', 'Option B', 'Option C', 'Option D'],
          correct_answer: correctAnswer,
          marks: Math.max(q.marks || 1, 1), // Use 'marks' not 'mark'
          negative_marks: q.negative_marks || 0,
          tag: q.subject?.substring(0, 100) || 'GATE',
          explanation: q.explanation?.substring(0, 2000) || ''
        };
      });

      // Filter out any invalid questions
      const validQuestions = questionsToInsert.filter(q => 
        q.question && 
        q.question_type && 
        q.correct_answer && 
        q.options && 
        q.options.length > 0
      );

      if (validQuestions.length === 0) {
        return NextResponse.json(
          { error: 'No valid questions generated. Please try again.' },
          { status: 400 }
        );
      }

      console.log(`Attempting to insert ${validQuestions.length} questions`);
      console.log('Sample question data:', validQuestions[0]);

      // Use service role client to bypass RLS for admin operations
      const adminSupabase = createServiceRoleClient();
      
      const { data: insertedQuestions, error: insertError } = await adminSupabase
        .from('questions')
        .insert(validQuestions)
        .select('id');

      if (insertError) {
        console.error('Error inserting questions:', insertError);
        console.error('Full error details:', JSON.stringify(insertError, null, 2));
        console.error('Questions data:', validQuestions);
        return NextResponse.json(
          { error: `Failed to add questions to test: ${insertError.message}` },
          { status: 500 }
        );
      }

      // Update test to include new question IDs (also use admin client)
      const currentQuestions = test.questions || [];
      const newQuestionIds = insertedQuestions.map(q => q.id);
      const updatedQuestions = [...currentQuestions, ...newQuestionIds];

      const { error: updateError } = await adminSupabase
        .from('tests')
        .update({ 
          questions: updatedQuestions
        })
        .eq('id', testId);

      if (updateError) {
        console.error('Error updating test:', updateError);
        // Still consider it a success since questions were inserted
        // Just log the error but don't fail the entire operation
      }

      pushedToTest = true;
      testInfo = { test_id: test.id, test_name: test.title };
    }

    return NextResponse.json({
      success: true,
      questions: generationResult.questions,
      metadata: generationResult.metadata,
      pushedToTest,
      testInfo,
      message: pushedToTest 
        ? `Successfully generated ${generationResult.questions.length} questions and added to test "${testInfo?.test_name}"` 
        : `Successfully generated ${generationResult.questions.length} questions`
    });

  } catch (error) {
    console.error('Error in generate questions API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
