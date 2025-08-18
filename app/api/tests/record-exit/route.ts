import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { attemptId } = body;
    if (!attemptId) return NextResponse.json({ error: 'attemptId required' }, { status: 400 });

    // Fetch attempt
    const { data: attempt, error: fetchError } = await supabase
      .from('user_test_attempts')
      .select('id, answers')
      .eq('id', attemptId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !attempt) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 });
    }

    const answers = attempt.answers || {};
    const current = typeof answers._exit_attempts === 'number' ? answers._exit_attempts : 0;
    const next = current + 1;
    answers._exit_attempts = next;

    const { error: updateError } = await supabase
      .from('user_test_attempts')
      .update({ answers })
      .eq('id', attemptId);

    if (updateError) {
      console.error('Failed to update exit attempts:', updateError);
      return NextResponse.json({ error: 'Failed to update attempt' }, { status: 500 });
    }

    return NextResponse.json({ success: true, exitAttempts: next });
  } catch (error) {
    console.error('Error in record-exit route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
