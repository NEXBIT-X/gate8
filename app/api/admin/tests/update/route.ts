import { createServiceRoleClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const allowedEmails = [
      "abhijeethvn2006@gmail.com",
      "pavan03062006@gmail.com",
      "devash217@gmail.com",
      "b.lakshminarayanan2007@gmail.com"
    ];
    if (!user?.email || !allowedEmails.includes(user.email)) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

    const body = await req.json();
    const { testId, duration_minutes, start_time, end_time } = body;
    if (!testId) return NextResponse.json({ error: 'Missing testId' }, { status: 400 });
    if (typeof duration_minutes !== 'number' && typeof start_time !== 'string' && typeof end_time !== 'string') {
      return NextResponse.json({ error: 'Nothing to update (provide duration_minutes or start_time/end_time)' }, { status: 400 });
    }

    const admin = createServiceRoleClient();
    // Fetch existing test to compute new end_time if start_time exists
    const { data: existing, error: fetchErr } = await admin.from('tests').select('id,start_time,end_time').eq('id', testId).single();
    if (fetchErr || !existing) return NextResponse.json({ error: 'Test not found' }, { status: 404 });

    const updatePayload: any = {};
    if (typeof duration_minutes === 'number') updatePayload.duration_minutes = duration_minutes;
    // If client provided explicit start_time/end_time strings, persist them
    if (typeof start_time === 'string') updatePayload.start_time = new Date(start_time).toISOString();
    if (typeof end_time === 'string') updatePayload.end_time = new Date(end_time).toISOString();

    // If duration provided and start_time exists (either existing or provided), compute end_time unless client explicitly supplied end_time
    const effectiveStart = (typeof start_time === 'string') ? new Date(start_time) : (existing.start_time ? new Date(existing.start_time) : null);
    if (typeof duration_minutes === 'number' && effectiveStart && typeof end_time !== 'string') {
      updatePayload.end_time = new Date(effectiveStart.getTime() + duration_minutes * 60 * 1000).toISOString();
    }

    const { data, error: updateErr } = await admin.from('tests').update(updatePayload).eq('id', testId).select();
    if (updateErr) return NextResponse.json({ error: 'Failed to update test', details: updateErr.message }, { status: 500 });

    return NextResponse.json({ success: true, test: data?.[0] || null });
  } catch (e: any) {
    return NextResponse.json({ error: 'Internal server error', details: e?.message || String(e) }, { status: 500 });
  }
}
