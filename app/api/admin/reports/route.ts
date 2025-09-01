import { createServiceRoleClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { stripDomain, getUserFullName, getUserRegNo } from '@/lib/utils';

// Local lightweight types for internal processing
type QuestionRecord = { id: number; test_id: string; positive_marks?: number };
type ResponseRecord = { id: string; attempt_id: string; question_id: number; user_answer?: unknown; is_correct?: boolean; marks_obtained?: number; time_spent_seconds?: number; created_at?: string; updated_at?: string };

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication and admin status
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const adminEmails = [
      'abhijeethvn2006@gmail.com',
      'pavan03062006@gmail.com',
      'devash217@gmail.com',
      'b.lakshminarayanan2007@gmail.com'
    ];

    if (!adminEmails.includes(user.email || '')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const testId = searchParams.get('testId');

    const serviceSupabase = createServiceRoleClient();

    // Build the query for test attempts with user and test details
    let query = serviceSupabase
      .from('user_test_attempts')
      .select(`
        *,
        tests!inner (
          id,
          title,
          duration_minutes
        )
      `)
      .eq('is_completed', true)
      .order('created_at', { ascending: false });

    // Filter by test if specified
    if (testId && testId !== 'all') {
      query = query.eq('test_id', testId);
    }

    const { data: attempts, error: attemptsError } = await query;

    if (attemptsError) {
      console.error('Error fetching attempts:', attemptsError);
      return NextResponse.json({ error: 'Failed to fetch attempts' }, { status: 500 });
    }

    if (!attempts || attempts.length === 0) {
      return NextResponse.json({
        totalStudents: 0,
        totalAttempts: 0,
        averageScore: 0,
        averagePercentage: 0,
        averageQuestionsAttempted: 0,
        averageTimeSpent: 0,
        subjectAnalytics: {},
        reports: []
      });
    }

    // Get user details for the attempts
    const userIds = [...new Set(attempts.map(a => a.user_id))];
    let userMap = new Map<string, { id: string; email: string | null; full_name: string; reg_no: string; display_name: string }>();
    
    if (userIds.length > 0) {
      const { data: usersPage, error: usersError } = await serviceSupabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (!usersPage || usersError) {
        userMap = new Map();
      } else {
        usersPage.users
          .filter(u => userIds.includes(u.id))
          .forEach((u) => {
            const email = u.email as string | null;
            const fullName = getUserFullName(u.user_metadata);
            const regNo = getUserRegNo(u.user_metadata);
            const display = fullName || regNo || 
              (email ? stripDomain(email) : '');
              
            userMap.set(u.id, {
              id: u.id,
              email,
              full_name: fullName,
              reg_no: regNo,
              display_name: display
            });
          });
      }
    }

    // Get all responses for these attempts to calculate detailed stats
    const attemptIds = attempts.map(a => a.id);
    const { data: responses, error: responsesError } = await serviceSupabase
      .from('user_question_responses')
      .select(`
        *,
        questions:question_id (
          id,
          question_type
        )
      `)
      .in('attempt_id', attemptIds);

    if (responsesError) {
      console.error('Error fetching responses:', responsesError);
      return NextResponse.json({ error: 'Failed to fetch responses' }, { status: 500 });
    }
    // Fetch all questions for the tests involved so we can include unanswered questions
    const testIds = [...new Set(attempts.map(a => a.test_id))];
    const { data: allQuestions, error: questionsError } = await serviceSupabase
      .from('questions')
      .select('*')
      .in('test_id', testIds);

    if (questionsError) {
      console.error('Error fetching questions for reports:', questionsError);
      return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 });
    }

  const questionsByTest: Record<string, QuestionRecord[]> = {};
    (allQuestions || []).forEach(q => {
      const key = String(q.test_id);
      if (!questionsByTest[key]) questionsByTest[key] = [];
      questionsByTest[key].push(q);
    });

    // Process the data to generate analytics per attempt using the same logic as result API
    const reports = attempts.map(attempt => {
      const user = userMap.get(attempt.user_id) || {
        email: '',
        full_name: '',
        reg_no: '',
        display_name: ''
      };

      const attemptResponses = (responses || []).filter(r => r.attempt_id === attempt.id) || [];

      // Build a map of responses by question_id
      const responseMap = new Map(attemptResponses.map(r => [r.question_id, r]));

      // Get all questions for this attempt's test (ensure ordered)
      const questions = (questionsByTest[String(attempt.test_id)] || []).sort((a, b) => (a.id - b.id));

      // Build transformed responses including unanswered questions
      const transformedResponses = (questions.length ? questions : []).map(q => {
        const resp = responseMap.get(q.id);
        if (resp) {
          return {
            ...resp,
            question: q
          };
        }

        return {
          id: `unanswered-${q.id}`,
          attempt_id: attempt.id,
          question_id: q.id,
          user_answer: null,
          is_correct: false,
          marks_obtained: 0,
          time_spent_seconds: 0,
          created_at: attempt.created_at,
          updated_at: attempt.created_at,
          question: q,
          unanswered: true
        };
      });

      const totalQuestions = transformedResponses.length;
      const answeredQuestions = transformedResponses.filter(r => !r.unanswered).length;
      const correctAnswers = transformedResponses.filter(r => !r.unanswered && r.is_correct).length;
      const incorrectAnswers = transformedResponses.filter(r => !r.unanswered && !r.is_correct).length;
      const unansweredQuestions = transformedResponses.filter(r => r.unanswered).length;

      const totalScore = transformedResponses.reduce((sum: number, response: (ResponseRecord & { unanswered?: boolean })) => {
        if (response.unanswered) return sum;
        return sum + (response.marks_obtained || 0);
      }, 0) || 0;

      const totalPossibleMarks = attempt.total_marks || questions.reduce((s, q) => s + (q.positive_marks || 1), 0);
      const percentage = attempt.percentage || (totalPossibleMarks > 0 ? (totalScore / totalPossibleMarks) * 100 : 0);

      const timeTakenMinutes = attempt.time_taken_seconds ? Math.round(attempt.time_taken_seconds / 60) :
        (attempt.submitted_at && attempt.started_at ? Math.round((new Date(attempt.submitted_at).getTime() - new Date(attempt.started_at).getTime()) / (1000 * 60)) : 0);

  const subjectScores: Record<string, { score: number; total: number; attempted: number; correct: number }> = {
        'General': {
          score: totalScore,
          total: totalPossibleMarks,
          attempted: answeredQuestions,
          correct: correctAnswers
        }
      };

      return {
        id: attempt.user_id,
        email: user.email || '',
        full_name: user.full_name || (user.email ? stripDomain(user.email) : ''),
        test_title: attempt.tests?.title || 'Unknown Test',
        test_id: attempt.test_id,
        attempt_id: attempt.id,
        total_score: totalScore,
        total_possible_marks: totalPossibleMarks,
        percentage,
        questions_attempted: answeredQuestions,
        total_questions: totalQuestions,
        correct_answers: correctAnswers,
        incorrect_answers: incorrectAnswers,
        unanswered_questions: unansweredQuestions,
        time_taken_minutes: timeTakenMinutes,
        per_question_time_seconds: transformedResponses.reduce((acc: Record<string, number>, r: (ResponseRecord & { question_id: number })) => {
          acc[String(r.question_id)] = r.time_spent_seconds || 0; return acc;
        }, {} as Record<string, number>),
        total_positive_marks: attempt.total_score || 0,
        total_negative_marks: 0,
        final_score: attempt.total_score || totalScore,
        responses: transformedResponses,
        completed_at: attempt.submitted_at || attempt.started_at,
        subject_scores: subjectScores
      };
    });

    // Calculate overall analytics
    const totalStudents = new Set(reports.map(r => r.id)).size;
    const totalAttempts = reports.length;
    const averageScore = reports.reduce((sum, r) => sum + r.total_score, 0) / totalAttempts;
    const averagePercentage = reports.reduce((sum, r) => sum + r.percentage, 0) / totalAttempts;
    const averageQuestionsAttempted = reports.reduce((sum, r) => sum + r.questions_attempted, 0) / totalAttempts;
    const averageTimeSpent = reports.reduce((sum, r) => sum + r.time_taken_minutes, 0) / totalAttempts;

    // Calculate subject-wise analytics (simplified)
    const subjectAnalytics: Record<string, {
      totalScore: number;
      totalPossible: number;
      totalAttempts: number;
    }> = {
      'General': {
        totalScore: reports.reduce((sum, r) => sum + r.total_score, 0),
        totalPossible: reports.reduce((sum, r) => sum + r.total_possible_marks, 0),
        totalAttempts: reports.length
      }
    };

    // Convert to final format
    const finalSubjectAnalytics: Record<string, {
      averageScore: number;
      averagePercentage: number;
      totalAttempts: number;
    }> = {};
    Object.entries(subjectAnalytics).forEach(([subject, stats]) => {
      finalSubjectAnalytics[subject] = {
        averageScore: stats.totalScore / Math.max(stats.totalAttempts, 1),
        averagePercentage: stats.totalPossible > 0 ? (stats.totalScore / stats.totalPossible) * 100 : 0,
        totalAttempts: stats.totalAttempts
      };
    });

    return NextResponse.json({
      totalStudents,
      totalAttempts,
      averageScore,
      averagePercentage,
      averageQuestionsAttempted,
      averageTimeSpent,
      subjectAnalytics: finalSubjectAnalytics,
      reports
    });

  } catch (error) {
    console.error('Error in GET /api/admin/reports:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}