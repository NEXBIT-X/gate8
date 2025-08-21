/**
 * Utility to parse free-form question text into structured questions using Groq AI.
 * Uses intelligent AI parsing with comprehensive database schema alignment.
 * Eliminates heuristic parsing in favor of pure AI-based conversion.
 */


export interface RawParsedQuestion {
  question_text: string;
  question_type: 'MCQ' | 'MSQ' | 'NAT';
  options?: string[]; // required for MCQ/MSQ
  correct_answer: string | string[]; // NAT -> string (numeric/text), MCQ -> string, MSQ -> string[]
  marks: number;
  negative_marks?: number;
  explanation?: string;
  // Additional database fields stored for later insertion
  _dbFields?: {
    tag?: string | null;
    difficulty?: 'easy' | 'medium' | 'hard' | null;
    content_type?: 'text' | 'html';
    has_code?: boolean;
    programming_language?: string | null;
    question_html?: string | null;
    explanation_html?: string | null;
  };
}

export interface ParseQuestionsResult {

  warnings: string[];
  rawModelResponse?: unknown;
  questions: RawParsedQuestion[];
}
/**
 * Parse free-form multi-line input into structured questions using Groq.
 * Uses Groq AI to intelligently convert any input format into structured questions.
 */
import Groq from 'groq-sdk';
export async function parseQuestionsWithAI(input: string): Promise<ParseQuestionsResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is required for AI parsing');
  }

  try {
    const enhancedPrompt = `You are an expert question parser and formatter. Convert the given input into a structured JSON array of exam questions following this EXACT database schema:

DATABASE SCHEMA:
{
  "question": "string (required) - The main question text",
  "question_type": "MCQ|MSQ|NAT (required)",
  "options": ["array of strings or null"] - Required for MCQ/MSQ, null for NAT,
  "correct_answer": "string (required) - Answer text or option letter/number",
  "marks": "number (default 2)",
  "negative_marks": "number (default 0.5 for MCQ/MSQ, 0 for NAT)",
  "tag": "string or null - Subject/topic tag",
  "explanation": "string or null - Detailed explanation",
  "difficulty": "easy|medium|hard or null",
  "content_type": "text|html (default text)",
  "has_code": "boolean (true if question contains code)",
  "programming_language": "string or null - Language if has_code is true",
  "question_html": "string or null - HTML version if needed",
  "explanation_html": "string or null - HTML explanation if needed",
      // "question_number": "number or null - If input has explicit numbering like 'Question 3:' set this"
}

CRITICAL REQUIREMENTS:
1. ALWAYS provide a correct_answer - guess intelligently if not explicitly stated
2. For MCQ: correct_answer should be the option text or letter (A, B, C, etc.)
3. For MSQ: correct_answer should be comma-separated options or letters
4. For NAT: correct_answer should be the numerical/text answer
5. Detect question type intelligently from context
6. Set has_code=true and programming_language if code is present
7. Add appropriate tags based on subject matter
8. Generate explanations when possible
9. Assess difficulty level when determinable
10. If the input includes explicit numbering like "Question 3:" or "3)", populate a top-level numeric field "question_number" with that value for that question. This helps preserve original ordering.

RETURN ONLY VALID JSON ARRAY - NO MARKDOWN, NO EXPLANATIONS:

Input to parse:
${input}`;

    console.log('🔑 Groq API Key present:', !!apiKey);
    console.log('📝 Enhanced prompt length:', enhancedPrompt.length);

    const groq = new Groq({ apiKey });
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: enhancedPrompt
        }
      ],
      model: 'llama-3.1-8b-instant',
      temperature: 0.0,
      max_tokens: 4000,
      top_p: 0.9
    });

    const text = chatCompletion.choices?.[0]?.message?.content || '';
    if (!text) {
      throw new Error('Groq returned empty response');
    }

    console.log('Raw Groq response:', text.substring(0, 500) + '...');

    const jsonText = extractJson(text);
    console.log('🔧 Cleaned JSON preview:', jsonText.substring(0, 300));

    try {
      const parsed = JSON.parse(jsonText) as any[];
      console.log('✅ JSON parsed successfully, questions found:', parsed.length);
      
      // Convert to our internal format and validate
      const converted = parsed.map((q, i) => ({
  question_text: q.question || q.question_text || '',
  question_type: q.question_type || 'MCQ',
  question_number: (q.question_number !== undefined && q.question_number !== null) ? Number(q.question_number) : undefined,
        options: q.options || undefined,
        correct_answer: q.correct_answer || '',
        marks: q.marks || 2,
        negative_marks: q.negative_marks ?? (q.question_type === 'NAT' ? 0 : 0.5),
  explanation: q.explanation || undefined,
        // Store additional fields for later DB insertion
        _dbFields: {
          tag: q.tag || null,
          difficulty: q.difficulty || null,
          content_type: q.content_type || 'text',
          has_code: q.has_code || false,
          programming_language: q.programming_language || null,
          question_html: q.question_html || null,
    explanation_html: q.explanation_html || null
        }
      }));

      const { cleaned, warnings } = validateAndClean(converted);
      return { 
        questions: cleaned, 
        warnings: warnings.length ? warnings : ['Questions parsed and enhanced by Groq AI'],
        rawModelResponse: { provider: 'groq', raw: text } 
      };
    } catch (jsonError: any) {
      console.error('❌ JSON Parse Error:', jsonError.message);
      console.error('📝 Problematic JSON:', jsonText.substring(0, 500));

      // Try to fix common JSON errors and retry
      const fixedJson = fixCommonJsonErrors(jsonText);
      console.log('🔨 Attempting JSON fix...');

      try {
        const parsed = JSON.parse(fixedJson) as any[];
        console.log('✅ Fixed JSON parsed successfully');
        const converted = parsed.map(q => ({
          question_text: q.question || q.question_text || '',
          question_type: q.question_type || 'MCQ',
          options: q.options || undefined,
          correct_answer: q.correct_answer || '',
          marks: q.marks || 2,
          negative_marks: q.negative_marks ?? (q.question_type === 'NAT' ? 0 : 0.5),
          explanation: q.explanation || undefined,
          _dbFields: {
            tag: q.tag || null,
            difficulty: q.difficulty || null,
            content_type: q.content_type || 'text',
            has_code: q.has_code || false,
            programming_language: q.programming_language || null,
            question_html: q.question_html || null,
            explanation_html: q.explanation_html || null
          }
        }));
        const { cleaned, warnings } = validateAndClean(converted);
        warnings.push('JSON had formatting errors - auto-fixed');
        return { questions: cleaned, warnings, rawModelResponse: { provider: 'groq', raw: text } };
      } catch (secondError: any) {
        console.error('❌ JSON fix failed:', secondError.message);
        throw new Error(`Groq JSON parsing failed: ${jsonError.message}. Raw output: ${text.slice(0, 500)}`);
      }
    }
  } catch (e: any) {
    console.error('💥 Groq parse error details:', { message: e?.message, name: e?.name });
    throw new Error(`Groq AI parsing failed: ${e?.message || e}`);
  }
}

