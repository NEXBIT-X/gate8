import { createServiceRoleClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { stripDomain, getUserFullName, getUserRegNo } from '@/lib/utils';

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
      const csvContent = 'Student Name,Registration Number,Email,Test Title,Score,Total Marks,Percentage,Questions Attempted,Total Questions,Correct Answers,Incorrect Answers,Unanswered,Time Taken (min),Per-Question Time (sec),Completed At\n';
      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="student-reports-${testId || 'all'}-${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    }

    // Get user details for the attempts
    const { data: users, error: usersError } = await serviceSupabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000  // Increase limit to get more users
    });
    
    if (usersError) {
      console.error('Error fetching users:', usersError);
    }
    
    // Also get profiles data from the database (only full_name exists)
    const userIds = attempts.map(a => a.user_id);
    const { data: profiles, error: profilesError } = await serviceSupabase
      .from('profiles')
      .select('id, full_name')
      .in('id', userIds);
    
    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
    }
    
    // Create a map of profile data
    const profileMap = new Map();
    if (profiles) {
      profiles.forEach(profile => {
        profileMap.set(profile.id, profile);
      });
    }
    
    // Create a map of user data
    const userMap = new Map();
    if (users?.users) {
      users.users.forEach(u => {
        const profile = profileMap.get(u.id);

  const fullName = profile?.full_name || getUserFullName(u.user_metadata);
  const regNo = getUserRegNo(u.user_metadata);

        userMap.set(u.id, {
          id: u.id,
          email: u.email,
          full_name: fullName,
          reg_no: regNo
        });
      });
    }

    // Get questions for these tests so we include unanswered questions
    const testIds = [...new Set(attempts.map(a => a.test_id))];
    const { data: allQuestions, error: questionsError } = await serviceSupabase
      .from('questions')
      .select('*')
      .in('test_id', testIds);

    if (questionsError) {
      console.error('Error fetching questions for CSV export:', questionsError);
      return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 });
    }

    type QuestionType = { id: number; test_id: string; positive_marks?: number };
    const questionsByTest: Record<string, QuestionType[]> = {};
    (allQuestions || []).forEach((q: QuestionType) => {
      const key = String(q.test_id);
      if (!questionsByTest[key]) questionsByTest[key] = [];
      questionsByTest[key].push(q);
    });

    // Fetch all responses for these attempts so we can build transformed responses (include unanswered)
    const attemptIds = attempts.map(a => a.id);
    type ResponseRecord = { id: string; attempt_id: string; question_id: number; user_answer?: unknown; is_correct?: boolean; marks_obtained?: number; time_spent_seconds?: number; created_at?: string; updated_at?: string };
    const { data: responsesData, error: responsesError } = await serviceSupabase
      .from('user_question_responses')
      .select('*')
      .in('attempt_id', attemptIds);

    if (responsesError) {
      console.error('Error fetching responses for CSV export:', responsesError);
      return NextResponse.json({ error: 'Failed to fetch responses' }, { status: 500 });
    }

    const escapeCsvValue = (value: unknown): string => {
      const str = String(value ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvRows = ['Student Name,Registration Number,Email,Test Title,Score,Total Marks,Percentage,Questions Attempted,Total Questions,Correct Answers,Incorrect Answers,Unanswered,Time Taken (min),Per-Question Time (sec),Completed At'];

    for (const attempt of attempts) {
      try {
        const user = userMap.get(attempt.user_id);

        if (!user) {
          const profile = profileMap.get(attempt.user_id);
          const fallbackUser = {
            email: `deleted-user-${attempt.user_id.slice(0, 8)}@unknown.com`,
            full_name: profile?.full_name || `Deleted User ${attempt.user_id.slice(0, 8)}`,
            reg_no: 'N/A'
          };
          userMap.set(attempt.user_id, fallbackUser);
        }

        const finalUser = userMap.get(attempt.user_id) || {
          email: 'unknown@example.com',
          full_name: `User ${String(attempt.user_id).slice(0, 8)}`,
          reg_no: 'N/A'
        };

        // Build attempt responses including unanswered questions
  type RespType = ResponseRecord & { unanswered?: boolean };
  const attemptResponses: RespType[] = (responsesData || []).filter((r: ResponseRecord) => r.attempt_id === attempt.id) as RespType[];
  const responseMap = new Map<number, RespType>(attemptResponses.map((r: RespType) => [r.question_id, r]));
        const questions = (questionsByTest[String(attempt.test_id)] || []).sort((a, b) => (a.id - b.id));

        const transformedResponses = (questions.length ? questions : []).map((q: QuestionType) => {
          const resp = responseMap.get(q.id);
          if (resp) return { ...resp, question: q } as RespType & { question: QuestionType };
          return { id: `unanswered-${q.id}`, attempt_id: attempt.id, question_id: q.id, user_answer: null, is_correct: false, marks_obtained: 0, time_spent_seconds: 0, created_at: attempt.created_at, updated_at: attempt.created_at, question: q, unanswered: true } as RespType & { question: QuestionType };
        });

        const totalQuestions = transformedResponses.length;
        const answeredQuestions = transformedResponses.filter(r => !r.unanswered).length;
        const correctAnswers = transformedResponses.filter(r => !r.unanswered && r.is_correct).length;
        const incorrectAnswers = transformedResponses.filter(r => !r.unanswered && !r.is_correct).length;
        const unansweredQuestions = transformedResponses.filter(r => r.unanswered).length;

        const totalScore = transformedResponses.reduce((sum: number, response: RespType) => {
          if (response.unanswered) return sum;
          return sum + (response.marks_obtained || 0);
        }, 0) || 0;

        const totalPossibleMarks = attempt.total_marks || questions.reduce((s: number, q: QuestionType) => s + (q.positive_marks || 1), 0);
        const percentage = totalPossibleMarks > 0 ? (totalScore / totalPossibleMarks) * 100 : 0;

        const timeTakenMinutes = attempt.time_taken_seconds ? Math.round(attempt.time_taken_seconds / 60) : 0;

        const perQuestionTimeText = transformedResponses.map(r => `${r.question_id}:${r.time_spent_seconds || 0}`).join('; ');

        const displayName = finalUser.full_name || (finalUser.email ? stripDomain(finalUser.email) : 'Unknown User');
        const regNumber = finalUser.reg_no || 'N/A';

        const row = [
          escapeCsvValue(displayName),
          escapeCsvValue(regNumber),
          escapeCsvValue(finalUser.email || ''),
          escapeCsvValue(attempt.tests?.title || 'Unknown Test'),
          totalScore,
          totalPossibleMarks,
          percentage.toFixed(2),
          answeredQuestions,
          totalQuestions,
          correctAnswers,
          incorrectAnswers,
          unansweredQuestions,
          timeTakenMinutes,
          escapeCsvValue(perQuestionTimeText),
          escapeCsvValue(new Date(attempt.submitted_at || attempt.started_at).toLocaleString())
        ].join(',');

        csvRows.push(row);
      } catch (err) {
        console.error(`Error processing attempt ${attempt.id} for CSV:`, err);
      }
    }

    const csvContent = csvRows.join('\n');

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="student-reports-${testId || 'all'}-${new Date().toISOString().split('T')[0]}.csv"`
      }
    });

  } catch (error) {
    console.error('Error in GET /api/admin/reports/csv:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
