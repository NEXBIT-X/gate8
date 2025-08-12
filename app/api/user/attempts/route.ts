import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all test attempts for the current user with test details
    const { data: attempts, error: attemptsError } = await supabase
      .from('user_test_attempts')
      .select(`
        id,
        test_id,
        started_at,
        submitted_at,
        is_completed,
        total_score,
        percentage,
        time_taken_seconds,
        tests (
          id,
          title,
          tags,
          duration_minutes,
          start_time,
          end_time,
          created_at
        )
      `)
      .eq('user_id', user.id)
      .order('started_at', { ascending: false });

    if (attemptsError) {
      console.error('Error fetching user attempts:', attemptsError);
      return NextResponse.json({ 
        error: 'Failed to fetch test attempts', 
        details: attemptsError.message 
      }, { status: 500 });
    }

    // Transform the data to match our expected format
    const transformedAttempts = attempts?.map(attempt => ({
      ...attempt,
      test: attempt.tests
    })) || [];

    return NextResponse.json(transformedAttempts);
  } catch (error) {
    console.error('Error in GET /api/user/attempts:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
