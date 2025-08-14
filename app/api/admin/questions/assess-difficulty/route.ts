import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { assessQuestionDifficulty } from '@/lib/ai/geminiEnhancements';

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
      subject,
      questionType
    } = body;

    // Validate required fields
    if (!questionText || !subject || !questionType) {
      return NextResponse.json(
        { error: 'Question text, subject, and type are required' },
        { status: 400 }
      );
    }

    if (!['MCQ', 'MSQ', 'NAT'].includes(questionType)) {
      return NextResponse.json(
        { error: 'Invalid question type' },
        { status: 400 }
      );
    }

    const assessment = await assessQuestionDifficulty(
      questionText,
      subject,
      questionType
    );

    return NextResponse.json({
      success: true,
      assessment
    });

  } catch (error) {
    console.error('Error assessing question difficulty:', error);
    return NextResponse.json(
      { 
        error: 'Failed to assess question difficulty',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