/**
 * Validates and cleans parsed questions, ensuring correct format without auto-guessing answers.
 */
function validateAndClean(list: RawParsedQuestion[]): { cleaned: RawParsedQuestion[]; warnings: string[] } {
  const warnings: string[] = [];
  const cleaned: RawParsedQuestion[] = [];
  
  list.forEach((q, i) => {
    if (!q.question_text) { 
      warnings.push(`Item ${i} missing question_text – skipped`); 
      return; 
    }
    
    let type = q.question_type as RawParsedQuestion['question_type'];
    if (!['MCQ','MSQ','NAT'].includes(type)) {
      // Infer type from options if available
      if (Array.isArray(q.options) && q.options.length) type = 'MCQ'; 
      else type = 'NAT';
      warnings.push(`Item ${i} invalid question_type – inferred ${type}`);
    }
    
    let options = q.options;
    if ((type === 'MCQ' || type === 'MSQ') && (!options || options.length < 2)) {
      warnings.push(`Item ${i} ${type} missing sufficient options – downgraded to NAT`);
      type = 'NAT';
      options = undefined;
    }
    
    let correct = q.correct_answer as any;
    
    // Handle missing or empty correct_answer - do NOT auto-guess
    if (!correct || correct === "" || correct === null || correct === undefined) {
      if (type === 'MSQ') {
        correct = []; // empty array indicates no answers yet
        warnings.push(`Item ${i} missing correct_answer – requires manual review`);
      } else if (type === 'MCQ') {
        correct = ''; // empty string indicates missing answer
        warnings.push(`Item ${i} missing correct_answer – requires manual review`);
      } else {
        correct = '';
        warnings.push(`Item ${i} missing correct_answer – requires manual review`);
      }
    }

    // Normalize correct_answer format by type
    if (type === 'MSQ' && !Array.isArray(correct)) {
      correct = [String(correct)];
      warnings.push(`Item ${i} MSQ correct_answer forced into array`);
    }
    if (type === 'MCQ' && Array.isArray(correct)) {
      if (correct.length === 0) {
        correct = '';
        warnings.push(`Item ${i} MCQ correct_answer missing after normalization – requires manual review`);
      } else {
        correct = correct[0];
        warnings.push(`Item ${i} MCQ correct_answer had multiple values – took first`);
      }
    }
    if (type === 'NAT' && Array.isArray(correct)) {
      correct = correct[0];
      warnings.push(`Item ${i} NAT correct_answer array – took first`);
    }
    
    cleaned.push({
      // Preserve whitespace exactly as provided by the parser/AI — do not trim internal spacing
      question_text: String(q.question_text),
      question_type: type,
      options: options?.map(o => String(o)),
      correct_answer: correct,
      marks: Number(q.marks) || 2,
      negative_marks: Number(q.negative_marks) ?? (type === 'NAT' ? 0 : 0.5),
      explanation: q.explanation || undefined,
      _dbFields: q._dbFields || {}
    });
  });
  
  return { cleaned, warnings };
}

