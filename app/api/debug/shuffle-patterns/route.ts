import { createClient } from '@/lib/supabase/server';
import { shuffleQuestionsForUser, verifyShuffleUniqueness } from '@/lib/utils/shuffle';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const testId = searchParams.get('testId');

    if (!testId) {
      return NextResponse.json({ error: 'Test ID required' }, { status: 400 });
    }

    // Get questions for the test
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('*')
      .eq('test_id', testId)
      .order('id');

    if (questionsError || !questions) {
      return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 });
    }

    // Transform questions
    const transformedQuestions = questions.map(q => ({
      id: q.id,
      test_id: q.test_id,
      question: q.question,
      question_type: q.question_type,
      options: q.options,
      correct_answer: q.correct_answer,
      marks: q.marks,
      negative_marks: q.negative_marks,
      created_at: q.created_at
    }));

    // Generate shuffle patterns for this user
    const shuffledQuestions = shuffleQuestionsForUser(transformedQuestions, user.id, testId);
    const isUnique = verifyShuffleUniqueness(shuffledQuestions);

    // Create detailed pattern analysis
    const patterns = shuffledQuestions.map(q => ({
      questionId: q.id,
      originalQuestionId: q.original_question_id,
      questionType: q.question_type,
      originalOptions: transformedQuestions.find(orig => orig.id === q.original_question_id)?.options,
      shuffledOptions: q.options,
      shuffleMap: q.shuffle_map,
      patternSignature: q.question_type === 'NAT' ? 'NAT-NO-SHUFFLE' : 
        q.options.join('|') + '-' + Object.values(q.shuffle_map).join('')
    }));

    // Generate patterns for multiple users to show uniqueness
    const multiUserPatterns = [];
    const testUserIds = ['user1', 'user2', 'user3'];
    
    for (const testUserId of testUserIds) {
      const userShuffled = shuffleQuestionsForUser(transformedQuestions, testUserId, testId);
      multiUserPatterns.push({
        userId: testUserId,
        patterns: userShuffled.map(q => ({
          questionId: q.original_question_id,
          optionOrder: q.options,
          shuffleSignature: q.question_type === 'NAT' ? 'NAT' : 
            Object.values(q.shuffle_map).join('')
        }))
      });
    }

    return NextResponse.json({
      currentUser: user.id,
      testId,
      totalQuestions: questions.length,
      shuffleVerification: {
        isUnique,
        message: isUnique ? 'All questions have unique shuffle patterns' : 'Some questions have duplicate patterns'
      },
      currentUserPatterns: patterns,
      multiUserComparison: multiUserPatterns,
      shuffleAnalysis: {
        mcqQuestions: patterns.filter(p => p.questionType === 'MCQ').length,
        msqQuestions: patterns.filter(p => p.questionType === 'MSQ').length,
        natQuestions: patterns.filter(p => p.questionType === 'NAT').length,
        uniquePatterns: new Set(patterns.map(p => p.patternSignature)).size
      }
    });
  } catch (error) {
    console.error('Error in shuffle patterns debug:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
