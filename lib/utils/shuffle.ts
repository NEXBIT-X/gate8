/**
 * Utility functions for shuffling questions and options
 */

// Fisher-Yates shuffle algorithm for arrays
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Generate a seeded random number generator for consistent shuffling per user
export function createSeededRandom(seed: string): () => number {
  let hash = 0;
  
  // Better hash function for more uniform distribution
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Ensure we have a positive seed
  if (hash < 0) hash = -hash;
  if (hash === 0) hash = 1;
  
  return function() {
    // Linear congruential generator with better constants
    hash = (hash * 1664525 + 1013904223) % 4294967296;
    return hash / 4294967296;
  };
}

// Seeded shuffle using a specific random function
export function shuffleArraySeeded<T>(array: T[], randomFn: () => number): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(randomFn() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export interface Question {
  id: number;
  test_id: string;
  question: string;
  question_type: string;
  options: string[];
  correct_answer: string;
  marks: number;
  negative_marks: number;
  created_at: string;
}

export interface ShuffledQuestion extends Omit<Question, 'options' | 'correct_answer'> {
  options: string[];
  correct_answer: string;
  original_question_id: number;
  shuffle_map: Record<string, string>; // Maps original option to shuffled option
}

/**
 * Shuffle questions and their options for a specific user
 * Uses user ID + test ID as seed to ensure consistent shuffling per user per test
 */
export function shuffleQuestionsForUser(
  questions: Question[], 
  userId: string, 
  testId: string
): ShuffledQuestion[] {
  // Create a base seed combining user ID and test ID for deterministic but unique shuffling
  const baseSeed = `${userId}-${testId}`;
  const questionOrderRandom = createSeededRandom(baseSeed);
  
  // First, shuffle the order of questions
  const shuffledQuestions = shuffleArraySeeded(questions, questionOrderRandom);
  
  // Then, shuffle options within each question (for MCQ/MSQ only)
  return shuffledQuestions.map((question, questionIndex) => {
    if (question.question_type === 'NAT' || !question.options || question.options.length === 0) {
      // For NAT questions or questions without options, no shuffling needed
      return {
        ...question,
        original_question_id: question.id,
        shuffle_map: {}
      };
    }
    
    // Create a unique seed for each question including position to ensure uniqueness
    const questionSeed = `${userId}-q${question.id}-t${testId}-pos${questionIndex}-opt`;
    const questionRandom = createSeededRandom(questionSeed);
    
    // Get the correct answer before shuffling
    const originalCorrectAnswer = question.correct_answer;
    
    // Create option mapping for shuffling
    const optionsWithLabels = question.options.map((option, index) => ({
      label: String.fromCharCode(65 + index), // A, B, C, D...
      text: option,
      isCorrect: option === originalCorrectAnswer || 
                originalCorrectAnswer.split(',').map(a => a.trim()).includes(option)
    }));
    
    // Shuffle the options with the unique random function
    const shuffledOptions = shuffleArraySeeded(optionsWithLabels, questionRandom);
    
    // Create shuffle map and find new correct answer
    const shuffleMap: Record<string, string> = {};
    let newCorrectAnswer = '';
    const newCorrectAnswers: string[] = [];
    
    shuffledOptions.forEach((option, newIndex) => {
      const newLabel = String.fromCharCode(65 + newIndex);
      const originalLabel = option.label;
      
      shuffleMap[originalLabel] = newLabel;
      
      if (option.isCorrect) {
        newCorrectAnswers.push(option.text);
      }
    });
    
    // Handle multiple correct answers (for MSQ)
    if (originalCorrectAnswer.includes(',')) {
      newCorrectAnswer = newCorrectAnswers.join(', ');
    } else {
      newCorrectAnswer = newCorrectAnswers[0] || originalCorrectAnswer;
    }
    
    return {
      ...question,
      options: shuffledOptions.map(opt => opt.text),
      correct_answer: newCorrectAnswer,
      original_question_id: question.id,
      shuffle_map: shuffleMap
    };
  });
}

/**
 * Store the shuffle configuration for a test attempt
 * This allows us to properly evaluate answers later
 */
export interface ShuffleConfig {
  question_order: number[]; // Original question IDs in shuffled order
  option_shuffles: Record<number, Record<string, string>>; // question_id -> option shuffle map
}

export function generateShuffleConfig(shuffledQuestions: ShuffledQuestion[]): ShuffleConfig {
  return {
    question_order: shuffledQuestions.map(q => q.original_question_id),
    option_shuffles: shuffledQuestions.reduce((acc, q) => {
      acc[q.original_question_id] = q.shuffle_map;
      return acc;
    }, {} as Record<number, Record<string, string>>)
  };
}

/**
 * Verify that each question has unique shuffling patterns
 */
export function verifyShuffleUniqueness(shuffledQuestions: ShuffledQuestion[]): boolean {
  const shufflePatterns = new Set<string>();
  
  for (const question of shuffledQuestions) {
    if (question.question_type === 'NAT') continue; // NAT questions don't have options to shuffle
    
    // Create a pattern string representing the shuffle
    const patternString = question.options.join('|') + '-' + Object.values(question.shuffle_map).join('');
    
    if (shufflePatterns.has(patternString)) {
      console.warn(`Duplicate shuffle pattern detected for question ${question.id}`);
      return false;
    }
    
    shufflePatterns.add(patternString);
  }
  
  return true;
}
