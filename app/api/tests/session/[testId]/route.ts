import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { type ShuffleConfig, shuffleQuestionsForUser, generateShuffleConfig } from '@/lib/utils/shuffle';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { testId: string } }
) {
  try {
    const supabase = await createClient();
    const serviceSupabase = createServiceClient();
    
    const testId = params.testId;
    
    if (!testId) {
      return NextResponse.json({ error: 'Test ID is required' }, { status: 400 });
    }

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        details: userError?.message || 'No user found'
      }, { status: 401 });
    }

    console.log('Loading test session for user:', user.id, 'testId:', testId);

    // Check if user has an existing attempt for this test
    const { data: existingAttempt, error: attemptError } = await serviceSupabase
      .from('user_test_attempts')
      .select('*')
      .eq('user_id', user.id)
      .eq('test_id', testId)
      .single();

    if (attemptError && attemptError.code !== 'PGRST116') {
      console.error('Error checking existing attempt:', attemptError);
      return NextResponse.json({ 
        error: 'Failed to check existing attempts', 
        details: attemptError.message
      }, { status: 500 });
    }

    if (!existingAttempt) {
      // No existing attempt - user needs to start the test first
      return NextResponse.json({ 
        error: 'No test attempt found', 
        details: 'You need to start this test first from the dashboard.',
        requiresStart: true
      }, { status: 404 });
    }

  // Get test details
    const { data: test, error: testError } = await serviceSupabase
      .from('tests')
      .select('*')
      .eq('id', testId)
      .single();

    if (testError || !test) {
      console.error('Test fetch error:', testError);
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

  // Get questions for this test
    const { data: questions, error: questionsError } = await serviceSupabase
      .from('questions')
      .select('*')
      .eq('test_id', testId)
      .order('id');

    if (questionsError) {
      console.error('Error fetching questions:', questionsError);
      return NextResponse.json({ 
        error: 'Failed to fetch questions', 
        details: questionsError.message 
      }, { status: 500 });
    }

    if (!questions || questions.length === 0) {
      return NextResponse.json({ 
        error: 'No questions found for this test'
      }, { status: 400 });
    }

    // Transform questions to match the expected interface
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

    // Apply per-student deterministic shuffling (same as on start)
    let shuffleConfig: ShuffleConfig | null = existingAttempt?.answers?._shuffle_config || null;

    // Fallback: if missing config (older attempts), deterministically compute and persist
    if (!shuffleConfig) {
      try {
        const shuffled = shuffleQuestionsForUser(transformedQuestions, user.id, testId);
        shuffleConfig = generateShuffleConfig(shuffled);
        // Persist back to attempt to keep it stable across sessions
        const updatedAnswers = { ...(existingAttempt.answers || {}), _shuffle_config: shuffleConfig };
        await serviceSupabase
          .from('user_test_attempts')
          .update({ answers: updatedAnswers })
          .eq('id', existingAttempt.id);
      } catch (e) {
        console.warn('Failed to generate/persist shuffle config fallback:', e);
      }
    }

    let questionsForClient = transformedQuestions;

    if (shuffleConfig) {
      // Reorder questions according to stored shuffle order and apply option permutations
      const byId = new Map<number, typeof transformedQuestions[number]>();
      transformedQuestions.forEach(q => byId.set(q.id, q));

      const applyOptionShuffle = (opts: string[] | null, map: Record<string, string> | undefined): string[] | null => {
        if (!opts || opts.length === 0 || !map || Object.keys(map).length === 0) return opts;
        const result = Array(opts.length).fill('') as string[];
        for (let i = 0; i < opts.length; i++) {
          const origLabel = String.fromCharCode(65 + i); // 'A', 'B', ...
          const newLabel = map[origLabel];
          const newIndex = newLabel ? newLabel.charCodeAt(0) - 65 : i;
          result[newIndex] = opts[i];
        }
        return result;
      };

      const orderedIds = shuffleConfig.question_order && shuffleConfig.question_order.length
        ? shuffleConfig.question_order
        : transformedQuestions.map(q => q.id);

      questionsForClient = orderedIds
        .map((qid) => byId.get(qid))
        .filter((q): q is typeof transformedQuestions[number] => !!q)
        .map((q) => {
          const optionMap = shuffleConfig!.option_shuffles[q.id];
          return {
            ...q,
            options: applyOptionShuffle(q.options, optionMap)
          };
        });
    }

    console.log('Successfully loaded test session with', questionsForClient.length, 'questions (shuffled per student)');

    return NextResponse.json({ 
      success: true,
      attempt: existingAttempt,
      test: {
        ...test,
        questions: questionsForClient
      }
    });

  } catch (error) {
    console.error('Error in test session API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    
    return NextResponse.json({ 
      error: 'Internal server error',
      details: errorMessage
    }, { status: 500 });
  }
}
