export interface LaTeXValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Lightweight LaTeX validation for server-side verification.
 * This is NOT a full TeX parser. It performs conservative checks to catch
 * common syntax problems and explicitly dangerous commands.
 */
export function validateLaTeX(input?: string | null): LaTeXValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!input || typeof input !== 'string' || input.trim() === '') {
    return { valid: true, errors, warnings };
  }

  const s = input;

  // Check balanced curly braces {}
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '{') depth++;
    if (ch === '}') depth--;
    if (depth < 0) {
      errors.push('Unmatched closing brace `}` detected');
      break;
    }
  }
  if (depth > 0) errors.push('Unmatched opening brace `{` detected');

  // Check $ delimiter balance (handle $$...$$ as display math)
  // We'll scan and count single-dollar occurrences outside of $$ blocks
  let i = 0;
  let singleDollarCount = 0;
  while (i < s.length) {
    if (s[i] === '$') {
      // check for $$
      if (s[i + 1] === '$') {
        // skip the $$...$$ block
        i += 2;
        const end = s.indexOf('$$', i);
        if (end === -1) {
          errors.push('Unterminated display math `$$ ... $$`');
          break;
        } else {
          i = end + 2;
          continue;
        }
      } else {
        singleDollarCount++;
      }
    }
    i++;
  }
  if (singleDollarCount % 2 !== 0) errors.push('Unmatched inline math delimiter `$`');

  // Forbidden/dangerous commands
  const forbidden = [
    'input', 'include', 'write', 'write18', 'immediate', 'open', 'read', 'usepackage', 'includegraphics', 'catcode', 'csname'
  ];
  const forbiddenRegex = new RegExp('\\\\\s*(' + forbidden.join('|') + ')\\b', 'i');
  if (forbiddenRegex.test(s)) {
    errors.push('Contains potentially unsafe LaTeX commands (e.g. \\input, \\include, \\write18, \\usepackage)');
  }

  // Disallow whole-document markers
  if (/\\begin\s*\{document\}/i.test(s) || /\\end\s*\{document\}/i.test(s)) {
    errors.push('Document-level LaTeX constructs (\\begin{document}) are not allowed');
  }

  // Length warnings
  if (s.length > 10000) warnings.push('LaTeX content is very long; consider shortening');

  return { valid: errors.length === 0, errors, warnings };
}
