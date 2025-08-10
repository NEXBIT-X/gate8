"use client";
import { useState, useEffect, useCallback } from 'react';

interface PracticeQuestion {
    id: string;
    question_text: string;
    question_type: 'MCQ' | 'MSQ' | 'NAT';
    options?: string[];
    correct_answer: string | string[];
    explanation: string;
    marks: number;
    negative_marks: number;
}

const PRACTICE_SET: PracticeQuestion[] = [
    { id: 'q1', question_text: 'What is the output of 2 + 2?', question_type: 'MCQ', options: ['3','4','5','6'], correct_answer: '4', explanation: '2 + 2 = 4.', marks:1, negative_marks:0 },
    { id: 'q2', question_text: 'Select prime numbers.', question_type: 'MSQ', options: ['2','3','4','6'], correct_answer: ['2','3'], explanation: '2 & 3 are prime.', marks:2, negative_marks:0 },
    { id: 'q3', question_text: 'Enter the binary representation of decimal 5.', question_type: 'NAT', correct_answer: '101', explanation: '5 -> 101 (4+1).', marks:2, negative_marks:0 }
];

type AnswerValue = string | string[];

export default function PracticePage() {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, AnswerValue | undefined>>({});
    const [marked, setMarked] = useState<Set<string>>(new Set());
    const [visited, setVisited] = useState<Set<string>>(new Set());
    const [submitted, setSubmitted] = useState(false);
    const [timeLeft, setTimeLeft] = useState(5 * 60);
    const [showMobilePalette, setShowMobilePalette] = useState(false);

    useEffect(() => {
        if (submitted) return;
        if (timeLeft <= 0) { setSubmitted(true); return; }
        const id = setInterval(() => setTimeLeft(t => Math.max(0, t - 1)), 1000);
        return () => clearInterval(id);
    }, [submitted, timeLeft]);

    useEffect(() => {
        const q = PRACTICE_SET[currentIndex];
        setVisited(v => v.has(q.id) ? v : new Set(v).add(q.id));
    }, [currentIndex]);

    const handleSelect = useCallback((q: PracticeQuestion, value: string) => {
        setAnswers(prev => {
            if (q.question_type === 'MSQ') {
                const cur = Array.isArray(prev[q.id]) ? prev[q.id] as string[] : [];
                return { ...prev, [q.id]: cur.includes(value) ? cur.filter(v => v !== value) : [...cur, value] };
            }
            return { ...prev, [q.id]: value };
        });
    }, []);

    const clearResponse = (q: PracticeQuestion) => setAnswers(a => ({ ...a, [q.id]: undefined }));

    const toggleMark = (q: PracticeQuestion) => setMarked(m => { const n = new Set(m); n.has(q.id) ? n.delete(q.id) : n.add(q.id); return n; });

    const submit = () => setSubmitted(true);
    const reset = () => { setAnswers({}); setMarked(new Set()); setVisited(new Set()); setCurrentIndex(0); setTimeLeft(5*60); setSubmitted(false); };

    const formatTime = (s: number) => `${Math.floor(s/3600).toString().padStart(2,'0')}:${Math.floor((s%3600)/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;

    const getStatus = (q: PracticeQuestion) => {
        const ans = answers[q.id];
        const isVisited = visited.has(q.id);
        const isMarked = marked.has(q.id);
        const isAnswered = ans !== undefined && (!(Array.isArray(ans)) || ans.length>0);
        if (!isVisited) return 'not-visited';
        if (isAnswered && isMarked) return 'answered-marked';
        if (isAnswered) return 'answered';
        if (isMarked) return 'marked';
        return 'not-answered';
    };

    const statusColors: Record<string,string> = {
        'answered':'bg-green-600','marked':'bg-purple-600','answered-marked':'bg-blue-600','not-answered':'bg-red-600','not-visited':'bg-gray-600'
    };

    const counts = (() => {
        let answered=0, markedC=0, ansMarked=0, notAnswered=0, notVisited=0;
        PRACTICE_SET.forEach(q => { const st = getStatus(q); switch(st){case 'answered':answered++;break;case 'marked':markedC++;break;case 'answered-marked':ansMarked++;break;case 'not-answered':notAnswered++;break;case 'not-visited':notVisited++;break;} });
        return { answered, marked: markedC, answeredMarked: ansMarked, notAnswered, notVisited };
    })();

    const q = PRACTICE_SET[currentIndex];
    const response = answers[q.id];

    const isCorrect = (q: PracticeQuestion): boolean => {
        const resp = answers[q.id];
        if (resp == null) return false;
        if (q.question_type === 'MSQ') {
            const corr = Array.isArray(q.correct_answer) ? q.correct_answer : [q.correct_answer];
            const given = Array.isArray(resp) ? resp : [resp];
            return corr.length === given.length && corr.every(c => given.includes(c));
        }
        return String(resp).trim().toLowerCase() === String(q.correct_answer).trim().toLowerCase();
    };

    const Explanation = () => submitted ? (
        <div className="mt-6 text-xs space-y-1">
            <div>
                {isCorrect(q) ? 'Correct ✅' : `Incorrect ❌ | Correct: ${Array.isArray(q.correct_answer) ? q.correct_answer.join(', ') : q.correct_answer}`}
            </div>
            <p>Explanation: {q.explanation}</p>
        </div>
    ) : null;

    return (
        <div className="min-h-screen  flex flex-col lg:flex-row">
            <div className="flex-1 flex flex-col border-b lg:border-b-0 lg:border-r border-gray-800 min-w-0">
                <div className=" border-b border-gray-700 px-4 py-2 flex items-center justify-between text-xs gap-4">
                    <div className="flex items-center gap-4">
                        <span className="px-2 py-1  rounded text-[11px] font-semibold">Practice</span>
                        <div className="hidden md:flex gap-4">
                            <span>Question Type: <strong>{q.question_type}</strong></span>
                            <span>Marks: <span>+{q.marks}</span></span>
                        </div>
                    </div>
                    <div className="flex items-center gap-6">
                        <button onClick={()=>setShowMobilePalette(true)} className="lg:hidden px-3 py-1 rounded  hover:bg-gray-600 border border-gray-600">Palette</button>
                        <div className="text-right">
                            <div className="font-mono text-lg">{formatTime(timeLeft)}</div>
                            <div className="text-[10px] ">Time Left</div>
                        </div>
                        <div className="flex items-center gap-2 text-[11px]">
                            <div className="w-8 h-8 rounded-full  flex items-center justify-center font-semibold">U</div>
                            <div className="hidden sm:block text-right leading-tight"><div className="font-medium">Candidate</div><div>Tutorial</div></div>
                        </div>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                    <div className="max-w-none">
                        <h2 className="font-semibold mb-4 text-sm">Question No. {currentIndex + 1}</h2>
                        <div className="mb-6 text-sm leading-relaxed">{q.question_text}</div>
                        {q.question_type === 'MCQ' && (
                            <div className="space-y-4">
                                {q.options?.map((opt,i) => (
                                    <label key={opt} className={`flex items-center p-3 rounded border cursor-pointer transition-colors ${response===opt ? 'border-blue-500 bg-blue-500/10':'border-gray-600 hover:border-gray-500'}`}> 
                                        <input type="radio" name={q.id} className="mr-3 w-4 h-4" checked={response===opt} onChange={() => handleSelect(q,opt)} disabled={submitted} />
                                        <span className="text-sm">{String.fromCharCode(65+i)}. {opt}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                        {q.question_type === 'MSQ' && (
                            <div className="space-y-4">
                                <p className="text-sm">⚠️ Multiple Select Question - Select all correct options</p>
                                {q.options?.map((opt,i) => {
                                    const cur = Array.isArray(response) ? response : [];
                                    const checked = cur.includes(opt);
                                    return (
                                        <label key={opt} className={`flex items-center p-3 rounded border cursor-pointer transition-colors ${checked ? 'border-blue-500 bg-blue-500/10':'border-gray-600 hover:border-gray-500'}`}> 
                                            <input type="checkbox" className="mr-3 w-4 h-4" checked={checked} onChange={() => handleSelect(q,opt)} disabled={submitted} />
                                            <span className="text-sm">{String.fromCharCode(65+i)}. {opt}</span>
                                        </label>
                                    );
                                })}
                            </div>
                        )}
                        {q.question_type === 'NAT' && (
                            <div className="space-y-4">
                                <p className="text-sm">📝 Numerical Answer Type - Enter your answer</p>
                                <div className="flex items-center gap-3">
                                    <label className="text-sm font-medium">Answer:</label>
                                    <input type="text" value={typeof response==='string'?response:''} onChange={e=>handleSelect(q,e.target.value)} disabled={submitted} className="px-3 py-2 bg-gray-800 border border-gray-600 rounded focus:border-blue-500 focus:outline-none w-40" placeholder="Enter" />
                                </div>
                            </div>
                        )}
                        <Explanation />
                    </div>
                </div>
                <div className=" border-t border-gray-700 p-3 flex flex-wrap gap-2 justify-between sticky bottom-0">
                    <div className="flex flex-wrap gap-2 text-xs">
                        <button onClick={()=>setCurrentIndex(i=>Math.max(0,i-1))} disabled={currentIndex===0} className="px-3 py-2  hover:bg-gray-600 disabled:opacity-50 rounded">Previous</button>
                        <button onClick={()=>setCurrentIndex(i=>Math.min(PRACTICE_SET.length-1,i+1))} className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 rounded">Save & Next</button>
                        <button onClick={()=>{toggleMark(q); setCurrentIndex(i=>Math.min(PRACTICE_SET.length-1,i+1));}} className="px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded">Mark for Review & Next</button>
                        <button onClick={()=>{toggleMark(q); setCurrentIndex(i=>Math.min(PRACTICE_SET.length-1,i+1));}} className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded">Save & Mark for Review & Next</button>
                        <button onClick={()=>clearResponse(q)} className="px-3 py-2 bg-yellow-600 hover:bg-yellow-700 rounded font-medium">Clear Response</button>
                    </div>
                    <div className="flex gap-2">
                        {currentIndex === PRACTICE_SET.length - 1 && !submitted && (
                            <button onClick={submit} className="px-5 py-2 bg-red-600 hover:bg-red-700 rounded font-semibold">Submit</button>
                        )}
                        {submitted && (
                            <button onClick={reset} className="px-5 py-2 bg-gray-600 hover:bg-gray-500 rounded font-semibold">Try Again</button>
                        )}
                    </div>
                </div>
            </div>
            <div className="hidden lg:flex w-80  flex-col">
                <div className="p-4 border-b border-gray-700 space-y-3 text-[11px]">
                    <h3 className="font-semibold tracking-wide text-xs">Question Palette</h3>
                    <div className="grid grid-cols-5 gap-2">
                        {PRACTICE_SET.map((q,i)=>{
                            const st = getStatus(q);
                            return (
                                <button key={q.id} onClick={()=>setCurrentIndex(i)} className={`h-9 rounded text-xs font-semibold flex items-center justify-center transition-colors border border-gray-700 ${i===currentIndex?'ring-2 ring-white':''} ${statusColors[st]}`}>{i+1}</button>
                            );
                        })}
                    </div>
                </div>
                <div className="p-4 border-b border-gray-700 text-[11px] space-y-2">
                    <h4 className="font-semibold">Legend</h4>
                    <div className="grid grid-cols-2 gap-2">
                        <Legend color={statusColors['answered']} label={`Answered (${counts.answered})`} />
                        <Legend color={statusColors['not-answered']} label={`Not Answered (${counts.notAnswered})`} />
                        <Legend color={statusColors['marked']} label={`Marked (${counts.marked})`} />
                        <Legend color={statusColors['answered-marked']} label={`Answered & Marked (${counts.answeredMarked})`} />
                        <Legend color={statusColors['not-visited']} label={`Not Visited (${counts.notVisited})`} />
                    </div>
                </div>
                {submitted && (
                    <div className="p-4 border-b border-gray-700 text-[11px] space-y-1">
                        <h4 className="font-semibold">Score Summary</h4>
                        <p>Correct: {PRACTICE_SET.filter(isCorrect).length} / {PRACTICE_SET.length}</p>
                    </div>
                )}
                <div className="mt-auto p-4 text-center text-[10px]">GATE Style Practice</div>
            </div>
            {showMobilePalette && (
                <div className="lg:hidden fixed inset-0 z-50  backdrop-blur-sm flex">
                    <div className="ml-auto w-full max-w-sm bg-gray-800 h-full flex flex-col">
                        <div className="p-4 border-b border-gray-700 flex items-center justify-between text-xs">
                            <h3 className="font-semibold">Question Palette</h3>
                            <button onClick={()=>setShowMobilePalette(false)} className="px-2 py-1 rounded bg-gray-700 hover:bg-gray-600">Close</button>
                        </div>
                        <div className="p-4 space-y-4 overflow-y-auto">
                            <div className="grid grid-cols-6 gap-2">
                                {PRACTICE_SET.map((q,i)=>{
                                    const st = getStatus(q);
                                    return (
                                        <button key={q.id} onClick={()=>{setCurrentIndex(i); setShowMobilePalette(false);}} className={`h-9 rounded text-xs font-semibold flex items-center justify-center transition-colors border border-gray-700 ${i===currentIndex?'ring-2 ring-white':''} ${statusColors[st]}`}>{i+1}</button>
                                    );
                                })}
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-[11px]">
                                <Legend color={statusColors['answered']} label={`Answered (${counts.answered})`} />
                                <Legend color={statusColors['not-answered']} label={`Not Answered (${counts.notAnswered})`} />
                                <Legend color={statusColors['marked']} label={`Marked (${counts.marked})`} />
                                <Legend color={statusColors['answered-marked']} label={`Answered & Marked (${counts.answeredMarked})`} />
                                <Legend color={statusColors['not-visited']} label={`Not Visited (${counts.notVisited})`} />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const Legend = ({ color, label }: { color: string; label: string }) => (
    <div className="flex items-center gap-2"><div className={`w-4 h-4 rounded ${color}`}></div><span>{label}</span></div>
);
