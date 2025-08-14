import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateQuestionExplanation, type QuestionExplanationRequest } from '@/lib/ai/explanations';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      question, 
      options, 
      correct_answer, 
      user_answer, 
      is_correct, 
      question_type 
    }: QuestionExplanationRequest = body;

    if (!question || !correct_answer) {
      return NextResponse.json({ 
        error: 'Missing required fields: question and correct_answer' 
      }, { status: 400 });
    }

    const explanation = await generateQuestionExplanation({
      question,
      options,
      correct_answer,
      user_answer,
      is_correct,
      question_type
    });

    return NextResponse.json(explanation);

  } catch (error) {
    console.error('Error generating explanation:', error);
    return NextResponse.json({ 
      error: 'Failed to generate explanation',
      explanation: 'Unable to generate explanation at this time. Please review the question and correct answer.',
      success: false
    }, { status: 500 });
  }
}
