import { createServiceRoleClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { stripDomain } from '@/lib/utils';

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
      const csvContent = 'Student Name,Email,Test Title,Score,Total Marks,Percentage,Questions Attempted,Total Questions,Correct Answers,Incorrect Answers,Unanswered,Time Taken (min),Per-Question Time (sec),Completed At\n';
      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="student-reports-${testId || 'all'}-${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    }

    // Get user details for the attempts
    const { data: users, error: usersError } = await serviceSupabase.auth.admin.listUsers();
    
    // Create a map of user data
    const userMap = new Map();
    if (users?.users) {
      users.users.forEach(user => {
        userMap.set(user.id, {
          id: user.id,
          email: user.email,
          // Prefer display_name (reg no) first
          full_name: user.user_metadata?.display_name || user.user_metadata?.full_name || user.user_metadata?.name
        });
      });
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

    // Process the data
  const csvRows = ['Student Name,Email,Test Title,Score,Total Marks,Percentage,Questions Attempted,Total Questions,Correct Answers,Incorrect Answers,Unanswered,Time Taken (min),Per-Question Time (sec),Completed At'];

    attempts.forEach(attempt => {
      const user = userMap.get(attempt.user_id) || { 
        email: '', 
        full_name: '' 
      };
      
      const attemptResponses = responses?.filter(r => r.attempt_id === attempt.id) || [];
      
      // Calculate stats
      const totalQuestions = attemptResponses.length || 0;
      const questionsAttempted = attemptResponses.filter(r => r.user_answer !== null).length;
      const correctAnswers = attemptResponses.filter(r => r.is_correct).length;
      const incorrectAnswers = questionsAttempted - correctAnswers;
      const unansweredQuestions = totalQuestions - questionsAttempted;
      
      const totalScore = attemptResponses.reduce((sum, r) => sum + (r.marks_obtained || 0), 0);
      const totalPossibleMarks = attempt.total_marks || (attemptResponses.length * 1); // Default 1 mark per question
      
      const percentage = totalPossibleMarks > 0 ? (totalScore / totalPossibleMarks) * 100 : 0;
      
      // Calculate time taken
      const startTime = new Date(attempt.started_at);
      const endTime = new Date(attempt.submitted_at || attempt.started_at);
      const timeTakenMinutes = attempt.time_taken_seconds ? Math.round(attempt.time_taken_seconds / 60) : 
        Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
      
      // Calculate subject-wise scores (simplified without subject column)
      const subjectScores: Record<string, any> = {
        'General': { score: totalScore, total: totalPossibleMarks }
      };

      const subjectScoresText = Object.entries(subjectScores)
        .map(([subject, scores]) => `${subject}: ${scores.score}/${scores.total}`)
        .join('; ');

      // Build per-question time string (questionId:seconds; ...)
      const perQuestionTimeText = attemptResponses.map(r => `${r.question_id}:${r.time_spent_seconds || 0}`).join('; ');

      // Escape CSV values
      const escapeCsvValue = (value: any): string => {
        const str = String(value || '');
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const row = [
        escapeCsvValue(user.full_name || stripDomain(user.email) || ''),
        escapeCsvValue(user.email || ''),
        escapeCsvValue(attempt.tests?.title || 'Unknown Test'),
        totalScore,
        totalPossibleMarks,
        percentage.toFixed(2),
        questionsAttempted,
        totalQuestions,
        correctAnswers,
        incorrectAnswers,
        unansweredQuestions,
        timeTakenMinutes,
        escapeCsvValue(perQuestionTimeText),
        new Date(attempt.submitted_at || attempt.started_at).toLocaleString()
      ].join(',');

      csvRows.push(row);
    });

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
