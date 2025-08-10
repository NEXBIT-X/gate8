import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication using regular client
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin permissions (updated email list)
    const allowedEmails = [
      "abhijeethvn2006@gmail.com", 
      "pavan03062006@gmail.com",
      "abhijeethvn@gmail.com",
      "examapp109@gmail.com"
    ];
    if (!user?.email || !allowedEmails.includes(user.email)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const {
      title,
      description,
      duration_minutes,
      start_time,
      end_time,
      total_questions,
      max_marks,
      is_active = true
    } = body;

    console.log('Creating test with data:', { title, duration_minutes, total_questions, max_marks });

    // Validate required fields
    if (!title || !duration_minutes || !start_time || !end_time) {
      return NextResponse.json(
        { error: 'Missing required fields: title, duration_minutes, start_time, end_time' },
        { status: 400 }
      );
    }

    // Validate dates
    const startDate = new Date(start_time);
    const endDate = new Date(end_time);
    
    if (startDate >= endDate) {
      return NextResponse.json(
        { error: 'End time must be after start time' },
        { status: 400 }
      );
    }

    // Create test in database with minimal required fields
    const testInsertData = {
      title,
      duration_minutes,
      start_time: startDate.toISOString(),
      end_time: endDate.toISOString()
    };

    console.log('Inserting test data:', testInsertData);

    // Use service role client for admin operations to bypass RLS
    const adminClient = createServiceRoleClient();
    const { data: test, error: testError } = await adminClient
      .from('tests')
      .insert(testInsertData)
      .select()
      .single();

    if (testError) {
      console.error('Error creating test:', testError);
      console.error('Full error details:', JSON.stringify(testError, null, 2));
      return NextResponse.json(
        { 
          error: 'Failed to create test', 
          details: testError.message,
          code: testError.code,
          fullError: testError,
          hint: testError.code === '42501' ? 'Database permission error. Run fix_production_auth.sql script.' : 
                testError.code === 'PGRST204' ? 'Database schema mismatch. Some columns may not exist in your database.' : undefined
        },
        { status: 500 }
      );
    }

    console.log('Test created successfully:', test.id);

    return NextResponse.json({
      success: true,
      test,
      message: 'Test created successfully'
    });

  } catch (error) {
    console.error('Error in POST /api/admin/tests/create:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
