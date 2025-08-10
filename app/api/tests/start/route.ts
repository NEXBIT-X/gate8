import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('Authentication error:', userError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { testId } = await request.json();

    if (!testId) {
      return NextResponse.json({ error: 'Test ID is required' }, { status: 400 });
    }

    console.log('Starting test for user:', user.id, 'testId:', testId);

    // Check if test exists and is available
    const { data: test, error: testError } = await supabase
      .from('tests')
      .select('*')
      .eq('id', testId)
      .single();

    if (testError) {
      console.error('Test fetch error:', testError);
      return NextResponse.json({ error: 'Test not found: ' + testError.message }, { status: 404 });
    }

    if (!test) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    const now = new Date();
    const startTime = new Date(test.start_time);
    const endTime = new Date(test.end_time);

    if (now < startTime) {
      return NextResponse.json({ error: 'Test has not started yet' }, { status: 400 });
    }

    if (now > endTime) {
      return NextResponse.json({ error: 'Test has ended' }, { status: 400 });
    }

    // Check if user already has an attempt for this test
    let existingAttempt = null;
    let existingAttemptError = null;
    
    try {
      const { data, error } = await supabase
        .from('user_test_attempts')
        .select('*')
        .eq('user_id', user.id)
        .eq('test_id', testId)
        .single();
        
      existingAttempt = data;
      existingAttemptError = error;
    } catch (tableError) {
      console.error('Table access error (table might not exist):', tableError);
      return NextResponse.json({ 
        error: 'Database not properly set up', 
        details: 'The user_test_attempts table does not exist. Please run the database setup script.',
        hint: 'Run the fix_test_attempts.sql script in your Supabase SQL Editor'
      }, { status: 500 });
    }

    if (existingAttemptError && existingAttemptError.code !== 'PGRST116') {
      // PGRST116 means no rows found, which is fine
      console.error('Error checking existing attempt:', existingAttemptError);
      
      // Check if it's a table doesn't exist error
      if (existingAttemptError.code === '42P01' || existingAttemptError.message?.includes('does not exist')) {
        return NextResponse.json({ 
          error: 'Database tables missing', 
          details: 'The user_test_attempts table does not exist. Please run the database setup script.',
          hint: 'Run the fix_test_attempts.sql script in your Supabase SQL Editor'
        }, { status: 500 });
      }
      
      return NextResponse.json({ 
        error: 'Failed to check existing attempts', 
        details: existingAttemptError.message,
        code: existingAttemptError.code
      }, { status: 500 });
    }

    if (existingAttempt) {
      if (existingAttempt.is_completed) {
        return NextResponse.json({ error: 'Test already completed' }, { status: 400 });
      }
      // Return existing attempt if not completed
      console.log('Returning existing attempt:', existingAttempt.id);
      return NextResponse.json({ 
        success: true,
        attempt: existingAttempt,
        test: { ...test }
      });
    }

    // Get questions for this test
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('*')
      .eq('test_id', testId);

    if (questionsError) {
      console.error('Error fetching questions:', questionsError);
      return NextResponse.json({ 
        error: 'Failed to fetch questions', 
        details: questionsError.message 
      }, { status: 500 });
    }

    if (!questions || questions.length === 0) {
      console.error('No questions found for test:', testId);
      return NextResponse.json({ 
        error: 'No questions found for this test',
        testId: testId 
      }, { status: 400 });
    }

    console.log(`Found ${questions.length} questions for test ${testId}`);

    // Create new test attempt with explicit data
    console.log('Creating test attempt for user:', user.id, 'test:', testId);
    
    const attemptData = {
      user_id: user.id,
      test_id: testId,
      answers: {},
      total_score: 0.00,
      percentage: 0.00,
      is_completed: false,
      time_taken_seconds: 0
    };
    
    console.log('Attempt data to insert:', attemptData);

    let attempt = null;
    let attemptError = null;
    
    try {
      const { data, error } = await supabase
        .from('user_test_attempts')
        .insert(attemptData)
        .select()
        .single();
        
      attempt = data;
      attemptError = error;
    } catch (insertError) {
      console.error('Insert error (table might not exist):', insertError);
      return NextResponse.json({ 
        error: 'Database not properly set up', 
        details: 'Cannot create test attempt. The user_test_attempts table may not exist.',
        hint: 'Run the fix_test_attempts.sql script in your Supabase SQL Editor',
        setupRequired: true
      }, { status: 500 });
    }

    if (attemptError) {
      console.error('Detailed attempt creation error:', {
        error: attemptError,
        code: attemptError.code,
        message: attemptError.message,
        details: attemptError.details,
        hint: attemptError.hint
      });
      
      // Check if it's a table doesn't exist error
      if (attemptError.code === '42P01' || attemptError.message?.includes('does not exist')) {
        return NextResponse.json({ 
          error: 'Database tables missing', 
          details: 'The user_test_attempts table does not exist. Please run the database setup script.',
          hint: 'Run the fix_test_attempts.sql script in your Supabase SQL Editor',
          setupRequired: true
        }, { status: 500 });
      }
      
      return NextResponse.json({ 
        error: 'Failed to create test attempt', 
        details: attemptError.message,
        code: attemptError.code,
        hint: attemptError.hint
      }, { status: 500 });
    }

    console.log('Test attempt created successfully:', attempt.id);

    return NextResponse.json({ 
      success: true,
      attempt,
      test: {
        ...test,
        questions: questions
      }
    });
  } catch (error) {
    console.error('Error in POST /api/tests/start:', error);
    
    // Ensure we always return a proper error object
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    
    return NextResponse.json({ 
      error: 'Internal server error',
      details: errorMessage,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
