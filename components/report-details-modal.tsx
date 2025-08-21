"use client";
import React from 'react';

interface ReportDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  reports: any[] | null;
}

const ReportDetailsModal: React.FC<ReportDetailsModalProps> = ({ isOpen, onClose, reports }) => {
  if (!isOpen || !reports || reports.length === 0) return null;

  const studentName = reports[0].full_name || reports[0].email;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="bg-gray-900 text-white p-4 rounded-t-lg flex justify-between items-center">
          <h2 className="text-lg font-bold">{studentName} — Attempts</h2>
          <button onClick={onClose} className="text-white hover:text-gray-200 text-2xl font-bold">×</button>
        </div>

        <div className="p-6 text-sm text-gray-800 dark:text-gray-100 space-y-4">
          <div className="text-xs text-gray-500">Showing {reports.length} attempt{reports.length > 1 ? 's' : ''}</div>

          {reports.map((report: any) => (
            <div key={report.attempt_id} className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-xs text-gray-400">Test</div>
                  <div className="font-medium">{report.test_title}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-400">Completed At</div>
                  <div className="font-medium">{new Date(report.completed_at).toLocaleString()}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-3">
                <div>
                  <div className="text-xs text-gray-400">Score</div>
                  <div className="font-medium">{parseFloat(String(report.total_score)).toFixed(2)} / {report.total_possible_marks}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">Percentage</div>
                  <div className="font-medium">{report.percentage.toFixed(2)}%</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">Attempted</div>
                  <div className="font-medium">{report.questions_attempted} / {report.total_questions}</div>
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

              <div>
                <h4 className="font-semibold">Per-question time (sec)</h4>
                {report.per_question_time_seconds && Object.keys(report.per_question_time_seconds).length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                    {Object.entries(report.per_question_time_seconds).map(([qid, secs]) => (
                      <div key={qid} className="p-2 bg-gray-100 dark:bg-gray-800 rounded">
                        <div className="text-xs text-gray-500">Question</div>
                        <div className="font-medium">{qid}</div>
                        <div className="text-xs text-gray-500">Time</div>
                        <div className="font-medium">{String(secs || 0)} sec</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-500">No per-question time data available.</div>
                )}
              </div>

              <div className="mt-3">
                <h4 className="font-semibold">Responses</h4>
                {report.responses && report.responses.length > 0 ? (
                  <div className="space-y-2 mt-2">
                    {report.responses.map((r: any) => (
                      <div key={r.id} className="p-2 bg-white dark:bg-gray-800 rounded">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <div className="text-xs text-gray-400">Question ID</div>
                            <div className="font-medium">{r.question_id}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-400">Type</div>
                            <div className="font-medium">{r.question_type || 'N/A'}</div>
                          </div>
                          <div className="col-span-2">
                            <div className="text-xs text-gray-400">Answer</div>
                            <div className="font-medium">{JSON.stringify(r.user_answer)}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-400">Marks</div>
                            <div className="font-medium">{r.marks_obtained}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-400">Correct</div>
                            <div className="font-medium">{r.is_correct ? 'Yes' : 'No'}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-400">Time (sec)</div>
                            <div className="font-medium">{r.time_spent_seconds}</div>
                          </div>
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
