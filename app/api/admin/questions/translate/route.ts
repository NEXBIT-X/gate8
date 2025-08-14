import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { translateQuestion } from '@/lib/ai/geminiEnhancements';

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
      options,
      explanation,
      targetLanguage = 'Hindi'
    } = body;

    // Validate required fields
    if (!questionText) {
      return NextResponse.json(
        { error: 'Question text is required' },
        { status: 400 }
      );
    }

    const translation = await translateQuestion(
      questionText,
      options,
      explanation,
      targetLanguage
    );

    return NextResponse.json({
      success: true,
      translation
    });

  } catch (error) {
    console.error('Error translating question:', error);
    return NextResponse.json(
      { 
        error: 'Failed to translate question',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
