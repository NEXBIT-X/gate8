require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Testing database connection...');
console.log('URL exists:', !!supabaseUrl);
console.log('Service key exists:', !!serviceRoleKey);

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function testDatabase() {
  try {
    // Test 1: Check user_test_attempts table
    console.log('\n1. Testing user_test_attempts table...');
    const { data: attempts, error: attemptsError } = await supabase
      .from('user_test_attempts')
      .select('*')
      .limit(5);
      
    if (attemptsError) {
      console.error('Error fetching attempts:', attemptsError);
    } else {
      console.log(`Found ${attempts.length} test attempts`);
      if (attempts.length > 0) {
        console.log('Sample attempt fields:', Object.keys(attempts[0]));
      }
    }

    // Test 2: Check completed attempts
    console.log('\n2. Testing completed attempts...');
    const { count, error: countError } = await supabase
      .from('user_test_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('is_completed', true);
      
    if (countError) {
      console.error('Error counting completed attempts:', countError);
    } else {
      console.log('Total completed attempts:', count);
    }

    // Test 3: Check if tests table exists and has data
    console.log('\n3. Testing tests table...');
    const { data: tests, error: testsError } = await supabase
      .from('tests')
      .select('id, title')
      .limit(3);
      
    if (testsError) {
      console.error('Error fetching tests:', testsError);
    } else {
      console.log(`Found ${tests.length} tests`);
      tests.forEach(test => console.log(`- ${test.title} (${test.id})`));
    }

    // Test 4: Test the exact query from reports API and check field mapping
    console.log('\n4. Testing reports query and field mapping...');
    const { data: reportData, error: reportError } = await supabase
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
      
    if (reportError) {
      console.error('Error in reports query:', reportError);
    } else {
      console.log(`Reports query returned ${reportData.length} records`);
      if (reportData.length > 0) {
        console.log('Full sample record:');
        console.log(JSON.stringify(reportData[0], null, 2));
        
        // Check responses for this attempt
        console.log('\n5. Testing user_question_responses...');
        const { data: responses, error: responsesError } = await supabase
          .from('user_question_responses')
          .select('*')
          .eq('attempt_id', reportData[0].id)
          .limit(3);
          
        if (responsesError) {
          console.error('Error fetching responses:', responsesError);
        } else {
          console.log(`Found ${responses.length} responses for attempt ${reportData[0].id}`);
          if (responses.length > 0) {
            console.log('Sample response:');
            console.log(JSON.stringify(responses[0], null, 2));
          }
        }
      }
    }

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testDatabase();
