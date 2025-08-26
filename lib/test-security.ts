"use client";
import { useState, useEffect, useCallback, useRef } from 'react';

interface SecurityState {
  isFullscreen: boolean;
  showEnterFullscreenOverlay: boolean;
  showViolationOverlay: boolean;
  testStarted: boolean;
}

interface SecurityHookReturn {
  state: SecurityState;
  initializeTest: () => void;
  enterFullscreen: () => Promise<void>;
  exitFullscreen: () => Promise<void>;
  handleViolationCancel: () => void;
  handleViolationEndTest: () => void;
}

export const useTestSecurity = (
  onTestSubmit: () => void
): SecurityHookReturn => {
  const [state, setState] = useState<SecurityState>({
    isFullscreen: false,
    showEnterFullscreenOverlay: false,
    showViolationOverlay: false,
    testStarted: false
  });

  const isMonitoringRef = useRef(false);
  const lastViolationTimeRef = useRef(0);

  // Check if document is in fullscreen
  const isDocumentFullscreen = useCallback(() => {
    return !!(
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).mozFullScreenElement ||
      (document as any).msFullscreenElement
    );
  }, []);

  // Enter fullscreen function
  const enterFullscreen = useCallback(async () => {
    console.log('enterFullscreen called');
    try {
      if (!isDocumentFullscreen()) {
        console.log('Requesting fullscreen...');
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        } else if ((document.documentElement as any).webkitRequestFullscreen) {
          await (document.documentElement as any).webkitRequestFullscreen();
        } else if ((document.documentElement as any).mozRequestFullScreen) {
          await (document.documentElement as any).mozRequestFullScreen();
        } else if ((document.documentElement as any).msRequestFullscreen) {
          await (document.documentElement as any).msRequestFullscreen();
        }
      }
      
      console.log('Hiding enter fullscreen overlay and starting test');
      // Hide the enter fullscreen overlay and start monitoring
      setState(prev => ({
        ...prev,
        showEnterFullscreenOverlay: false,
        testStarted: true
      }));
      
      isMonitoringRef.current = true;
      console.log('Test security monitoring started');
      
    } catch (error) {
      console.warn('Failed to enter fullscreen:', error);
      throw error;
    }
  }, [isDocumentFullscreen]);

  // Exit fullscreen function
  const exitFullscreen = useCallback(async () => {
    try {
      if (isDocumentFullscreen()) {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        } else if ((document as any).mozCancelFullScreen) {
          await (document as any).mozCancelFullScreen();
        } else if ((document as any).msExitFullscreen) {
          await (document as any).msExitFullscreen();
        }
      }
    } catch (error) {
      console.warn('Failed to exit fullscreen:', error);
    }
  }, [isDocumentFullscreen]);

  // Initialize test - show enter fullscreen overlay
  const initializeTest = useCallback(() => {
    console.log('initializeTest called - showing enter fullscreen overlay');
    setState(prev => ({
      ...prev,
      showEnterFullscreenOverlay: true
    }));
  }, []);

  // Handle security violation
  const handleSecurityViolation = useCallback(() => {
    const now = Date.now();
    
    // Rate limiting: ignore violations within 2 seconds of each other
    if (now - lastViolationTimeRef.current < 2000) {
      return;
    }
    
    lastViolationTimeRef.current = now;

    if (isMonitoringRef.current && !state.showViolationOverlay) {
      console.log('Security violation detected');
      setState(prev => ({
        ...prev,
        showViolationOverlay: true
      }));
    }
  }, [state.showViolationOverlay]);

  // Update fullscreen state
  const updateFullscreenState = useCallback(() => {
    const isFS = isDocumentFullscreen();
    setState(prev => ({ ...prev, isFullscreen: isFS }));
    
    // If monitoring is active and user exits fullscreen, show violation overlay
    if (isMonitoringRef.current && !isFS && !state.showViolationOverlay) {
      console.log('Security violation: Fullscreen exit detected');
      handleSecurityViolation();
    }
  }, [isDocumentFullscreen, handleSecurityViolation, state.showViolationOverlay]);

  // Handle visibility change (tab switching)
  const handleVisibilityChange = useCallback(() => {
    if (isMonitoringRef.current && document.hidden && !state.showViolationOverlay) {
      console.log('Security violation: Tab switch detected');
      handleSecurityViolation();
    }
  }, [handleSecurityViolation, state.showViolationOverlay]);

  // Handle window blur (window switching)
  const handleWindowBlur = useCallback(() => {
    if (isMonitoringRef.current && !state.showViolationOverlay) {
      console.log('Security violation: Window blur detected');
      handleSecurityViolation();
    }
  }, [handleSecurityViolation, state.showViolationOverlay]);

  // Handle keyboard events (especially Escape key)
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!isMonitoringRef.current || state.showViolationOverlay) return;

    // Handle escape key and other restricted keys
    if (event.key === 'Escape' || 
        event.key === 'F11' || 
        (event.altKey && event.key === 'Tab') ||
        (event.ctrlKey && event.key === 'w') ||
        (event.ctrlKey && event.key === 't') ||
        (event.metaKey && event.key === 'w') ||
        (event.metaKey && event.key === 't')) {
      
      event.preventDefault();
      event.stopPropagation();
      
      console.log('Security violation: Restricted key detected:', event.key);
      handleSecurityViolation();
    }
  }, [handleSecurityViolation, state.showViolationOverlay]);

  // Handle user choice to cancel violation (stay in test)
  const handleViolationCancel = useCallback(async () => {
    setState(prev => ({ ...prev, showViolationOverlay: false }));
    try {
      await enterFullscreen();
    } catch (error) {
      console.warn('Failed to re-enter fullscreen:', error);
      // If can't enter fullscreen, end test
      handleViolationEndTest();
    }
  }, [enterFullscreen]);

  // Handle user choice to end test
  const handleViolationEndTest = useCallback(() => {
    setState(prev => ({ ...prev, showViolationOverlay: false }));
    isMonitoringRef.current = false;
    onTestSubmit();
  }, [onTestSubmit]);

  // Set up event listeners
  useEffect(() => {
    // Fullscreen change events
    const fullscreenEvents = [
      'fullscreenchange',
      'webkitfullscreenchange',
      'mozfullscreenchange',
      'MSFullscreenChange'
    ];

    fullscreenEvents.forEach(event => {
      document.addEventListener(event, updateFullscreenState);
    });

    // Visibility change (tab switching)
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Window events
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', updateFullscreenState);

    // Keyboard events
    document.addEventListener('keydown', handleKeyDown, true);

    // Prevent context menu
    const handleContextMenu = (event: MouseEvent) => {
      if (isMonitoringRef.current) {
        event.preventDefault();
      }
    };
    document.addEventListener('contextmenu', handleContextMenu);

    // Prevent text selection and copying
    const handleSelectStart = (event: Event) => {
      if (isMonitoringRef.current) {
        const target = event.target as HTMLElement;
        // Allow selection only for input elements
        if (!target.matches('input, textarea, [contenteditable]')) {
          event.preventDefault();
        }
      }
    };

    const handleCopy = (event: ClipboardEvent) => {
      if (isMonitoringRef.current) {
        event.preventDefault();
        console.log('Copy attempt blocked');
      }
    };

    const handlePaste = (event: ClipboardEvent) => {
      if (isMonitoringRef.current) {
        const target = event.target as HTMLElement;
        // Allow paste only for input elements
        if (!target.matches('input, textarea, [contenteditable]')) {
          event.preventDefault();
          console.log('Paste attempt blocked');
        }
      }
    };

    const handleDragStart = (event: DragEvent) => {
      if (isMonitoringRef.current) {
        event.preventDefault();
        console.log('Drag attempt blocked');
      }
    };

    // Add these additional security event listeners
    document.addEventListener('selectstart', handleSelectStart);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('dragstart', handleDragStart);

    // Cleanup
    return () => {
      fullscreenEvents.forEach(event => {
        document.removeEventListener(event, updateFullscreenState);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', updateFullscreenState);
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('selectstart', handleSelectStart);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('dragstart', handleDragStart);
    };
  }, [updateFullscreenState, handleVisibilityChange, handleWindowBlur, handleKeyDown]);

  // Initial fullscreen state check
  useEffect(() => {
    updateFullscreenState();
  }, [updateFullscreenState]);

  return {
    state,
    initializeTest,
    enterFullscreen,
    exitFullscreen,
    handleViolationCancel,
    handleViolationEndTest
  };
};
