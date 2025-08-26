"use client";
import React from 'react';

interface SecurityViolationOverlayProps {
  isOpen: boolean;
  onCancel: () => void;
  onEndTest: () => void;
}

const SecurityViolationOverlay: React.FC<SecurityViolationOverlayProps> = ({
  isOpen,
  onCancel,
  onEndTest
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed top-0 left-0 right-0 bottom-0 w-full h-full bg-black/90 backdrop-blur-md flex items-center justify-center p-4 overflow-hidden" 
      style={{ zIndex: 99999, position: 'fixed', inset: 0 }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full shadow-2xl border-2 border-red-500">
        {/* Header */}
        <div className="bg-red-600 text-white p-6 rounded-t-lg text-center">
          <div className="text-4xl mb-2">⚠️</div>
          <h2 className="text-xl font-bold">Security Violation Detected</h2>
        </div>

        {/* Content */}
        <div className="p-6 text-center">
          <div className="text-gray-700 dark:text-gray-300 space-y-4">
            <p className="font-medium text-lg text-red-600 dark:text-red-400">
              User is trying to exit fullscreen mode
            </p>
            
            <p className="text-sm">
              You may have attempted to exit fullscreen or change windows or press restricted keys during the test.
            </p>

            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-red-800 dark:text-red-200 font-medium mb-2">
                If proceeded, test will be ended
              </p>
              <p className="text-sm text-red-700 dark:text-red-300">
                Your current answers will be submitted and you cannot retake this test.
              </p>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="border-t p-6 flex gap-4 justify-center bg-gray-50 dark:bg-gray-700 rounded-b-lg">
          <button
            onClick={onCancel}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors font-medium"
          >
            Stay in Test
          </button>
          <button
            onClick={onEndTest}
            className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors font-medium"
          >
            End Test!
          </button>
        </div>
      </div>
    </div>
  );
};

export default SecurityViolationOverlay;
