/**
 * Utility to parse free-form quconst SYSTEM_PROMPT = `You are a parser that converts free-form exam question text into a strict JSON array.
Supported types: MCQ (single correct), MSQ (multiple correct), NAT (numerical answer type or short text answer).

CRITICAL JSON FORMATTING REQUIREMENTS:
- Return ONLY valid JSON array - no markdown fences, no explanations, no comments
- ALL property names MUST be double-quoted: "question_text", "question_type", etc.
- ALL string values MUST be double-quoted
- Use \\\\n for newlines inside JSON strings
- Use \\\\" for quotes inside JSON strings
- NO trailing commas
- NO unquoted property names
- NO single quotes

MANDATORY JSON STRUCTURE:
[
  {
    "question_text": "...",
    "question_type": "MCQ|MSQ|NAT", 
    "options": ["option1", "option2", "option3"],
    "correct_answer": "..." OR ["answer1", "answer2"],
    "marks": 2,
    "negative_marks": 0.5,
    "explanation": "..."
  }
]

EXAMPLE VALID JSON:
[
  {
    "question_text": "What is 2+2?",
    "question_type": "MCQ",
    "options": ["3", "4", "5"],
    "correct_answer": "4",
    "marks": 2,
    "negative_marks": 0.5
  }
]

CODE FORMATTING RULES (inside JSON strings):
- Use \\\\n\\\\n\`\`\`cpp\\\\ncode\\\\n\`\`\` for C++ code blocks
- Use \`variableName\` for inline code
- Escape all backslashes as \\\\\\\\
- Escape all quotes as \\\\"

CRITICAL: Your response must be parseable by JSON.parse() without any errors.`;ion text into stRules:
- Provide marks default 2 if not specified.
- Provide negative_marks default 0.5 for MCQ/MSQ, 0 for NAT.
- For MSQ correct_answer must be an array of strings.
- For NAT correct_answer must be a string (no array).
- If options are present infer MCQ/MSQ; if multiple answers indicated use MSQ else MCQ.
- Do not include extraneous fields. Do not wrap JSON in markdown fences.
- Ensure all code snippets are properly formatted with appropriate language tags.
- When you see C++ code in input, ALWAYS format it as \`\`\`cpp\\ncode\\n\`\`\`.
- When you see #include statements, treat as C++ and use \`\`\`cpp.
- NEVER break up code statements into multiple inline code segments.
- NEVER use backticks around incomplete code fragments.
- Keep #include statements together in code blocks, not as inline code.
- Only use inline code for complete, standalone elements like variable names or function names.`;`;uestion objects
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

IMPORTANT FORMATTING RULES:
- Use proper markdown formatting for code snippets in question_text, options, and explanation
- Wrap COMPLETE code blocks with triple backticks and language specification: \`\`\`language\\ncode\\n\`\`\`
- SUPPORTED LANGUAGES: python, java, cpp, c, javascript, typescript, html, css, sql, bash, shell
- Use inline code ONLY for single variables, functions, or keywords: \`variableName\`, \`functionName()\`, \`keyword\`
- DO NOT use inline code for partial code snippets or incomplete statements like \`#include < iostream\`
- For programming questions, format COMPLETE code examples with proper syntax highlighting
- Preserve indentation and maintain readable code structure
- Use markdown formatting for mathematical expressions: \`O(log n)\`, \`n^2\`
- Format file paths and commands: \`/path/to/file\`, \`npm install\`

CODE FORMATTING EXAMPLES:
- CORRECT C++ code: "What does this C++ code output?\\n\\n\`\`\`cpp\\n#include <iostream>\\nusing namespace std;\\nint main() {\\n    int x = 5;\\n    cout << x * 2 << endl;\\n    return 0;\\n}\\n\`\`\`"
- CORRECT inline code: "The function \`fibonacci()\` uses recursion"
- WRONG: "\`#include < iostream\`" (this should be in a code block)
- WRONG: "\`std::\`find" (should be \`std::find\` or in a code block)
- Python code: "What does this code do?\\n\\n\`\`\`python\\ndef fibonacci(n):\\n    if n <= 1:\\n        return n\\n    return fibonacci(n-1) + fibonacci(n-2)\\n\`\`\`"
- Java code: "Analyze this Java method:\\n\\n\`\`\`java\\npublic static void main(String[] args) {\\n    System.out.println(\\"Hello World\\");\\n}\\n\`\`\`"
- Option with inline code: "The function \`fibonacci()\` uses recursion to calculate values"
- Algorithm complexity: "The time complexity is \`O(2^n)\` for this recursive approach"
- Data structures: "A \`HashMap\` provides \`O(1)\` average time complexity"

CRITICAL LANGUAGE MAPPING:
- C++ code should ALWAYS use \`\`\`cpp (not c++ or cxx)
- C code should use \`\`\`c
- JavaScript should use \`\`\`javascript or \`\`\`js
- Always include the language identifier for proper syntax highlighting

Rules:
- Provide marks default 2 if not specified.
- Provide negative_marks default 0.5 for MCQ/MSQ, 0 for NAT.
- For MSQ correct_answer must be an array of strings.
- For NAT correct_answer must be a string (no array).
- If options are present infer MCQ/MSQ; if multiple answers indicated use MSQ else MCQ.
- Do not include extraneous fields. Do not wrap JSON in markdown fences.
- Ensure all code snippets are properly formatted with appropriate language tags.
- When you see C++ code in input, ALWAYS format it as \`\`\`cpp\\ncode\\n\`\`\`.
- When you see #include statements, treat as C++ and use \`\`\`cpp.`;

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
    
    console.log('🔑 API Key present:', !!apiKey);
    console.log('📝 Prompt length:', prompt.length);
    
    const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    
    console.log('🌐 Response status:', resp.status, resp.statusText);
    
    if (!resp.ok) {
      const errorText = await resp.text();
      console.error('❌ API Error Response:', errorText);
      return heuristicParse(input, [`Gemini API HTTP ${resp.status}: ${errorText.substring(0, 100)}`]);
    }
    
    const data = await resp.json();
    console.log('📊 Response data structure:', Object.keys(data));
    
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    console.log('📄 Extracted text length:', text.length);
    console.log('📄 Text preview:', text.substring(0, 200));
    
    const jsonText = extractJson(text);
    console.log('🔧 Cleaned JSON preview:', jsonText.substring(0, 300));
    
    try {
      const parsed = JSON.parse(jsonText) as RawParsedQuestion[];
      console.log('✅ JSON parsed successfully, questions found:', parsed.length);
      const { cleaned, warnings } = validateAndClean(parsed);
      return { questions: cleaned, warnings, rawModelResponse: data };
    } catch (jsonError: any) {
      console.error('❌ JSON Parse Error:', jsonError.message);
      console.error('📝 Problematic JSON:', jsonText.substring(0, 500));
      
      // Try to fix common JSON errors and retry
      const fixedJson = fixCommonJsonErrors(jsonText);
      console.log('🔨 Attempting JSON fix...');
      
      try {
        const parsed = JSON.parse(fixedJson) as RawParsedQuestion[];
        console.log('✅ Fixed JSON parsed successfully');
        const { cleaned, warnings } = validateAndClean(parsed);
        warnings.push('JSON had formatting errors - auto-fixed');
        return { questions: cleaned, warnings, rawModelResponse: data };
      } catch (secondError: any) {
        console.error('❌ JSON fix failed:', secondError.message);
        throw new Error(`JSON parsing failed: ${jsonError.message}`);
      }
    }
  } catch (e: any) {
    console.error('💥 Parse error details:', {
      message: e?.message,
      name: e?.name,
      stack: e?.stack?.substring(0, 200)
    });
    
    if (e?.message?.includes('fetch')) {
      return heuristicParse(input, [`Network error: ${e.message} - Check GEMINI_API_KEY and internet connection`]);
    }
    
    return heuristicParse(input, [`Gemini parse error: ${e?.message || e}`]);
  }
}

function extractJson(text: string): string {
  // Remove markdown fences if present
  const fence = /```json[\s\S]*?```|```[\s\S]*?```/i;
  if (fence.test(text)) {
    const match = text.match(/```json([\s\S]*?)```/i) || text.match(/```([\s\S]*?)```/i);
    if (match) return cleanJsonString(match[1].trim());
  }
  // If text itself is JSON array
  const firstBracket = text.indexOf('[');
  const lastBracket = text.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket !== -1) {
    return cleanJsonString(text.slice(firstBracket, lastBracket + 1));
  }
  throw new Error('No JSON array found in model output');
}

function cleanJsonString(jsonStr: string): string {
  // Fix common JSON formatting issues from AI models
  let cleaned = jsonStr;
  
  // Remove any trailing commas before closing braces/brackets
  cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');
  
  // Fix unquoted property names (common AI mistake)
  cleaned = cleaned.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');
  
  // Fix single quotes to double quotes
  cleaned = cleaned.replace(/'/g, '"');
  
  // Fix incomplete strings that might be cut off
  if (cleaned.includes('"question_text": "') && !cleaned.includes('"}')) {
    // Find incomplete strings and try to close them
    const lines = cleaned.split('\n');
    const fixedLines = lines.map(line => {
      if (line.includes('"question_text": "') && !line.includes('",')) {
        return line + '",';
      }
      return line;
    });
    cleaned = fixedLines.join('\n');
  }
  
  // Fix common property name issues
  cleaned = cleaned.replace(/question_text\s*:/g, '"question_text":');
  cleaned = cleaned.replace(/question_type\s*:/g, '"question_type":');
  cleaned = cleaned.replace(/options\s*:/g, '"options":');
  cleaned = cleaned.replace(/correct_answer\s*:/g, '"correct_answer":');
  cleaned = cleaned.replace(/marks\s*:/g, '"marks":');
  cleaned = cleaned.replace(/negative_marks\s*:/g, '"negative_marks":');
  cleaned = cleaned.replace(/explanation\s*:/g, '"explanation":');
  
  // Ensure we have a complete JSON array
  if (!cleaned.trim().startsWith('[')) {
    cleaned = '[' + cleaned;
  }
  if (!cleaned.trim().endsWith(']')) {
    cleaned = cleaned + ']';
  }
  
  return cleaned;
}

function fixCommonJsonErrors(jsonStr: string): string {
  let fixed = jsonStr;
  
  // Fix common AI JSON generation mistakes
  
  // 1. Fix unquoted property names
  fixed = fixed.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');
  
  // 2. Fix single quotes to double quotes
  fixed = fixed.replace(/'/g, '"');
  
  // 3. Fix trailing commas
  fixed = fixed.replace(/,(\s*[}\]])/g, '$1');
  
  // 4. Fix missing quotes around string values
  fixed = fixed.replace(/:\s*([a-zA-Z][a-zA-Z0-9\s]*)\s*([,}\]])/g, (match, value, ending) => {
    if (!value.startsWith('"') && !value.match(/^\d+(\.\d+)?$/) && !['true', 'false', 'null'].includes(value.trim())) {
      return `: "${value.trim()}"${ending}`;
    }
    return match;
  });
  
  // 5. Ensure proper array structure
  if (!fixed.trim().startsWith('[')) {
    fixed = '[' + fixed;
  }
  if (!fixed.trim().endsWith(']')) {
    // Find the last complete object
    const lastBrace = fixed.lastIndexOf('}');
    if (lastBrace !== -1) {
      fixed = fixed.substring(0, lastBrace + 1) + ']';
    } else {
      fixed = fixed + ']';
    }
  }
  
  // 6. Fix incomplete objects
  if (fixed.includes('{') && !fixed.includes('}')) {
    fixed = fixed + '}]';
  }
  
  return fixed;
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
    
    // Handle missing or empty correct_answer
    if (!correct || correct === "" || correct === null || correct === undefined) {
      if (type === 'MCQ' || type === 'MSQ') {
        if (options && options.length > 0) {
          correct = type === 'MSQ' ? [options[0]] : options[0];
          warnings.push(`Item ${i} missing correct_answer – using first option: "${options[0]}"`);
        } else {
          correct = type === 'MSQ' ? [''] : '';
          warnings.push(`Item ${i} missing correct_answer and options – using blank`);
        }
      } else {
        correct = '';
        warnings.push(`Item ${i} missing correct_answer – using blank`);
      }
    }
    
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

/**
 * Format code snippets in text with proper markdown
 */
