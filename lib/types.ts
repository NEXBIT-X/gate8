export interface Profile {
  id: string;
  full_name: string | null;
  role: 'student' | 'admin';
  created_at: string;
}

export interface Test {
  id: string;
  title: string;
  tags: string[];
  start_time: string;
  end_time: string;
  duration_minutes: number;
  created_by?: string;
  created_at: string;
  questions?: Question[];
}

export interface Question {
  id: number; // serial in your database
  test_id: string;
  question: string; // your schema uses 'question', not 'question_text'
  question_type: 'MCQ' | 'MSQ' | 'NAT';
  options?: string[]; // text[] in your database, null for NAT questions
  correct_answer: string; // text in your database
  marks: number; // numeric(4,2) in your database
  negative_marks: number; // numeric(4,2) in your database
  tag?: string;
  explanation?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  created_at: string;
}

export interface UserTestAttempt {
  id: string;
  user_id: string;
  test_id: string;
  started_at: string;
  submitted_at?: string;
  answers: Record<string, string>; // question_id -> user_answer
  total_marks: number;
  obtained_marks: number;
  is_completed: boolean;
  time_taken_seconds: number;
  created_at: string;
  // Additional columns from updated schema
  total_score?: number;
  percentage?: number;
}

export interface UserQuestionResponse {
  id: string;
  attempt_id: string;
  question_id: number;
  user_answer?: string;
  is_correct: boolean;
  marks_obtained: number;
  time_spent_seconds?: number;
  created_at: string;
}

export interface TestResult {
  attempt: UserTestAttempt;
  responses: UserQuestionResponse[];
  questions: Question[];
  statistics: {
    total_questions: number;
    correct_answers: number;
    incorrect_answers: number;
    unanswered: number;
    accuracy_percentage: number;
    score_percentage: number;
  };
}

export interface TestWithAttempt extends Test {
  attempt?: UserTestAttempt;
}

export interface TestWithQuestions extends Test {
  questionDetails: Question[];
}

export interface TestSession {
  test: TestWithQuestions;
  attempt: UserTestAttempt;
  currentQuestionIndex: number;
  timeRemaining: number;
}
