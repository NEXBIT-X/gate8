"use client";
import React, { useState, useEffect } from 'react';

interface TestInstructionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onProceed: () => void;
    testName?: string;
}

const TestInstructionsModal: React.FC<TestInstructionsModalProps> = ({
    isOpen,
    onClose,
    onProceed,
    testName = "Test"
}) => {
    const [hasReadInstructions, setHasReadInstructions] = useState(false);

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            document.documentElement.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
            document.documentElement.style.overflow = '';
        }

        // Cleanup on unmount
        return () => {
            document.body.style.overflow = '';
            document.documentElement.style.overflow = '';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const handleProceed = () => {
        if (hasReadInstructions) {
            onProceed();
        }
    };

    return (
        <div 
            className="fixed top-0 left-0 right-0 bottom-0 w-full h-full bg-black/70 backdrop-blur-md flex items-center justify-center p-4 overflow-hidden" 
            style={{ zIndex: 99999, position: 'fixed', inset: 0 }}
        >
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="bg-blue-600 text-white p-4 rounded-t-lg flex justify-between items-center flex-shrink-0">
                    <h2 className="text-xl font-bold">TEST INSTRUCTIONS</h2>
                    
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1 pr-8">
                    
                    <p className="text-red-600 font-medium mb-6">
                        Please read the instructions carefully before starting the test 
                    </p>

                    <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
                        <div className="space-y-2">
                            <p><span className="font-medium">1.</span> Click <strong>start</strong> test on bottom of your screen to begin the test.</p>
                            <p><span className="font-medium">2.</span> The clock has been set at server and count down timer at the top Right side of the screen will display left out time to closure from where you can monitor time you have to complete the exam.</p>
                            <p><span className="font-medium">3.</span> Click one of the answer, simply click the desired option button.</p>
                            <p><span className="font-medium">4.</span> Candidate can change their response / attempt answer anytime during examination slot time by clicking another answer which candidates want to change an answer. Click to remove incorrect answer, click the desired option button.</p>
                            <p><span className="font-medium">5.</span> Click on Next to save the answer and moving to the next question. The next question will automatically be displayed.</p>
                            <p><span className="font-medium">6.</span> Click on Mark for Review to review your answer at later stage.</p>
                            <p><span className="font-medium">7.</span> To select a question, click on the question number on the Right side of the screen.</p>
                            <p><span className="font-medium">8.</span> The colour coded diagram on the Left side of the screen shows the status of the question.</p>
                        </div>

                        {/* Color Legend */}
                        <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-700">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-red-500 rounded"></div>
                                    <span>Not answered /Not Attempted Question.</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-green-500 rounded"></div>
                                    <span>Answered /Attempted Question.</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-blue-500 rounded"></div>
                                    <span>Not Answered & Marked for review.</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-purple-500 rounded"></div>
                                    <span>Answered & Marked for Review</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-gray-500 rounded"></div>
                                    <span>Dumped</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-white border border-gray-400 rounded"></div>
                                    <span>Not Visited</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <p><span className="font-medium">9.</span> Candidate will be allowed to Shuffle between questions anytime during the examination as per their convenience.</p>
                            <p><span className="font-medium">10.</span> All the answered questions will be counted for calculating the final score.</p>
                            <p><span className="font-medium">11.</span> Do not click final <strong>SUBMIT</strong> on the left corner of the screen unless you have completed the exam. In case you click final <strong>SUBMIT</strong> you will not be permitted to continue.</p>
                            <p><span className="font-medium">12.</span> Score obtained will be displayed immediately after the test.</p>
                        </div>
                    </div>

                    {/* Important Notes */}
                    <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">Additional Information:</h4>
                        <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                            <p>• The test will be conducted in fullscreen mode for security purposes.</p>
                            <p>• You are allowed maximum 2 attempts to exit fullscreen. After that, your test will be automatically submitted.</p>
                            <p>• Make sure your computer is in proper working condition before starting.</p>
                            <p>• Please ensure stable internet connection throughout the test.</p>
                        </div>
                    </div>

                    {/* Consent Checkbox */}
                    <div className="mt-6 flex items-start gap-3">
                        <input
                            type="checkbox"
                            id="instructions-read"
                            checked={hasReadInstructions}
                            onChange={(e) => setHasReadInstructions(e.target.checked)}
                            className="mt-1 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="instructions-read" className="text-sm text-gray-700 dark:text-gray-300">
                            I have read and understood the instructions given above.
                        </label>
                    </div>
                </div>

                {/* Footer */}
                <div className="border-t p-4 flex justify-end items-center bg-gray-50 dark:bg-gray-700 rounded-b-lg flex-shrink-0">
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-gray-600 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleProceed}
                            disabled={!hasReadInstructions}
                            className={`px-6 py-2 rounded font-medium transition-colors ${
                                hasReadInstructions
                                    ? 'bg-green-600 text-white hover:bg-blue-700'
                                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            }`}
                        >
                            Start Test
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TestInstructionsModal;
