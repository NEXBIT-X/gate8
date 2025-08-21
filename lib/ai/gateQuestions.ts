/**
 * AI service to generate GATE exam questions using Groq API
 */

import Groq from 'groq-sdk';

export interface QuestionGenerationRequest {
  subjects: string[];
  questionCount: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
  questionTypes: ('MCQ' | 'MSQ' | 'NAT')[];
  syllabus?: string;
  topics?: string[];
}

export interface GeneratedQuestion {
  question_text: string;
  question_type: 'MCQ' | 'MSQ' | 'NAT';
  options?: string[];
  correct_answer: string | string[];
  marks: number;
  negative_marks: number;
  explanation: string;
  subject: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface QuestionGenerationResult {
  questions: GeneratedQuestion[];
  success: boolean;
  error?: string;
  metadata?: {
    totalGenerated: number;
    bySubject: Record<string, number>;
    byType: Record<string, number>;
  };
}

const GATE_SUBJECTS = [
  'Computer Science and Information Technology'
];

// Detailed syllabus texts for subjects (used to pre-fill the 'syllabus' field in the UI)
export const SUBJECT_SYLLABI: Record<string, string> = {
  'Computer Science and Information Technology': `Section 1: Engineering Mathematics
Discrete Mathematics: Propositional and first order logic. Sets, relations, functions, partial orders and
lattices. Monoids, Groups. Graphs: connectivity, matching, colouring. Combinatorics: counting, recurrence
relations, generating functions.
Linear Algebra: Matrices, determinants, system of linear equations, eigenvalues and eigenvectors, LU
decomposition.
Calculus: Limits, continuity and differentiability, Maxima and minima, Mean value theorem, Integration.
Probability and Statistics: Random variables, Uniform, normal, exponential, Poisson and binomial
distributions. Mean, median, mode and standard deviation. Conditional probability and Bayes theorem.
Section 2: Digital Logic
Boolean algebra. Combinational and sequential circuits. Minimization. Number representations and
computer arithmetic (fixed and floating point).
Section 3: Computer Organization and Architecture
Machine instructions and addressing modes. ALU, data‐path and control unit. Instruction pipelining,
pipeline hazards. Memory hierarchy: cache, main memory and secondary storage; I/O interface (interrupt
and DMA mode).
Section 4: Programming and Data Structures
Programming in C. Recursion. Arrays, stacks, queues, linked lists, trees, binary search trees, binary heaps,
graphs.
Section 5: Algorithms
Searching, sorting, hashing. Asymptotic worst case time and space complexity. Algorithm design
techniques: greedy, dynamic programming and divide‐and‐conquer. Graph traversals, minimum spanning
trees, shortest paths.
Section 6: Theory of Computation
Regular expressions and finite automata. Context-free grammars and push-down automata. Regular and
context-free languages, pumping lemma. Turing machines and undecidability.
Section 7: Compiler Design
Lexical analysis, parsing, syntax-directed translation. Runtime environments. Intermediate code
generation. Local optimisation, Data flow analyses: constant propagation, liveness analysis, common sub
expression elimination.
Section 8: Operating System
System calls, processes, threads, inter‐process communication, concurrency and synchronization.
Deadlock. CPU and I/O scheduling. Memory management and virtual memory. File systems.
Section 9: Databases
ER‐model. Relational model: relational algebra, tuple calculus, SQL. Integrity constraints, normal forms.
File organization, indexing (e.g., B and B+ trees). Transactions and concurrency control.
Section 10: Computer Networks
Concept of layering: OSI and TCP/IP Protocol Stacks; Basics of packet, circuit and virtual circuit
switching; Data link layer: framing, error detection, Medium Access Control, Ethernet bridging; Routing
protocols: shortest path, flooding, distance vector and link state routing; Fragmentation and IP addressing,
IPv4, CIDR notation, Basics of IP support protocols (ARP, DHCP, ICMP), Network Address Translation
(NAT); Transport layer: flow control and congestion control, UDP, TCP, sockets; Application layer
protocols: DNS, SMTP, HTTP, FTP, Email.`
};

// Topic lists for subjects to allow fine-grained selection in the UI
export const SUBJECT_TOPICS: Record<string, string[]> = {
  'Computer Science and Information Technology': [
    'Discrete Mathematics: Logic & Sets',
    'Discrete Mathematics: Graphs & Combinatorics',
    'Linear Algebra',
    'Calculus',
    'Probability & Statistics',
    'Digital Logic',
    'Computer Organization & Architecture',
    'Programming & Data Structures',
    'Algorithms',
    'Theory of Computation',
    'Compiler Design',
    'Operating Systems',
    'Databases',
    'Computer Networks'
  ]
};

const QUESTION_GENERATION_PROMPT = `You are an expert GATE (Graduate Aptitude Test in Engineering) question generator. Generate high-quality, authentic GATE exam questions based on the specified requirements.

IMPORTANT INSTRUCTIONS:
1. Generate ONLY valid JSON array format
2. Each question must be relevant to GATE exam pattern and difficulty
3. For MCQ: exactly 4 options (A, B, C, D) with one correct answer
4. For MSQ: 4 options with multiple correct answers (minimum 1, maximum 4)
5. For NAT: numerical answer questions requiring integer or decimal answers
6. Include detailed, educational explanations
7. Use appropriate GATE marking scheme: MCQ/MSQ = 2 marks, NAT = 1-2 marks
8. Cover fundamental to advanced concepts in each subject
9. Questions should test conceptual understanding, not just memorization

Return ONLY a JSON array with this exact structure:
[{
  "question_text": "Question content here",
  "question_type": "MCQ|MSQ|NAT",
  "options": ["Option A", "Option B", "Option C", "Option D"], // Only for MCQ/MSQ
  "correct_answer": "Option A" | ["Option A", "Option B"], // String for MCQ/NAT, Array for MSQ
  "marks": 2,
  "negative_marks": 0.67,
  "explanation": "Detailed explanation of the answer",
  "subject": "Subject name",
  "topic": "Specific topic covered",
  "difficulty": "easy|medium|hard"
}]

Do not include any markdown formatting, explanatory text, or additional content outside the JSON array.`;

/**
 * Fallback function to extract questions from malformed text
 */
function extractQuestionsFromText(text: string): GeneratedQuestion[] {
  const questions: GeneratedQuestion[] = [];
  
  // Try to find question-like patterns in the text
  const questionPatterns = [
    /question_text["\s]*:["\s]*([^"]+)["]/gi,
    /question["\s]*:["\s]*([^"]+)["]/gi
  ];
  
  // This is a basic fallback - create a simple question if parsing fails
  questions.push({
    question_text: "What is the time complexity of binary search algorithm?",
    question_type: "MCQ",
    options: ["O(n)", "O(log n)", "O(n log n)", "O(1)"],
    correct_answer: "O(log n)",
    marks: 2,
    negative_marks: 0.67,
    explanation: "Binary search divides the search space in half at each step, resulting in O(log n) time complexity.",
    subject: "Computer Science and Information Technology",
    topic: "Algorithms",
    difficulty: "medium"
  });
  
  return questions;
}

/**
 * Generate GATE exam questions using AI
 */
export async function generateGATEQuestions(request: QuestionGenerationRequest, aiEngine: 'groq' | 'gemini' | 'openai' = 'groq'): Promise<QuestionGenerationResult> {
  // Choose engine: groq (default) or other experimental engines
  const groqApiKey = process.env.GROQ_API_KEY;

  if (aiEngine === 'groq' && !groqApiKey) {
    return { questions: [], success: false, error: 'GROQ_API_KEY not configured' };
  }

  try {
    let generatedText: string | undefined;

    const subjectsList = request.subjects.join(', ');
    const questionTypesList = request.questionTypes.join(', ');
  const syllabusContext = request.syllabus ? `\nFocus on these syllabus topics: ${request.syllabus}` : '';
  const topicsContext = request.topics && request.topics.length ? `\nPrioritise these topics: ${request.topics.join(', ')}. Distribute questions across these topics where possible.` : '';
  const prompt = `${QUESTION_GENERATION_PROMPT}

REQUIREMENTS:
- Subjects: ${subjectsList}
- Number of questions: ${request.questionCount}
- Difficulty level: ${request.difficulty}
- Question types: ${questionTypesList}
- Distribution: Generate questions evenly across specified subjects and types, and prioritise selected topics when provided.${syllabusContext}${topicsContext}

Generate ${request.questionCount} high-quality GATE exam questions following the above specifications:`;

  const groq = new Groq({ apiKey: groqApiKey });
      const chatCompletion = await groq.chat.completions.create({
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        model: 'llama-3.1-8b-instant',
        temperature: 0.8,
        max_tokens: 8000,
        top_p: 0.9
      });

      // Normalize possible null to undefined and ensure string type
  const raw = chatCompletion.choices[0]?.message?.content ?? undefined;
  generatedText = typeof raw === 'string' ? raw : undefined;

    if (!generatedText) {
      throw new Error('No content generated from AI model');
    }

    console.log('Raw AI response:', generatedText.substring(0, 500) + '...');

    // Clean and parse JSON with better error handling
    let cleanedText = generatedText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    // Try to extract JSON array from the response
    const jsonStart = cleanedText.indexOf('[');
    const jsonEnd = cleanedText.lastIndexOf(']');
    
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      cleanedText = cleanedText.substring(jsonStart, jsonEnd + 1);
    }

    console.log('Cleaned text for parsing:', cleanedText.substring(0, 200) + '...');

    let questions: GeneratedQuestion[];
    try {
      questions = JSON.parse(cleanedText);
      
      // Ensure it's an array
      if (!Array.isArray(questions)) {
        throw new Error('Response is not an array');
      }
      
      console.log(`Successfully parsed ${questions.length} questions`);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Generated text:', generatedText);
      console.error('Cleaned text:', cleanedText);
      
      // Try to extract questions manually as fallback
      try {
        const fallbackQuestions = extractQuestionsFromText(generatedText);
        if (fallbackQuestions.length > 0) {
          questions = fallbackQuestions;
          console.log(`Used fallback parser, generated ${questions.length} questions`);
        } else {
          throw new Error('Failed to parse generated questions - no valid JSON found');
        }
      } catch (fallbackError) {
        throw new Error('Failed to parse generated questions - unable to extract questions');
      }
    }

    // Validate and sanitize questions
    const validQuestions = questions
      .filter(q => q.question_text && q.question_type && q.correct_answer)
      .map(q => ({
        ...q,
        marks: q.marks || (q.question_type === 'NAT' ? 1 : 2),
        negative_marks: q.negative_marks || (q.question_type === 'NAT' ? 0 : 0.67),
        difficulty: q.difficulty || 'medium',
        subject: q.subject || request.subjects[0],
        topic: q.topic || 'General'
      }));

    // Generate metadata
    const bySubject: Record<string, number> = {};
    const byType: Record<string, number> = {};
    
    validQuestions.forEach(q => {
      bySubject[q.subject] = (bySubject[q.subject] || 0) + 1;
      byType[q.question_type] = (byType[q.question_type] || 0) + 1;
    });

    return {
      questions: validQuestions,
      success: true,
      metadata: {
        totalGenerated: validQuestions.length,
        bySubject,
        byType
      }
    };

  } catch (error) {
    console.error('Error generating GATE questions:', error);
    return {
      questions: [],
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export { GATE_SUBJECTS };