function formatCodeInText(text: string): string {
  // Handle common code patterns and format them with markdown
  // Be more conservative to avoid breaking up code incorrectly
  
  // 1. Handle complete C++ includes (not fragments)
  text = text.replace(/#include\s*<[^>]+>/g, (match) => `\`${match}\``);
  text = text.replace(/using\s+namespace\s+std;?/g, (match) => `\`${match}\``);
  
  // 2. Format complete function calls (with parentheses)
  text = text.replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)\(\)/g, '`$1()`');
  
  // 3. Format algorithms and complexity (more specific)
  text = text.replace(/\bO\(([^)]+)\)/g, '`O($1)`');
  
  // 4. Format specific C++ keywords only when standalone
  text = text.replace(/\b(cout|cin|endl|std::cout|std::cin|std::endl)\b/g, '`$1`');
  
  // 5. Format common programming keywords only when standalone
  text = text.replace(/\b(return|if|else|while|for|switch|case|break|continue|true|false|null|undefined|NULL|main|int|char|float|double|long|void)\b/g, '`$1`');
  
  // 6. Format complete data structures
  text = text.replace(/\b(vector|array|list|map|set|stack|queue|unordered_map|unordered_set|string)\b/g, '`$1`');
  
  // 7. Clean up any double backticks that might have been created
  text = text.replace(/``+/g, '`');
  
  // 8. Fix common mistakes - remove backticks from incomplete fragments
  text = text.replace(/`#`include/g, '#include');
  text = text.replace(/`<\s*iostream`/g, '<iostream>');
  
  return text;
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
    
    // Format code in question text
    questionLine = formatCodeInText(questionLine);
    
    const optionLines = lines.slice(1).filter(l => /^[A-Da-d][).:-]\s+/.test(l));
    const options = optionLines.map(l => {
      let option = l.replace(/^[A-Da-d][).:-]\s+/,'');
      // Format code in option text
      return formatCodeInText(option);
    });
    
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
