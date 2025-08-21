import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Admin whitelist (same as tests/create)
    const allowedEmails = [
      "abhijeethvn2006@gmail.com",
      "pavan03062006@gmail.com",
      "abhijeethvn@gmail.com",
      "examapp109@gmail.com"
    ];
    if (!user?.email || !allowedEmails.includes(user.email)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Use service role client to fetch tests
    const adminClient = createServiceRoleClient();
    // Some deployments may not have `is_active` column; select only commonly present fields.
    const { data: tests, error: listError } = await adminClient
      .from('tests')
      .select('id,title,start_time,end_time,duration_minutes')
      .order('start_time', { ascending: false });

    if (listError) {
      console.error('Error listing tests:', listError);
      return NextResponse.json({ error: 'Failed to list tests', details: listError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, tests: tests || [] });
  } catch (error) {
    console.error('Error in GET /api/admin/tests/list:', error);
    return NextResponse.json({ error: 'Internal server error', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
