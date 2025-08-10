import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin permissions (you can customize this)
    const allowedEmails = ["abhijeethvn2006@gmail.com", "pavan03062006@gmail.com"];
    if (!user?.email || !allowedEmails.includes(user.email)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const {
      title,
      description,
      duration_minutes,
      total_questions,
      max_marks,
      start_time,
      end_time,
      is_active = true
    } = body;

    // Validate required fields
    if (!title || !description || !duration_minutes || !start_time || !end_time) {
      return NextResponse.json(
        { error: 'Missing required fields: title, description, duration_minutes, start_time, end_time' },
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

    // Create test in database
    const { data: test, error: testError } = await supabase
      .from('tests')
      .insert({
        title,
        // Map description to tags array for now
        tags: description ? [description] : [],
        duration_minutes,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        // Note: total_questions, max_marks, is_active will be added if columns exist
        // For now, we'll store them in a future update
      })
      .select()
      .single();

    if (testError) {
      console.error('Error creating test:', testError);
      
      // If it's a column not found error, try adding the missing columns
      if (testError.code === '42703') { // Column does not exist
        console.log('Database schema needs updating. Missing columns detected.');
        return NextResponse.json(
          { 
            error: 'Database schema needs updating', 
            details: 'Missing required columns: description, total_questions, max_marks, is_active',
            hint: 'Please run the database migration script'
          },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to create test', details: testError.message },
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
