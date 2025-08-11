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
  marks: number;
  negative_marks: number;
  tag?: string;
  explanation?: string;
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
  negative_marks: number;
  final_score: number;
  is_completed: boolean;
  time_taken_seconds: number;
  created_at: string;
}

export interface UserQuestionResponse {
  id: string;
  attempt_id: string;
  question_id: number;
  user_answer?: string;
  is_correct: boolean;
  marks_obtained: number;
  time_spent_seconds: number;
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

export interface TestWithQuestions extends Test {
  questionDetails: Question[];
}

export interface TestSession {
  test: TestWithQuestions;
  attempt: UserTestAttempt;
  currentQuestionIndex: number;
  timeRemaining: number;
}
