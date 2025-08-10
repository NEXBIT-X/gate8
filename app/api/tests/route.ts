import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();

    console.log('Fetching tests from database...');

    // Fetch tests with their basic information and question counts
    const { data: tests, error } = await supabase
      .from('tests')
      .select(`
        id,
        title,
        tags,
        start_time,
        end_time,
        duration_minutes,
        created_by,
        created_at,
        questions(count)
      `);

    if (error) {
      console.error('Error fetching tests:', error);
      return NextResponse.json({ 
        error: 'Failed to fetch tests', 
        details: error.message 
      }, { status: 500 });
    }

    console.log(`Found ${tests?.length || 0} tests`);

    // Transform the data to include question count
    const testsWithQuestionCount = tests?.map(test => ({
      ...test,
      questions: { length: test.questions?.[0]?.count || 0 }
    })) || [];

    return NextResponse.json(testsWithQuestionCount);
  } catch (error) {
    console.error('Error in tests API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    
    return NextResponse.json({ 
      error: 'Internal server error',
      details: errorMessage,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
