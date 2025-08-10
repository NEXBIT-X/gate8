import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseQuestionsWithAI } from '@/lib/ai/parseQuestions';

export const maxDuration = 30; // allow longer for model call

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const allowedEmails = [
      'abhijeethvn2006@gmail.com',
      'pavan03062006@gmail.com',
      'abhijeethvn@gmail.com',
      'examapp109@gmail.com'
    ];
    if (!user.email || !allowedEmails.includes(user.email)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { rawText } = body;
    if (!rawText || typeof rawText !== 'string') {
      return NextResponse.json({ error: 'rawText string required' }, { status: 400 });
    }

    const parsed = await parseQuestionsWithAI(rawText);

    return NextResponse.json({ success: true, ...parsed });
  } catch (e: any) {
    return NextResponse.json({ error: 'Parse failed', details: e?.message || 'Unknown' }, { status: 500 });
  }
}
