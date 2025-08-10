/**
 * Utility to parse free-form question text into structured question objects
 * supporting MCQ, MSQ, NAT types with correct_answer and explanation.
 * This uses Google Gemini API (Generative Language) via fetch.
 *
 * IMPORTANT: Do not hardcode the API key. Set GEMINI_API_KEY in server env.
 */

export interface RawParsedQuestion {
  question_text: string;
  question_type: 'MCQ' | 'MSQ' | 'NAT';
  options?: string[]; // required for MCQ/MSQ
  correct_answer: string | string[]; // NAT -> string (numeric/text), MCQ -> string, MSQ -> string[]
  marks: number;
  negative_marks?: number;
  explanation?: string;
}

export interface ParseQuestionsResult {
  questions: RawParsedQuestion[];
  warnings: string[];
  rawModelResponse?: unknown;
}

const SYSTEM_PROMPT = `You are a parser that converts free-form exam question text into a strict JSON array.
Supported types: MCQ (single correct), MSQ (multiple correct), NAT (numerical answer type or short text answer).
Return ONLY JSON with shape: [{"question_text":"...","question_type":"MCQ|MSQ|NAT","options":[".."],"correct_answer":".." OR [".."],"marks":number,"negative_marks":number,"explanation":"..."}, ...]
Rules:
- Provide marks default 2 if not specified.
- Provide negative_marks default 0.5 for MCQ/MSQ, 0 for NAT.
- For MSQ correct_answer must be an array of strings.
- For NAT correct_answer must be a string (no array).
- If options are present infer MCQ/MSQ; if multiple answers indicated use MSQ else MCQ.
- Do not include extraneous fields. Do not wrap JSON in markdown fences.`;

/**
 * Parse free-form multi-line input into structured questions using Gemini.
 * Falls back to a simple heuristic parser if AI call fails.
 */
export async function parseQuestionsWithAI(input: string): Promise<ParseQuestionsResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return heuristicParse(input, ['GEMINI_API_KEY missing – used heuristic parser']);
  }

  try {
    const prompt = `${SYSTEM_PROMPT}\nInput:\n${input}`;
    const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    if (!resp.ok) {
      return heuristicParse(input, [`Gemini API HTTP ${resp.status}`]);
    }
    const data = await resp.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const jsonText = extractJson(text);
    const parsed = JSON.parse(jsonText) as RawParsedQuestion[];
    const { cleaned, warnings } = validateAndClean(parsed);
    return { questions: cleaned, warnings, rawModelResponse: data };
  } catch (e: any) {
    return heuristicParse(input, [ `Gemini parse error: ${e?.message || e}` ]);
  }
}

function extractJson(text: string): string {
  // Remove markdown fences if present
  const fence = /```json[\s\S]*?```|```[\s\S]*?```/i;
  if (fence.test(text)) {
    const match = text.match(/```json([\s\S]*?)```/i) || text.match(/```([\s\S]*?)```/i);
    if (match) return match[1].trim();
  }
  // If text itself is JSON array
  const firstBracket = text.indexOf('[');
  const lastBracket = text.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket !== -1) {
    return text.slice(firstBracket, lastBracket + 1);
  }
  throw new Error('No JSON array found in model output');
}

function validateAndClean(list: RawParsedQuestion[]): { cleaned: RawParsedQuestion[]; warnings: string[] } {
  const warnings: string[] = [];
  const cleaned: RawParsedQuestion[] = [];
  list.forEach((q, i) => {
    if (!q.question_text) { warnings.push(`Item ${i} missing question_text – skipped`); return; }
    let type = q.question_type as RawParsedQuestion['question_type'];
    if (!['MCQ','MSQ','NAT'].includes(type)) {
      // Infer
      if (Array.isArray(q.options) && q.options.length) type = 'MCQ'; else type = 'NAT';
      warnings.push(`Item ${i} invalid question_type – inferred ${type}`);
    }
    let options = q.options;
    if ((type === 'MCQ' || type === 'MSQ') && (!options || options.length < 2)) {
      warnings.push(`Item ${i} ${type} missing sufficient options – downgraded to NAT`);
      type = 'NAT';
      options = undefined;
    }
    let correct = q.correct_answer as any;
    if (type === 'MSQ' && !Array.isArray(correct)) {
      correct = [String(correct)];
      warnings.push(`Item ${i} MSQ correct_answer forced into array`);
    }
    if (type === 'MCQ' && Array.isArray(correct)) {
      correct = correct[0];
      warnings.push(`Item ${i} MCQ correct_answer had multiple values – took first`);
    }
    if (type === 'NAT' && Array.isArray(correct)) {
      correct = correct[0];
      warnings.push(`Item ${i} NAT correct_answer array – took first`);
    }
    cleaned.push({
      question_text: String(q.question_text).trim(),
      question_type: type,
      options: options?.map(o => String(o)),
      correct_answer: correct,
      marks: typeof q.marks === 'number' && q.marks > 0 ? q.marks : 2,
      negative_marks: typeof q.negative_marks === 'number' ? q.negative_marks : (type === 'NAT' ? 0 : 0.5),
      explanation: q.explanation?.toString().trim() || undefined
    });
  });
  return { cleaned, warnings };
}

function heuristicParse(input: string, priorWarnings: string[]): ParseQuestionsResult {
  const blocks = input.split(/\n{2,}/).map(b => b.trim()).filter(Boolean);
  const questions: RawParsedQuestion[] = [];
  const warnings = [...priorWarnings];
  blocks.forEach((block, i) => {
    const lines = block.split(/\n/).map(l => l.trim()).filter(Boolean);
    if (!lines.length) return;
    let questionLine = lines[0];
    questionLine = questionLine.replace(/^\d+\s*[).:-]\s*/,'');
    const optionLines = lines.slice(1).filter(l => /^[A-Da-d][).:-]\s+/.test(l));
    const options = optionLines.map(l => l.replace(/^[A-Da-d][).:-]\s+/,''));
    let type: RawParsedQuestion['question_type'] = options.length ? 'MCQ' : 'NAT';
    // Detect multiple answers markers
    const multiHint = /\b(all that apply|choose (two|three)|multiple answers)\b/i.test(block);
    if (multiHint && options.length) type = 'MSQ';
    // Correct answer heuristic
    let correct: string | string[] = '';
    const explicit = block.match(/Answer\s*[:=]\s*(.+)/i);
    if (explicit) {
      const ans = explicit[1].trim();
      if (type === 'MSQ') {
        const letters = ans.split(/[,\s]+/).filter(Boolean).map(a => a.replace(/[^A-Za-z0-9]/g,'').toUpperCase());
        correct = letters.map(l => {
          const idx = l.charCodeAt(0) - 65; return options[idx] || l;
        });
      } else if (type === 'MCQ') {
        const letter = ans[0].toUpperCase();
        const idx = letter.charCodeAt(0) - 65;
        correct = options[idx] || ans;
      } else {
        correct = ans;
      }
    } else {
      correct = type === 'NAT' ? '' : options[0] || '';
      warnings.push(`Item ${i} no explicit answer – guessed first option/blank`);
    }
    questions.push({
      question_text: questionLine,
      question_type: type,
      options: type === 'NAT' ? undefined : options,
      correct_answer: correct,
      marks: 2,
      negative_marks: type === 'NAT' ? 0 : 0.5,
      explanation: undefined
    });
  });
  return { questions, warnings };
}
