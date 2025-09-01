"use client";
import React from 'react';
import { stripDomain } from '@/lib/utils';

interface ReportDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  reports: ReportType[] | null;
}

type ResponseType = {
  id: string;
  question_id: number;
  user_answer?: unknown;
  is_correct?: boolean;
  marks_obtained?: number;
  time_spent_seconds?: number;
  question?: { question?: string; question_text?: string; question_type?: string; correct_answers?: string[]; numerical_answer_range?: { min?: number; max?: number } | { exact?: number } };
  unanswered?: boolean;
};

type ReportType = {
  attempt_id: string;
  user_id?: string;
  test_title?: string;
  completed_at?: string;
  total_score?: number;
  total_possible_marks?: number;
  percentage?: number;
  questions_attempted?: number;
  total_questions?: number;
  correct_answers?: number;
  incorrect_answers?: number;
  time_taken_minutes?: number;
  total_positive_marks?: number;
  total_negative_marks?: number;
  responses?: ResponseType[];
  email?: string;
  full_name?: string;
};

const ReportDetailsModal: React.FC<ReportDetailsModalProps> = ({ isOpen, onClose, reports }) => {
  if (!isOpen || !reports || reports.length === 0) return null;

  const studentName = reports[0].full_name || stripDomain(reports[0].email);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="bg-gray-900 text-white p-4 rounded-t-lg flex justify-between items-center">
          <h2 className="text-lg font-bold">{studentName} — Attempts</h2>
          <button onClick={onClose} className="text-white hover:text-gray-200 text-2xl font-bold">×</button>
        </div>

        <div className="p-6 text-sm text-gray-800 dark:text-gray-100 space-y-4">
          <div className="text-xs text-gray-500">Showing {reports.length} attempt{reports.length > 1 ? 's' : ''}</div>

          {reports.map((report: ReportType) => (
            <div key={report.attempt_id} className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-xs text-gray-400">Test</div>
                  <div className="font-medium">{report.test_title}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-400">Completed At</div>
                  <div className="font-medium">{report.completed_at ? new Date(report.completed_at).toLocaleString() : 'N/A'}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-3">
                <div>
                  <div className="text-xs text-gray-400">Score</div>
                  <div className="font-medium">{parseFloat(String(report.total_score)).toFixed(2)} / {report.total_possible_marks}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">Percentage</div>
                  <div className="font-medium">{(report.percentage ?? 0).toFixed(2)}%</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">Time Taken</div>
                  <div className="font-medium">{report.time_taken_minutes} min</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">Positive Marks</div>
                  <div className="font-medium">{report.total_positive_marks ?? 0}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">Negative Marks</div>
                  <div className="font-medium">{report.total_negative_marks ?? 0}</div>
                </div>
              </div>

              <div className="mt-3">
                <h4 className="font-semibold">Responses</h4>
                {report.responses && report.responses.length > 0 ? (
                  <div className="space-y-4 mt-2">
                    {report.responses.map((r: ResponseType) => (
                      <div key={r.id} className="p-3 bg-white dark:bg-gray-800 rounded">
                        <div className="mb-2 text-sm text-gray-500">Question ID: <span className="font-medium text-gray-800 dark:text-gray-100">{r.question_id}</span></div>

                        <div className="mb-2 text-xs text-gray-400">Question Text</div>
                        <div className="mb-2 font-medium">{r.question?.question || r.question?.question_text || 'Question text not available'}</div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                          <div>
                            <div className="text-xs text-gray-400">Your Answer</div>
                            <div className="font-medium">{Array.isArray(r.user_answer) ? (r.user_answer as string[]).join(', ') : (r.user_answer ?? 'Not answered') as React.ReactNode}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-400">Correct Answer</div>
                            <div className="font-medium">{r.question?.correct_answers ? (Array.isArray(r.question.correct_answers) ? r.question.correct_answers.join(', ') : String(r.question.correct_answers)) : (r.question?.numerical_answer_range ? ( 'see range' ) : 'N/A')}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-400">Marks Obtained</div>
                            <div className="font-medium">{r.marks_obtained ?? 0}</div>
                          </div>
                        </div>

                        {r.question?.question_type === 'NAT' && r.question?.numerical_answer_range && (
                          <div className="mt-2 text-sm text-gray-600">
                            <strong>Correct Range:</strong> {('exact' in r.question.numerical_answer_range && typeof r.question.numerical_answer_range.exact === 'number')
                              ? r.question.numerical_answer_range.exact
                              : (('min' in r.question.numerical_answer_range || 'max' in r.question.numerical_answer_range)
                                  ? `${(r.question.numerical_answer_range as { min?: number }).min ?? 'N/A'} - ${(r.question.numerical_answer_range as { max?: number }).max ?? 'N/A'}`
                                  : 'N/A')}
                          </div>
                        )}

                        <div className="mt-2 text-sm">
                          <span className={`font-medium ${r.is_correct ? 'text-green-600' : 'text-red-600'}`}>{r.is_correct ? 'Correct' : (r.unanswered ? 'Unanswered' : 'Incorrect')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-500">No detailed responses available.</div>
                )}
              </div>
            </div>
          ))}

        </div>

        <div className="border-t p-4 flex justify-end bg-gray-50 dark:bg-gray-700 rounded-b-lg">
          <button onClick={onClose} className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">Close</button>
        </div>
      </div>
    </div>
  );
};

export default ReportDetailsModal;
