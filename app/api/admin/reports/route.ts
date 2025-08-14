import { createServiceRoleClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  console.log('Reports API called');
  try {
    const supabase = await createClient();
    
    // Check authentication and admin status
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    console.log('User check:', { user: user?.email, error: userError?.message });
    
    if (userError || !user) {
      console.log('Authentication failed');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const adminEmails = [
      'abhijeethvn2006@gmail.com',
      'pavan03062006@gmail.com',
      'devash217@gmail.com',
      'b.lakshminarayanan2007@gmail.com'
    ];

    console.log('Admin check:', { userEmail: user.email, isAdmin: adminEmails.includes(user.email || '') });

    if (!adminEmails.includes(user.email || '')) {
      console.log('Admin access denied');
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const testId = searchParams.get('testId');

    console.log('Query params:', { testId });

    const serviceSupabase = createServiceRoleClient();
    console.log('Service client created');

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

    console.log('Attempts query result:', { 
      attemptsCount: attempts?.length, 
      error: attemptsError?.message,
      firstAttempt: attempts?.[0] 
    });

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
    const { data: users, error: usersError } = await serviceSupabase.auth.admin.listUsers();
    
    console.log('Users query result:', { 
      usersCount: users?.users?.length, 
      error: usersError?.message 
    });

    // Create a map of user data
    const userMap = new Map();
    if (users?.users) {
      users.users.forEach(user => {
        userMap.set(user.id, {
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.user_metadata?.name
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

    console.log('Responses query result:', { 
      responsesCount: responses?.length, 
      error: responsesError?.message,
      firstResponse: responses?.[0] 
    });

    if (responsesError) {
      console.error('Error fetching responses:', responsesError);
      return NextResponse.json({ error: 'Failed to fetch responses' }, { status: 500 });
    }

    // Process the data to generate analytics
    const reports = attempts.map(attempt => {
      const user = userMap.get(attempt.user_id) || { 
        email: 'Unknown', 
        full_name: null 
      };
      
      const attemptResponses = responses?.filter(r => r.attempt_id === attempt.id) || [];
      
      // Get all questions for this test to calculate total questions
      const totalQuestions = attemptResponses.length || 0;
      const questionsAttempted = attemptResponses.filter(r => r.user_answer !== null).length;
      const correctAnswers = attemptResponses.filter(r => r.is_correct).length;
      const incorrectAnswers = questionsAttempted - correctAnswers;
      const unansweredQuestions = totalQuestions - questionsAttempted;
      
      // Calculate total score and possible marks
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
        'General': {
          score: totalScore,
          total: totalPossibleMarks,
          attempted: questionsAttempted,
          correct: correctAnswers
        }
      };

      return {
        id: attempt.user_id,
        email: user.email || 'Unknown',
        full_name: user.full_name,
        test_title: attempt.tests?.title || 'Unknown Test',
        test_id: attempt.test_id,
        attempt_id: attempt.id,
        total_score: totalScore,
        total_possible_marks: totalPossibleMarks,
        percentage,
        questions_attempted: questionsAttempted,
        total_questions: totalQuestions,
        correct_answers: correctAnswers,
        incorrect_answers: incorrectAnswers,
        unanswered_questions: unansweredQuestions,
        time_taken_minutes: timeTakenMinutes,
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
    const subjectAnalytics: Record<string, any> = {
      'General': {
        totalScore: reports.reduce((sum, r) => sum + r.total_score, 0),
        totalPossible: reports.reduce((sum, r) => sum + r.total_possible_marks, 0),
        totalAttempts: reports.length
      }
    };

    // Convert to final format
    const finalSubjectAnalytics: Record<string, any> = {};
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
