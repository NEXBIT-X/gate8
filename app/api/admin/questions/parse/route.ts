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
       "devash217@gmail.com",
      "b.lakshminarayanan2007@gmail.com"
    ];
    if (!user.email || !allowedEmails.includes(user.email)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json();

    // Normalize incoming payloads. Accept either a string `rawText`,
    // or an object containing `question_markdown`, `question`, or `rawText` keys.
    const preValidationWarnings: string[] = [];
    const normalizeIncoming = (candidate: any): string | null => {
      if (!candidate && candidate !== '') return null;
      // If it's already a string, return as-is (may still be JSON-like)
      if (typeof candidate === 'string') return candidate;
      // If it's an object with common properties, extract them
      if (typeof candidate === 'object') {
        if (typeof candidate.question_markdown === 'string') return candidate.question_markdown;
        if (typeof candidate.rawText === 'string') return candidate.rawText;
        if (typeof candidate.question === 'string') return candidate.question;
        // If object contains simple keys, join them into text
        try {
          return JSON.stringify(candidate);
        } catch (e) {
          return String(candidate);
        }
      }
      return String(candidate);
    };

    let rawTextCandidate = body?.rawText ?? body?.question_markdown ?? body?.question ?? body;
    let rawText: string | null = normalizeIncoming(rawTextCandidate);

    // If the candidate looks like JSON (starts with { or [), try to parse and extract a text field
    if (typeof rawText === 'string') {
      const trimmed = rawText.trim();
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
          const parsedJson = JSON.parse(rawText);
          // If it's an object with question_markdown/rawText/question, prefer those
          if (parsedJson && typeof parsedJson === 'object') {
            if (typeof parsedJson.question_markdown === 'string') {
              rawText = parsedJson.question_markdown;
              preValidationWarnings.push('Extracted question_markdown from JSON payload');
            } else if (typeof parsedJson.rawText === 'string') {
              rawText = parsedJson.rawText;
              preValidationWarnings.push('Extracted rawText from JSON payload');
            } else if (Array.isArray(parsedJson)) {
              // If it's an array of strings or objects, join
              rawText = parsedJson.map((x: any) => (typeof x === 'string' ? x : JSON.stringify(x))).join('\n\n');
              preValidationWarnings.push('Joined array JSON payload into rawText');
            } else {
              // Fallback: stringify object
              rawText = JSON.stringify(parsedJson);
              preValidationWarnings.push('Stringified JSON payload into rawText');
            }
          }
        } catch (e) {
          // Try a simple auto-fix: replace single quotes with double quotes and retry
          try {
            if (typeof rawText === 'string') {
              const attempt = rawText.replace(/'/g, '"');
              const parsedJson = JSON.parse(attempt);
            if (parsedJson && typeof parsedJson === 'object') {
              if (typeof parsedJson.question_markdown === 'string') {
                rawText = parsedJson.question_markdown;
                preValidationWarnings.push('Auto-fixed single quotes and extracted question_markdown');
              } else if (typeof parsedJson.rawText === 'string') {
                rawText = parsedJson.rawText;
                preValidationWarnings.push('Auto-fixed single quotes and extracted rawText');
              } else {
                rawText = JSON.stringify(parsedJson);
                preValidationWarnings.push('Auto-fixed single quotes and stringified JSON payload');
              }
            }
            }
          } catch (_) {
            preValidationWarnings.push('Incoming payload looked like JSON but could not be parsed; using raw string fallback');
            // keep rawText as the original string
          }
        }
      }
    }

    if (!rawText || typeof rawText !== 'string') {
      return NextResponse.json({ error: 'rawText string required', details: 'Could not normalize incoming payload' }, { status: 400 });
    }

    const parsed = await parseQuestionsWithAI(rawText);

    // Merge pre-validation warnings with parser warnings
    const allWarnings = [ ...(parsed.warnings || []), ...preValidationWarnings ];

    return NextResponse.json({ success: true, ...parsed, preValidationWarnings: allWarnings });
  } catch (e: any) {
    return NextResponse.json({ error: 'Parse failed', details: e?.message || 'Unknown' }, { status: 500 });
  }
}
