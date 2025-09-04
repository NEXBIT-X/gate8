/**
 * Utility functions for handling shuffled question answers
 */

import type { ShuffleConfig } from './shuffle';

export interface UserAnswer {
  question_id: number;
  answer: string | string[];
  time_spent?: number;
  is_marked?: boolean;
}

export interface UnshuffledAnswer {
  original_question_id: number;
  original_answer: string | string[];
  shuffled_question_id: number;
  shuffled_answer: string | string[];
}

/**
 * Convert shuffled answers back to original question/option mapping
 * This is needed for proper answer evaluation
 */
export function unshuffleAnswers(
  userAnswers: UserAnswer[],
  shuffleConfig: ShuffleConfig
): UnshuffledAnswer[] {
  return userAnswers.map(userAnswer => {
    const questionId = userAnswer.question_id;
    
    // The question ID from the frontend is actually the original question ID
    // because we return questions with their original IDs in shuffled order
    // So we just need to find the option shuffle config for this question
    const originalQuestionId = questionId;
    const optionShuffle = shuffleConfig.option_shuffles[originalQuestionId];
    
    if (!optionShuffle || Object.keys(optionShuffle).length === 0) {
      // No option shuffling for this question (likely NAT)
      return {
        original_question_id: originalQuestionId,
        original_answer: userAnswer.answer,
        shuffled_question_id: questionId,
        shuffled_answer: userAnswer.answer
      };
    }
    
    // Convert shuffled answers back to original options
    let originalAnswer: string | string[];
    
    if (Array.isArray(userAnswer.answer)) {
      // Multiple answers (MSQ)
      originalAnswer = userAnswer.answer.map(ans => {
        // Find the original option that maps to this shuffled answer
        const originalOption = Object.keys(optionShuffle).find(
          orig => optionShuffle[orig] === ans
        );
        return originalOption || ans;
      });
    } else {
      // Single answer (MCQ or NAT)
      const originalOption = Object.keys(optionShuffle).find(
        orig => optionShuffle[orig] === userAnswer.answer
      );
      originalAnswer = originalOption || userAnswer.answer;
    }
    
    return {
      original_question_id: originalQuestionId,
      original_answer: originalAnswer,
      shuffled_question_id: questionId,
      shuffled_answer: userAnswer.answer
    };
  });
}

/**
 * Evaluate shuffled answers against original questions
 */
export interface Question {
  id: number;
  correct_answer: string;
  marks: number;
  negative_marks: number;
  question_type: string;
}

export interface AnswerEvaluation {
  question_id: number;
  is_correct: boolean;
  marks_obtained: number;
  user_answer: string | string[];
  correct_answer: string;
}

export function evaluateShuffledAnswers(
  userAnswers: UserAnswer[],
  questions: Question[],
  shuffleConfig: ShuffleConfig
): AnswerEvaluation[] {
  const unshuffledAnswers = unshuffleAnswers(userAnswers, shuffleConfig);
  
  return unshuffledAnswers.map(unshuffled => {
    const question = questions.find(q => q.id === unshuffled.original_question_id);
    
    if (!question) {
      return {
        question_id: unshuffled.original_question_id,
        is_correct: false,
        marks_obtained: 0,
        user_answer: unshuffled.original_answer,
        correct_answer: 'Question not found'
      };
    }
    
    const isCorrect = evaluateAnswer(
      unshuffled.original_answer,
      question.correct_answer,
      question.question_type
    );
    
    let marksObtained = 0;
    if (isCorrect) {
      marksObtained = question.marks;
    } else {
      // For MSQ: no negative marking; incorrect or partial selection yields 0
      if (question.question_type === 'MSQ') {
        marksObtained = 0;
      } else if (unshuffled.original_answer !== null && unshuffled.original_answer !== '') {
        // Wrong answer penalty (only if answered)
        marksObtained = -question.negative_marks;
      }
    }
    // No penalty for unanswered questions (marksObtained remains 0)
    
    return {
      question_id: unshuffled.original_question_id,
      is_correct: isCorrect,
      marks_obtained: marksObtained,
      user_answer: unshuffled.original_answer,
      correct_answer: question.correct_answer
    };
  });
}

/**
 * Evaluate a single answer
 */
function evaluateAnswer(
  userAnswer: string | string[],
  correctAnswer: string,
  questionType: string
): boolean {
  if (!userAnswer || userAnswer === '') {
    return false;
  }
  
  if (questionType === 'MSQ') {
    // Multiple select question.
    // Support user answer as an array or comma-separated string. Normalize to lowercase trimmed tokens.
    let userAnswersArr: string[] = [];
    if (Array.isArray(userAnswer)) userAnswersArr = userAnswer as string[];
    else if (typeof userAnswer === 'string' && userAnswer.includes(',')) userAnswersArr = userAnswer.split(',');
    else userAnswersArr = [String(userAnswer)];

    const normalize = (s: string) => s.trim().toLowerCase();
    const normalizedUser = userAnswersArr.map(normalize).filter(Boolean);
    const normalizedCorrect = correctAnswer.split(',').map(normalize).filter(Boolean);

    // Exact set equality required (order-insensitive)
    if (normalizedUser.length !== normalizedCorrect.length) return false;
    const correctSet = new Set(normalizedCorrect);
    return normalizedUser.every(a => correctSet.has(a));
  } else {
    // MCQ or NAT
    const userAns = Array.isArray(userAnswer) ? userAnswer[0] : userAnswer;
    return userAns?.trim() === correctAnswer.trim();
  }
}
