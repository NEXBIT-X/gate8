// Test the API endpoints
// Run this in browser console on localhost:3001

async function testCreateTest() {
  try {
    console.log('Testing test creation API...');
    
    const testData = {
      title: "Debug Test",
      description: "Testing API functionality",
      duration_minutes: 60,
      total_questions: 2,
      max_marks: 4,
      start_time: new Date().toISOString(),
      end_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
      is_active: true
    };
    
    console.log('Sending test data:', testData);
    
    const response = await fetch('/api/admin/tests/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });
    
    const result = await response.json();
    console.log('Response status:', response.status);
    console.log('Response data:', result);
    
    if (response.ok) {
      console.log('✅ Test created successfully!');
      return result.test;
    } else {
      console.error('❌ Test creation failed:', result.error);
      console.error('Details:', result.details);
      console.error('Hint:', result.hint);
    }
  } catch (error) {
    console.error('❌ Error testing API:', error);
  }
}

async function testCreateQuestions(testId) {
  try {
    console.log('Testing questions creation API...');
    
    const questionsData = {
      testId: testId,
      questions: [
        {
          question_text: "What is 2 + 2?",
          question_type: "MCQ",
          options: ["3", "4", "5", "6"],
          correct_answer: "4",
          marks: 2,
          negative_marks: 0.5,
          question_number: 1
        },
        {
          question_text: "Which are even numbers?",
          question_type: "MSQ", 
          options: ["1", "2", "3", "4"],
          correct_answer: ["2", "4"],
          marks: 2,
          negative_marks: 0.5,
          question_number: 2
        }
      ]
    };
    
    console.log('Sending questions data:', questionsData);
    
    const response = await fetch('/api/admin/questions/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(questionsData)
    });
    
    const result = await response.json();
    console.log('Questions response status:', response.status);
    console.log('Questions response data:', result);
    
    if (response.ok) {
      console.log('✅ Questions created successfully!');
    } else {
      console.error('❌ Questions creation failed:', result.error);
    }
  } catch (error) {
    console.error('❌ Error testing questions API:', error);
  }
}

// Run the test
console.log('Starting API test...');
testCreateTest().then(test => {
  if (test) {
    testCreateQuestions(test.id);
  }
});
