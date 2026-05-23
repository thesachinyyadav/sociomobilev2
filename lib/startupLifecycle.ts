import { useState, useEffect } from 'react';

export type StartupPhase = 1 | 2 | 3;

let currentPhase: StartupPhase = 1;
const listeners = new Set<(phase: StartupPhase) => void>();

export function getStartupPhase(): StartupPhase {
  return currentPhase;
}

export function setStartupPhase(phase: StartupPhase): void {
  if (phase > currentPhase && phase <= 3) {
    console.log(`[StartupLifecycle] Advancing to Phase ${phase}`);
    currentPhase = phase;
    listeners.forEach((listener) => {
      try {
        listener(currentPhase);
      } catch (err) {
        console.error('Error in startup phase listener:', err);
      }
    });
  }
}

/**
 * React hook to listen to the current startup phase.
 * Allows components to defer their rendering or side effects.
 */
export function useStartupPhase(): StartupPhase {
  const [phase, setPhase] = useState<StartupPhase>(currentPhase);

  useEffect(() => {
    const handlePhaseChange = (newPhase: StartupPhase) => {
      setPhase(newPhase);
    };
    listeners.add(handlePhaseChange);
    
    // In case the phase changed between initial render and effect execution
    if (currentPhase !== phase) {
      setPhase(currentPhase);
    }
    
    return () => {
      listeners.delete(handlePhaseChange);
    };
  }, [phase]);

  return phase;
}

// Failsafe timers to guarantee startup transitions if normal flows stall
if (typeof window !== 'undefined') {
  // Safe default: transition to Phase 2 after 3 seconds if not already triggered
  setTimeout(() => {
    if (currentPhase < 2) {
      console.warn('[StartupLifecycle] Failsafe: Advancing to Phase 2');
      setStartupPhase(2);
    }
  }, 3000);

  // Transition to Phase 3 after 6 seconds if not already triggered
  setTimeout(() => {
    if (currentPhase < 3) {
      console.warn('[StartupLifecycle] Failsafe: Advancing to Phase 3');
      setStartupPhase(3);
    }
  }, 6000);
}