/**
 * Extracts JSON from potentially markdown-wrapped or commented text.
 */
function extractJson(text: string): string {
  // Intentionally do not trim the entire model output here — we want to preserve
  // any leading/trailing whitespace inside code blocks or string values.
  
  // Remove outer markdown code fences if present but preserve ALL inner whitespace
  // (avoid consuming trailing spaces/newlines inside code blocks).
  const fenceMatch = text.match(/```(?:json)?\n?([\s\S]*?)```/);
  if (fenceMatch) {
    text = fenceMatch[1];
  }
  
  // Look for array boundaries
  const start = text.indexOf('[');
  const lastEnd = text.lastIndexOf(']');
  
  if (start !== -1 && lastEnd !== -1 && lastEnd > start) {
    text = text.substring(start, lastEnd + 1);
  }
  
  // Return as-is (without trimming inner JSON) to preserve spacing inside string values
  return text;
}

/**
 * Attempts to fix common JSON formatting errors.
 */
function fixCommonJsonErrors(jsonText: string): string {
  let fixed = jsonText;
  
  // Remove trailing commas before closing brackets
  fixed = fixed.replace(/,(\s*[}\]])/g, '$1');
  
  // Fix unquoted property names
  fixed = fixed.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');
  
  // Fix single quotes to double quotes
  fixed = fixed.replace(/'/g, '"');
  
  // Fix escaped quotes issues
  fixed = fixed.replace(/\\"/g, '\\"');
  
  return fixed;
}

/**
 * Formats code snippets in text to use div with className="code" instead of markdown.
 */
function formatCodeInText(text: string): string {
  // Convert inline code (`code`) to simple text - preserve inner spacing
  text = text.replace(/`([^`]+)`/g, '$1');

  // Convert code blocks to indicate they should be rendered as div.code
  // Preserve original code block whitespace exactly as provided
  text = text.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
    return `[CODE]${code}[/CODE]`;
  });
  
  return text;
}