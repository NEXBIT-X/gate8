/**
 * Fullscreen utility for test taking with exit attempt tracking
 */

import React from 'react';

export interface FullscreenState {
  isFullscreen: boolean;
  exitAttempts: number;
  maxExitAttempts: number;
  isTestBlocked: boolean;
}

export class FullscreenManager {
  private exitAttempts = 0;
  private maxExitAttempts = 3;
  private onExitAttempt?: (attempts: number, maxAttempts: number) => void;
  private onTestBlocked?: () => void;

  constructor(
    maxExitAttempts: number = 3,
    onExitAttempt?: (attempts: number, maxAttempts: number) => void,
    onTestBlocked?: () => void
  ) {
    this.maxExitAttempts = maxExitAttempts;
    this.onExitAttempt = onExitAttempt;
    this.onTestBlocked = onTestBlocked;
  }

  /**
   * Enter fullscreen mode
   */
  async enterFullscreen(): Promise<boolean> {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
        this.setupExitDetection();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to enter fullscreen:', error);
      return false;
    }
  }

  /**
   * Exit fullscreen mode
   */
  async exitFullscreen(): Promise<boolean> {
    try {
      if (document.exitFullscreen && document.fullscreenElement) {
        await document.exitFullscreen();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to exit fullscreen:', error);
      return false;
    }
  }

  /**
   * Check if currently in fullscreen
   */
  isFullscreen(): boolean {
    return !!document.fullscreenElement;
  }

  /**
   * Get current exit attempts count
   */
  getExitAttempts(): number {
    return this.exitAttempts;
  }

  /**
   * Get max allowed exit attempts
   */
  getMaxExitAttempts(): number {
    return this.maxExitAttempts;
  }

  /**
   * Check if test is blocked due to too many exit attempts
   */
  isTestBlocked(): boolean {
    return this.exitAttempts >= this.maxExitAttempts;
  }

  /**
   * Reset exit attempts count
   */
  resetExitAttempts(): void {
    this.exitAttempts = 0;
  }

  /**
   * Setup detection for fullscreen exit attempts
   */
  private setupExitDetection(): void {
    const handleFullscreenChange = () => {
      if (!this.isFullscreen()) {
        this.handleExitAttempt();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      // Detect common fullscreen exit key combinations
      if (
        event.key === 'Escape' ||
        event.key === 'F11' ||
        (event.altKey && event.key === 'Tab') ||
        (event.ctrlKey && event.shiftKey && event.key === 'I') ||
        (event.ctrlKey && event.key === 'r') ||
        (event.ctrlKey && event.shiftKey && event.key === 'R') ||
        event.key === 'F5'
      ) {
        if (this.isFullscreen() && !this.isTestBlocked()) {
          event.preventDefault();
          this.handleExitAttempt();
        }
      }
    };

    // Listen for fullscreen changes
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    // Listen for key combinations that might exit fullscreen
    document.addEventListener('keydown', handleKeyDown, true);

    // Store cleanup function
    this.cleanup = () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('keydown', handleKeyDown, true);
    };

    // Prevent right-click context menu
    const handleContextMenu = (event: MouseEvent) => {
      if (this.isFullscreen()) {
        event.preventDefault();
      }
    };
    document.addEventListener('contextmenu', handleContextMenu);

    // Store cleanup for context menu
    const originalCleanup = this.cleanup;
    this.cleanup = () => {
      originalCleanup?.();
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }

  private cleanup?: () => void;

  /**
   * Handle fullscreen exit attempt
   */
  private handleExitAttempt(): void {
    this.exitAttempts++;
    
    if (this.onExitAttempt) {
      this.onExitAttempt(this.exitAttempts, this.maxExitAttempts);
    }

    if (this.exitAttempts >= this.maxExitAttempts) {
      if (this.onTestBlocked) {
        this.onTestBlocked();
      }
    } else {
      // Re-enter fullscreen if not blocked
      setTimeout(() => {
        this.enterFullscreen();
      }, 100);
    }
  }

  /**
   * Clean up event listeners
   */
  destroy(): void {
    if (this.cleanup) {
      this.cleanup();
    }
  }
}

/**
 * React hook for fullscreen management
 */
export function useFullscreenManager(
  maxExitAttempts: number = 3,
  onExitAttempt?: (attempts: number, maxAttempts: number) => void,
  onTestBlocked?: () => void
) {
  const managerRef = React.useRef<FullscreenManager | null>(null);
  const [state, setState] = React.useState<FullscreenState>({
    isFullscreen: false,
    exitAttempts: 0,
    maxExitAttempts,
    isTestBlocked: false,
  });

  React.useEffect(() => {
    managerRef.current = new FullscreenManager(
      maxExitAttempts,
      (attempts, maxAttempts) => {
        setState(prev => ({
          ...prev,
          exitAttempts: attempts,
          isTestBlocked: attempts >= maxAttempts,
        }));
        onExitAttempt?.(attempts, maxAttempts);
      },
      () => {
        setState(prev => ({
          ...prev,
          isTestBlocked: true,
        }));
        onTestBlocked?.();
      }
    );

    // Update fullscreen state periodically
    const interval = setInterval(() => {
      if (managerRef.current) {
        setState(prev => ({
          ...prev,
          isFullscreen: managerRef.current!.isFullscreen(),
        }));
      }
    }, 1000);

    return () => {
      clearInterval(interval);
      if (managerRef.current) {
        managerRef.current.destroy();
      }
    };
  }, [maxExitAttempts, onExitAttempt, onTestBlocked]);

  const enterFullscreen = React.useCallback(async () => {
    if (managerRef.current) {
      const success = await managerRef.current.enterFullscreen();
      setState(prev => ({
        ...prev,
        isFullscreen: success,
      }));
      return success;
    }
    return false;
  }, []);

  const exitFullscreen = React.useCallback(async () => {
    if (managerRef.current) {
      const success = await managerRef.current.exitFullscreen();
      setState(prev => ({
        ...prev,
        isFullscreen: !success,
      }));
      return success;
    }
    return false;
  }, []);

  const resetExitAttempts = React.useCallback(() => {
    if (managerRef.current) {
      managerRef.current.resetExitAttempts();
      setState(prev => ({
        ...prev,
        exitAttempts: 0,
        isTestBlocked: false,
      }));
    }
  }, []);

  return {
    state,
    enterFullscreen,
    exitFullscreen,
    resetExitAttempts,
  };
}
