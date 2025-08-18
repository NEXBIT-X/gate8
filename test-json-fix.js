#!/usr/bin/env node

// Test the improved JSON parsing
const testMalformedJson = `[
  {
    question_text: "What is 2+2?",
    "question_type": "MCQ",
    options: ["3", "4", "5"],
    correct_answer: "4",
    marks: 2,
    negative_marks: 0.5,
  }
]`;

const testValidJson = `[
  {
    "question_text": "What is 2+2?",
    "question_type": "MCQ", 
    "options": ["3", "4", "5"],
    "correct_answer": "4",
    "marks": 2,
    "negative_marks": 0.5
  }
]`;

console.log('🧪 Testing JSON parsing improvements...\n');

// Test 1: Malformed JSON (unquoted property names, trailing comma)
console.log('📝 Test 1: Malformed JSON');
try {
  JSON.parse(testMalformedJson);
  console.log('❌ Should have failed - malformed JSON was accepted');
} catch (error) {
  console.log('✅ Correctly identified malformed JSON:', error.message);
}

// Test 2: Valid JSON
console.log('\n📝 Test 2: Valid JSON');
try {
  const parsed = JSON.parse(testValidJson);
  console.log('✅ Valid JSON parsed successfully');
  console.log('Questions found:', parsed.length);
  console.log('First question type:', parsed[0].question_type);
} catch (error) {
  console.log('❌ Error parsing valid JSON:', error.message);
}

// Test 3: Simulate the fix function
console.log('\n📝 Test 3: Fixing malformed JSON...');

function fixCommonJsonErrors(jsonStr) {
  let fixed = jsonStr;
  
  // Fix unquoted property names
  fixed = fixed.replace(/([{,]\\s*)([a-zA-Z_][a-zA-Z0-9_]*)\\s*:/g, '$1"$2":');
  
  // Fix trailing commas
  fixed = fixed.replace(/,(\\s*[}\\]])/g, '$1');
  
  return fixed;
}

const fixedJson = fixCommonJsonErrors(testMalformedJson);
console.log('Fixed JSON:');
console.log(fixedJson.substring(0, 150) + '...');

try {
  const parsed = JSON.parse(fixedJson);
  console.log('✅ Fixed JSON parsed successfully!');
  console.log('Questions found:', parsed.length);
} catch (error) {
  console.log('❌ Fixed JSON still has errors:', error.message);
}

console.log('\n🎯 The improvements should:');
console.log('- Fix unquoted property names');
console.log('- Remove trailing commas');
console.log('- Provide default answers when missing');
console.log('- Handle incomplete JSON gracefully');
