import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    // Use service role key for testing (bypass RLS)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Test the tests table structure by attempting an insert with all expected fields
    const testData = {
      title: "Schema Test",
      description: "Testing database schema",
      duration_minutes: 60,
      start_time: new Date().toISOString(),
      end_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      is_active: true,
      total_questions: 0,
      max_marks: 0
    };

    console.log('Testing with data:', testData);

    const { data: test, error: testError } = await supabase
      .from('tests')
      .insert(testData)
      .select()
      .single();

    if (testError) {
      console.error('Test table error:', testError);
      return NextResponse.json({
        error: 'Test table schema mismatch',
        details: testError.message,
        hint: testError.hint,
        code: testError.code,
        missingColumns: 'Check if description, total_questions, max_marks, is_active columns exist'
      });
    }

    // If successful, clean up the test record
    await supabase.from('tests').delete().eq('id', test.id);

    return NextResponse.json({
      success: true,
      message: 'Database schema is compatible',
      testData
    });

  } catch (error) {
    console.error('Schema test error:', error);
    return NextResponse.json({
      error: 'Schema test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
