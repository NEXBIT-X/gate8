import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateExplanation } from '@/lib/ai/geminiEnhancements';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check admin permissions
    const allowedEmails = [
      "abhijeethvn2006@gmail.com", 
      "pavan03062006@gmail.com",
      "abhijeethvn@gmail.com",
      "examapp109@gmail.com"
    ];
    
    if (!user?.email || !allowedEmails.includes(user.email)) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { 
      questionText, 
      questionType, 
      correctAnswer,
      subject,
      options
    } = body;

    // Validate required fields
    if (!questionText || !questionType || !correctAnswer || !subject) {
      return NextResponse.json(
        { error: 'Question text, type, correct answer, and subject are required' },
        { status: 400 }
      );
    }

    if (!['MCQ', 'MSQ', 'NAT'].includes(questionType)) {
      return NextResponse.json(
        { error: 'Invalid question type' },
        { status: 400 }
      );
    }

    const explanation = await generateExplanation(
      questionText,
      questionType,
      correctAnswer,
      subject,
      options
    );

    return NextResponse.json({
      success: true,
      explanation
    });

  } catch (error) {
    console.error('Error generating explanation:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate explanation',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
