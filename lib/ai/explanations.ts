/**
 * AI service to generate explanations for questions using Groq API
 */

import Groq from 'groq-sdk';

export interface QuestionExplanationRequest {
  question: string;
  options?: string[];
  correct_answer: string;
  user_answer: string | null;
  is_correct: boolean;
  question_type?: string;
}

export interface ExplanationResult {
  explanation: string;
  success: boolean;
  error?: string;
}

const EXPLANATION_PROMPT = `You are an expert educator who provides brief, clear explanations for exam questions.

Given a question, the correct answer, and the user's answer, provide a concise explanation that:
1. Briefly explains why the correct answer is right
2. If wrong, quickly explain the mistake
3. Keep it short and direct

Format your response in 1-2 short sentences maximum. Be concise and use simple language.`;

/**
 * Generate an AI explanation for a question result
 */
export async function generateQuestionExplanation(request: QuestionExplanationRequest): Promise<ExplanationResult> {
  const apiKey = process.env.GROQ_API_KEY || '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';
  
  if (!apiKey) {
    return {
      explanation: "AI explanations are currently unavailable. Please refer to the provided explanation or consult your instructor.",
      success: false,
      error: "GROQ_API_KEY not configured"
    };
  }

  try {
    const groq = new Groq({ apiKey });
    
    const optionsText = request.options ? 
      `\nOptions:\n${request.options.map((opt, i) => `${String.fromCharCode(65 + i)}. ${opt}`).join('\n')}` : '';
    
    const userAnswerText = request.user_answer ? 
      `User's answer: ${request.user_answer}` : 'User did not answer this question';
    
    const prompt = `${EXPLANATION_PROMPT}

Question: ${request.question}${optionsText}

Correct answer: ${request.correct_answer}
${userAnswerText}
Result: ${request.is_correct ? 'Correct' : 'Incorrect'}

Provide a brief explanation (1-2 sentences max):`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      model: 'llama-3.1-8b-instant',
      temperature: 0.5,
      max_tokens: 150,
      top_p: 0.8
    });

    const explanation = chatCompletion.choices[0]?.message?.content;
    
    if (!explanation) {
      throw new Error('No explanation generated');
    }

    return {
      explanation: explanation.trim(),
      success: true
    };

  } catch (error) {
    console.error('Error generating explanation:', error);
    
    // Fallback explanation based on correctness (shorter version)
    const fallbackExplanation = request.is_correct 
      ? `Correct! "${request.correct_answer}" is the right answer.`
      : `Correct answer: "${request.correct_answer}". ${request.user_answer ? `Your answer "${request.user_answer}" was incorrect.` : 'This question was not answered.'}`;

    return {
      explanation: fallbackExplanation,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Generate explanations for multiple questions in batch
 */
export async function generateBatchExplanations(requests: QuestionExplanationRequest[]): Promise<ExplanationResult[]> {
  // Process explanations with a small delay to avoid rate limiting
  const results: ExplanationResult[] = [];
  
  for (let i = 0; i < requests.length; i++) {
    const result = await generateQuestionExplanation(requests[i]);
    results.push(result);
    
    // Add small delay between requests to avoid rate limiting
    if (i < requests.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return results;
}
