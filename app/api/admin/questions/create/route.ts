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

    // Check admin permissions
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
    const { testId, questions } = body;

    // Validate required fields
    if (!testId || !questions || !Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: testId and questions array' },
        { status: 400 }
      );
    }

    // Verify test exists using admin client
    const adminClient = createServiceRoleClient();
    const { data: test, error: testError } = await adminClient
      .from('tests')
      .select('id')
      .eq('id', testId)
      .single();

    if (testError || !test) {
      return NextResponse.json(
        { error: 'Test not found' },
        { status: 404 }
      );
    }

    // Build normalized questions array (validation + base shape)
    interface IncomingQuestion { question_text: string; question_type: string; marks: number; negative_marks?: number; options?: string[]; correct_answer: string | string[] | number; question_number?: number }
    const normalized = questions.map((q: IncomingQuestion, index: number) => {
      if (!q.question_text || !q.question_type || q.marks === undefined) {
        throw new Error(`Question ${index + 1}: Missing required fields (question_text, question_type, marks)`);
      }
      if (!['MCQ', 'MSQ', 'NAT'].includes(q.question_type)) {
        throw new Error(`Question ${index + 1}: Invalid question type`);
      }

      // Helper: map a label/number/text to an option text when options are provided
      const tryMapToOption = (val: any, optionsArr: string[] | null): string | null => {
        if (val === undefined || val === null) return null;
        if (!optionsArr || optionsArr.length === 0) return String(val);
        if (typeof val === 'number' && Number.isFinite(val)) {
          const idx = Number(val) - 1;
          if (idx >= 0 && idx < optionsArr.length) return optionsArr[idx];
        }
        const s = String(val).trim();
        if (/^[A-Za-z]$/.test(s)) {
          const idx = s.toUpperCase().charCodeAt(0) - 65;
          if (idx >= 0 && idx < optionsArr.length) return optionsArr[idx];
        }
        if (/^\d+$/.test(s)) {
          const idx = Number(s) - 1;
          if (idx >= 0 && idx < optionsArr.length) return optionsArr[idx];
        }
        const match = optionsArr.find(o => o.trim().toLowerCase() === s.toLowerCase());
        if (match) return match;
        return s;
      };

      let options: string[] | null = Array.isArray(q.options) ? q.options : null;
      let correct_answer: string | string[];

      if (q.question_type === 'MCQ') {
        if (!options || options.length === 0) throw new Error(`Question ${index + 1}: MCQ requires options`);
        const ca = q.correct_answer;
        if (Array.isArray(ca)) {
          if (ca.length === 0) throw new Error(`Question ${index + 1}: MCQ requires a single correct answer`);
          const mapped = tryMapToOption(ca[0], options);
          if (!mapped) throw new Error(`Question ${index + 1}: Unable to map MCQ correct answer to an option`);
          correct_answer = mapped;
        } else {
          const mapped = tryMapToOption(ca, options);
          if (!mapped) throw new Error(`Question ${index + 1}: Unable to map MCQ correct answer to an option`);
          correct_answer = mapped;
        }
      } else if (q.question_type === 'MSQ') {
        if (!options || options.length === 0) throw new Error(`Question ${index + 1}: MSQ requires options`);
        const ca = q.correct_answer;
        let values: any[] = [];
        if (Array.isArray(ca)) values = ca;
        else if (typeof ca === 'string') values = ca.split(',').map(s => s.trim()).filter(s => s.length > 0);
        else if (typeof ca === 'number') values = [ca];
        if (!values || values.length === 0) throw new Error(`Question ${index + 1}: MSQ requires a non-empty array of correct answers`);
        const mappedArr: string[] = values.map(v => {
          const m = tryMapToOption(v, options);
          if (!m) throw new Error(`Question ${index + 1}: Unable to map one of the MSQ correct answers to an option`);
          return m;
        });
        correct_answer = mappedArr;
      } else { // NAT
        if (q.correct_answer === undefined || q.correct_answer === '') throw new Error(`Question ${index + 1}: NAT requires a correct answer`);
        correct_answer = q.correct_answer.toString();
      }

      return {
        test_id: testId,
        question_text: q.question_text,
        question: q.question_text,
        question_type: q.question_type,
        options: options,
        correct_answer,
        marks: q.marks,
        negative_marks: q.negative_marks || 0,
        question_number: q.question_number || (index + 1)
      };
    });

    // Attempt adaptive insertion handling differing schemas
    async function attemptInsert(variant: 'full' | 'no_number' | 'legacy'): Promise<{ data: any[] | null; error: any | null; used: string; }> {
      // Use a broadly typed payload to allow removing fields per variant
      let payload: any[] = normalized.map(q => ({ ...q }));
      if (variant === 'no_number') {
        payload = payload.map(q => { const { question_number, ...rest } = q; return { ...rest }; });
      } else if (variant === 'legacy') {
        // Remove question_text & question_number, keep 'question' only
        payload = payload.map(q => { const { question_text, question_number, ...rest } = q; return { ...rest }; });
      } else {
        // 'full' variant removes the legacy 'question' duplicate
        payload = payload.map(q => { const { question, ...rest } = q; return { ...rest }; });
      }
      console.log(`Trying insert variant: ${variant}`);
      const { data, error } = await adminClient
        .from('questions')
        .insert(payload)
        .select();
      return { data, error, used: variant };
    }

    let attemptOrder: ('full' | 'no_number' | 'legacy')[] = ['full', 'no_number', 'legacy'];
    let insertedQuestions: any[] | null = null;
    let lastError: any = null;
    let usedVariant: string | null = null;

    for (const variant of attemptOrder) {
      const { data, error, used } = await attemptInsert(variant);
      if (!error && data) { insertedQuestions = data; usedVariant = used; break; }
      lastError = error;
      if (error) {
        console.error(`Insert variant '${variant}' failed:`, error);
        const msg = error.message || '';
        if (msg.includes("'question_number'")) {
          // Skip to no_number variant next automatically
          continue;
        }
        if (msg.includes("'question_text'")) {
          // Force legacy next
          attemptOrder = ['legacy'];
          continue;
        }
      }
    }

    if (!insertedQuestions) {
      return NextResponse.json(
        { error: 'Failed to create questions', details: lastError?.message || 'Unknown', code: lastError?.code },
        { status: 500 }
      );
    }

    console.log(`Created ${insertedQuestions.length} questions for test ${testId} using variant '${usedVariant}'`);

    // Update test with total questions and max marks
    // Note: These columns don't exist in current schema
    /*
    const totalQuestions = insertedQuestions.length;
    const maxMarks = insertedQuestions.reduce((sum: number, q: any) => sum + q.marks, 0);

    const { error: updateError } = await adminClient
      .from('tests')
      .update({
        total_questions: totalQuestions,
        max_marks: maxMarks
      })
      .eq('id', testId);

    if (updateError) {
      console.error('Error updating test totals:', updateError);
      // Don't fail the request for this, but log it
    }
    */

    return NextResponse.json({
      success: true,
      questions: insertedQuestions,
      totalQuestions: insertedQuestions.length,
      maxMarks: insertedQuestions.reduce((sum: number, q: { marks: number }) => sum + (Number(q.marks) || 0), 0),
      variant: usedVariant,
      message: `Successfully created ${insertedQuestions.length} questions (variant: ${usedVariant})`
    });

  } catch (error) {
    console.error('Error in POST /api/admin/questions/create:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
