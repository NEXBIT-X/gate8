"use client";
import React from 'react';

interface EnterFullscreenOverlayProps {
  isOpen: boolean;
  onEnterFullscreen: () => void;
  testTitle?: string;
}

const EnterFullscreenOverlay: React.FC<EnterFullscreenOverlayProps> = ({
  isOpen,
  onEnterFullscreen,
  testTitle = "Test"
}) => {
  console.log('EnterFullscreenOverlay render:', { isOpen, testTitle });
  
  if (!isOpen) return null;

  return (
    <div 
      className="fixed top-0 left-0 right-0 bottom-0 w-full h-full bg-black/90 backdrop-blur-md flex items-center justify-center p-4 overflow-hidden" 
      style={{ zIndex: 99999, position: 'fixed', inset: 0 }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full shadow-2xl border-2 border-blue-500">
        {/* Header */}
        <div className="bg-blue-600 text-white p-6 rounded-t-lg text-center">
          <div className="text-4xl mb-2">🖥️</div>
          <h2 className="text-xl font-bold">Enter Fullscreen Mode</h2>
        </div>

        {/* Content */}
        <div className="p-6 text-center">
          <div className="text-gray-700 dark:text-gray-300 space-y-4">
            <p className="font-medium text-lg">
              {testTitle} is ready to begin
            </p>
            
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <p className="text-yellow-800 dark:text-yellow-200 font-medium mb-2">
                ⚠️ Important Security Notice
              </p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                If you exit fullscreen mode during the test, you will be prompted to either continue or end the test. Ending the test will submit your current answers.
              </p>
            </div>

            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
              <p>• Click "Enter Fullscreen" to begin the test</p>
              <p>• Stay in fullscreen throughout the test</p>
              <p>• Do not press ESC, Change windows or Tabs</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t p-6 text-center bg-gray-50 dark:bg-gray-700 rounded-b-lg">
          <button
            onClick={() => {
              console.log('Enter Fullscreen button clicked!');
              onEnterFullscreen();
            }}
            className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-lg shadow-lg"
          >
            Enter Fullscreen & Start Test
          </button>
        </div>
      </div>
    </div>
  );
};

export default EnterFullscreenOverlay;
