/**
 * Enhanced AI features using Google Gemini API
 * Complements existing Groq integration with additional capabilities
 */

export interface QuestionQualityReport {
  score: number; // 0-100
  issues: string[];
  suggestions: string[];
  difficulty_assessment: 'easy' | 'medium' | 'hard';
  clarity_score: number;
  accuracy_score: number;
}

export interface QuestionEnhancement {
  original_question: string;
  improved_question: string;
  improvements_made: string[];
  explanation_enhanced: string;
  difficulty_adjusted?: 'easy' | 'medium' | 'hard';
}

export interface TranslationResult {
  original_language: string;
  target_language: string;
  translated_question: string;
  translated_options?: string[];
  translated_explanation: string;
  confidence_score: number;
}

/**
 * Analyze question quality using Gemini
 */
export async function analyzeQuestionQuality(
  questionText: string,
  questionType: 'MCQ' | 'MSQ' | 'NAT',
  options?: string[],
  correctAnswer?: string | string[],
  explanation?: string
): Promise<QuestionQualityReport> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const prompt = `You are an expert educational content reviewer. Analyze this exam question for quality, clarity, and educational value.

Question: ${questionText}
Type: ${questionType}
${options ? `Options: ${options.join(', ')}` : ''}
${correctAnswer ? `Correct Answer: ${Array.isArray(correctAnswer) ? correctAnswer.join(', ') : correctAnswer}` : ''}
${explanation ? `Explanation: ${explanation}` : ''}

Provide a detailed quality assessment in JSON format:
{
  "score": number (0-100),
  "issues": ["list of issues found"],
  "suggestions": ["list of improvement suggestions"],
  "difficulty_assessment": "easy|medium|hard",
  "clarity_score": number (0-100),
  "accuracy_score": number (0-100)
}

Criteria to evaluate:
- Clarity of question wording
- Appropriateness of difficulty level
- Quality of distractors (for MCQ/MSQ)
- Correctness of answer
- Educational value
- Grammar and language quality
- Potential ambiguity`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in response');
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Error analyzing question quality:', error);
    throw error;
  }
}

/**
 * Enhance/improve a question using Gemini
 */
export async function enhanceQuestion(
  questionText: string,
  questionType: 'MCQ' | 'MSQ' | 'NAT',
  subject: string,
  options?: string[],
  explanation?: string,
  targetDifficulty?: 'easy' | 'medium' | 'hard'
): Promise<QuestionEnhancement> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const prompt = `You are an expert question writer and educational content developer. Improve this exam question while maintaining its core concept and learning objective.

Original Question: ${questionText}
Type: ${questionType}
Subject: ${subject}
${options ? `Options: ${options.join(', ')}` : ''}
${explanation ? `Current Explanation: ${explanation}` : ''}
${targetDifficulty ? `Target Difficulty: ${targetDifficulty}` : ''}

Improve the question by:
- Enhancing clarity and precision
- Improving language and grammar
- Making distractors more effective (for MCQ/MSQ)
- Ensuring appropriate difficulty level
- Providing comprehensive explanation
- Maintaining educational value

Return response in JSON format:
{
  "original_question": "original text",
  "improved_question": "enhanced question text",
  "improvements_made": ["list of specific improvements"],
  "explanation_enhanced": "comprehensive explanation",
  "difficulty_adjusted": "easy|medium|hard"
}`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in response');
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Error enhancing question:', error);
    throw error;
  }
}

/**
 * Generate detailed explanation for a question using Gemini
 */
export async function generateExplanation(
  questionText: string,
  questionType: 'MCQ' | 'MSQ' | 'NAT',
  correctAnswer: string | string[],
  subject: string,
  options?: string[]
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const prompt = `You are an expert educator. Provide a comprehensive, educational explanation for this exam question.

Question: ${questionText}
Type: ${questionType}
Subject: ${subject}
${options ? `Options: ${options.join(', ')}` : ''}
Correct Answer: ${Array.isArray(correctAnswer) ? correctAnswer.join(', ') : correctAnswer}

Provide a detailed explanation that:
- Explains why the correct answer is right
- For MCQ/MSQ: Explains why other options are incorrect
- Includes relevant concepts and principles
- Uses clear, educational language
- Helps students understand the underlying concept
- Provides additional learning context if helpful

Return only the explanation text, no JSON formatting.`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No explanation generated';
  } catch (error) {
    console.error('Error generating explanation:', error);
    throw error;
  }
}

/**
 * Translate question to target language using Gemini
 */
export async function translateQuestion(
  questionText: string,
  options: string[] | undefined,
  explanation: string | undefined,
  targetLanguage: string = 'Hindi'
): Promise<TranslationResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const prompt = `You are an expert translator specializing in educational content. Translate this exam question to ${targetLanguage} while maintaining technical accuracy and clarity.

Question: ${questionText}
${options ? `Options: ${options.join(', ')}` : ''}
${explanation ? `Explanation: ${explanation}` : ''}

Requirements:
- Maintain technical terms accuracy
- Keep educational context intact
- Ensure cultural appropriateness
- Preserve question structure and format

Return response in JSON format:
{
  "original_language": "detected language",
  "target_language": "${targetLanguage}",
  "translated_question": "translated question text",
  ${options ? '"translated_options": ["translated options"],' : ''}
  "translated_explanation": "translated explanation",
  "confidence_score": number (0-100)
}`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in response');
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Error translating question:', error);
    throw error;
  }
}

/**
 * Auto-assess question difficulty using Gemini
 */
export async function assessQuestionDifficulty(
  questionText: string,
  subject: string,
  questionType: 'MCQ' | 'MSQ' | 'NAT'
): Promise<{ difficulty: 'easy' | 'medium' | 'hard'; reasoning: string; confidence: number }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const prompt = `You are an expert educational assessor. Analyze this exam question and determine its difficulty level based on:
- Cognitive complexity required
- Prerequisite knowledge needed
- Problem-solving steps involved
- Time typically required to solve
- Common student understanding level

Question: ${questionText}
Subject: ${subject}
Type: ${questionType}

Provide assessment in JSON format:
{
  "difficulty": "easy|medium|hard",
  "reasoning": "detailed explanation of difficulty assessment",
  "confidence": number (0-100)
}`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in response');
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Error assessing question difficulty:', error);
    throw error;
  }
}
