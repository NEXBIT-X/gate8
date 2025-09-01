require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function testReportsAPI() {
  try {
    console.log('Testing updated reports logic...');
    
    // Simulate the reports API query
    const { data: attempts, error: attemptsError } = await supabase
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
      .limit(2);
      
    if (attemptsError) {
      console.error('Error fetching attempts:', attemptsError);
      return;
    }

    console.log(`Found ${attempts.length} completed attempts`);

    // Get responses for the first attempt
    if (attempts.length > 0) {
      const firstAttempt = attempts[0];
      console.log('\nFirst attempt details:');
      console.log('- ID:', firstAttempt.id);
      console.log('- Test:', firstAttempt.tests.title);
      console.log('- Total Score:', firstAttempt.total_score);
      console.log('- Total Marks:', firstAttempt.total_marks);
      console.log('- Percentage:', firstAttempt.percentage);
      console.log('- Time taken (seconds):', firstAttempt.time_taken_seconds);

      // Get responses for this attempt
      const { data: responses, error: responsesError } = await supabase
        .from('user_question_responses')
        .select('*')
        .eq('attempt_id', firstAttempt.id);
        
      if (responsesError) {
        console.error('Error fetching responses:', responsesError);
      } else {
        console.log(`\nFound ${responses.length} responses for this attempt`);
        console.log('Questions attempted:', responses.filter(r => r.user_answer !== null).length);
        console.log('Correct answers:', responses.filter(r => r.is_correct).length);
        
        // Calculate total marks from responses
        const totalMarksFromResponses = responses.reduce((sum, r) => sum + (r.marks_obtained || 0), 0);
        console.log('Total marks from responses:', totalMarksFromResponses);
      }
    }

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testReportsAPI();
