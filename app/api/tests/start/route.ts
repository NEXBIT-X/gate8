import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const serviceSupabase = createServiceClient();
    
    // Log environment info for debugging
    console.log('Environment check:', {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      nodeEnv: process.env.NODE_ENV
    });
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('Authentication error:', userError);
      return NextResponse.json({ 
        error: 'Unauthorized',
        details: userError?.message || 'No user found',
        hint: 'Please ensure you are logged in and try again'
      }, { status: 401 });
    }

    const { testId } = await request.json();

    if (!testId) {
      return NextResponse.json({ error: 'Test ID is required' }, { status: 400 });
    }

    console.log('Starting test for user:', user.id, 'testId:', testId);

    // Check if test exists and is available
    const { data: test, error: testError } = await serviceSupabase
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
      console.log('Checking for existing attempts for user:', user.id, 'test:', testId);
      const { data, error } = await serviceSupabase
        .from('user_test_attempts')
        .select('*')
        .eq('user_id', user.id)
        .eq('test_id', testId)
        .single();
        
      existingAttempt = data;
      existingAttemptError = error;
      console.log('Attempt check result:', { hasData: !!data, errorCode: error?.code });
    } catch (tableError) {
      console.error('Table access error (table might not exist):', tableError);
      return NextResponse.json({ 
        error: 'Database not properly set up', 
        details: 'The user_test_attempts table does not exist or is not accessible.',
        hint: 'Run the fix_production_auth.sql script in your Supabase SQL Editor',
        sqlScript: 'fix_production_auth.sql'
      }, { status: 500 });
    }

    if (existingAttemptError && existingAttemptError.code !== 'PGRST116') {
      // PGRST116 means no rows found, which is fine
      console.error('Error checking existing attempt:', existingAttemptError);
      
      // Check for common RLS permission errors
      if (existingAttemptError.code === '42501') {
        return NextResponse.json({ 
          error: 'Database permission error', 
          details: 'Row Level Security policies are blocking access. This is a common deployment issue.',
          hint: 'Run the fix_production_auth.sql script in your Supabase SQL Editor to fix RLS policies',
          code: existingAttemptError.code,
          sqlScript: 'fix_production_auth.sql'
        }, { status: 500 });
      }
      
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
      // Prevent any re-attempt of a test that has been started
      return NextResponse.json({ 
        error: 'Test already attempted', 
        details: 'You have already attempted this test. Each test can only be attempted once.',
        hint: 'You can view your test results from the dashboard.'
      }, { status: 400 });
    }

    // Get questions for this test (ordered by id since no question_number in your schema)
    console.log('Fetching questions for test ID:', testId);
    const { data: questions, error: questionsError } = await serviceSupabase
      .from('questions')
      .select('*')
      .eq('test_id', testId)
      .order('id');

    console.log('Questions query result:', { 
      data: questions, 
      error: questionsError,
      count: questions?.length || 0 
    });

    if (questionsError) {
      console.error('Error fetching questions:', questionsError);
      return NextResponse.json({ 
        error: 'Failed to fetch questions', 
        details: questionsError.message 
      }, { status: 500 });
    }

    if (!questions || questions.length === 0) {
      console.error('No questions found for test:', testId);
      
      // Let's check if the test exists and get some info about it
      const { data: testCheck } = await serviceSupabase
        .from('tests')
        .select('id, title')
        .eq('id', testId)
        .single();
      
      console.log('Test exists check:', testCheck);
      
      return NextResponse.json({ 
        error: 'No questions found for this test',
        testId: testId,
        testExists: !!testCheck,
        hint: 'Please check if questions are properly inserted in the database for this test ID'
      }, { status: 400 });
    }

    console.log(`Found ${questions.length} questions for test ${testId}`);

    // Transform questions to match the expected interface
    const transformedQuestions = questions.map(q => ({
      id: q.id, // This is already correct (serial/integer)
      test_id: q.test_id,
      question: q.question, // Your schema uses 'question', not 'question_text'
      question_type: q.question_type,
      options: q.options, // Your schema uses text[], not jsonb
      correct_answer: q.correct_answer, // Your schema uses text, not jsonb
      marks: q.marks,
      negative_marks: q.negative_marks,
      created_at: q.created_at
    }));
    
    console.log('Transformed questions sample:', transformedQuestions[0]);
    console.log('All transformed questions count:', transformedQuestions.length);

    // Create new test attempt with only the columns that exist in your schema
    console.log('Creating test attempt for user:', user.id, 'test:', testId);
    
    const attemptData = {
      user_id: user.id,
      test_id: testId,
      answers: {},
      is_completed: false
      // started_at will be set automatically by your schema default
    };
    
    console.log('Attempt data to insert:', attemptData);

    let attempt = null;
    let attemptError = null;
    
    try {
      const { data, error } = await serviceSupabase
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
        questions: transformedQuestions
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
