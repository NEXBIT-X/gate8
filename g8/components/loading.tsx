import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'primary' | 'secondary' | 'accent';
  text?: string;
  fullScreen?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  variant = 'primary',
  text,
  fullScreen = false
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  const variantClasses = {
    primary: 'border-blue-500',
    secondary: 'border-gray-500',
    accent: 'border-purple-500'
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl'
  };

  const spinner = (
    <div className="flex flex-col items-center gap-3">
      <div className={`${sizeClasses[size]} ${variantClasses[variant]} border-2 border-t-transparent rounded-full animate-spin`} />
      {text && (
        <p className={`${textSizeClasses[size]} text-muted-foreground animate-pulse`}>
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
        {spinner}
      </div>
    );
  }

  return spinner;
};

interface DatabaseLoadingProps {
  operation?: 'loading' | 'saving' | 'connecting' | 'processing';
  detail?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const DatabaseLoading: React.FC<DatabaseLoadingProps> = ({
  operation = 'loading',
  detail,
  size = 'md'
}) => {
  const operationTexts = {
    loading: 'Loading from database',
    saving: 'Saving to database',
    connecting: 'Connecting to database',
    processing: 'Processing data'
  };

  const icons = {
    loading: (
      <svg className="w-5 h-5 text-blue-500 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4-4m0 0L8 8m4-4v12" />
      </svg>
    ),
    saving: (
      <svg className="w-5 h-5 text-green-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
      </svg>
    ),
    connecting: (
      <svg className="w-5 h-5 text-yellow-500 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
      </svg>
    ),
    processing: (
      <svg className="w-5 h-5 text-purple-500 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    )
  };

  return (
    <div className="flex items-center gap-3 p-4">
      <div className="flex items-center gap-2">
        {icons[operation]}
        <LoadingSpinner size={size} variant="primary" />
      </div>
      <div className="flex flex-col">
        <span className="font-medium text-foreground">
          {operationTexts[operation]}
        </span>
        {detail && (
          <span className="text-sm text-muted-foreground">
            {detail}
          </span>
        )}
      </div>
    </div>
  );
};

interface TestLoadingProps {
  stage: 'initializing' | 'loading-test' | 'loading-questions' | 'preparing-interface' | 'ready';
}

export const TestLoading: React.FC<TestLoadingProps> = ({ stage }) => {
  const stages = [
    { key: 'initializing', label: 'Initializing test session', icon: '🔧' },
    { key: 'loading-test', label: 'Loading test information', icon: '📋' },
    { key: 'loading-questions', label: 'Fetching questions', icon: '❓' },
    { key: 'preparing-interface', label: 'Preparing test interface', icon: '🎨' },
    { key: 'ready', label: 'Ready to start!', icon: '✅' }
  ];

  const currentStageIndex = stages.findIndex(s => s.key === stage);

  return (
    <div className="max-w-md mx-auto p-6 bg-card rounded-lg border shadow-lg">
      <div className="text-center mb-6">
        <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-white animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold mb-2">Loading Test</h3>
        <p className="text-muted-foreground text-sm">Please wait while we prepare your test...</p>
      </div>

      <div className="space-y-3">
        {stages.map((stageItem, index) => {
          const isActive = index === currentStageIndex;
          const isCompleted = index < currentStageIndex;
          
          return (
            <div 
              key={stageItem.key}
              className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-300 ${
                isActive ? 'bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800' :
                isCompleted ? 'bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800' :
                'bg-muted/30'
              }`}
            >
              <div className={`text-lg ${isActive ? 'animate-bounce' : ''}`}>
                {isCompleted ? '✅' : isActive ? '⏳' : stageItem.icon}
              </div>
              <span className={`text-sm font-medium ${
                isActive ? 'text-blue-700 dark:text-blue-300' :
                isCompleted ? 'text-green-700 dark:text-green-300' :
                'text-muted-foreground'
              }`}>
                {stageItem.label}
              </span>
              {isActive && (
                <LoadingSpinner size="sm" variant="primary" />
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 bg-muted rounded-full h-2">
        <div 
          className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-500"
          style={{ width: `${((currentStageIndex + 1) / stages.length) * 100}%` }}
        />
      </div>
    </div>
  );
};

export default LoadingSpinner;
