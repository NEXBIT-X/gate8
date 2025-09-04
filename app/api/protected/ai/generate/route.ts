import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateGATEQuestions, QuestionGenerationRequest } from '@/lib/ai/gateQuestions';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const payload = body as QuestionGenerationRequest & { aiEngine?: 'groq' | 'gemini' | 'openai' };

    // Basic validation
    if (!payload || !payload.subjects || !Array.isArray(payload.subjects) || payload.subjects.length === 0) {
      return NextResponse.json({ error: 'At least one subject must be provided' }, { status: 400 });
    }

    // Require authenticated user for protected route
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Call generator on server-side (uses process.env keys inside)
    const engine = payload.aiEngine || 'gemini';
    const result = await generateGATEQuestions(payload, engine);

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Generation failed', details: result }, { status: 500 });
    }

    return NextResponse.json({ success: true, questions: result.questions, metadata: result.metadata, engineUsed: result.engineUsed });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Protected AI generate error:', message);
    return NextResponse.json({ error: 'Internal server error', message }, { status: 500 });
  }
}

export async function OPTIONS() {
  // Allow preflight from browsers during development/testing
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}
