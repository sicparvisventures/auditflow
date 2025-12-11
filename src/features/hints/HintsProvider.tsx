'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

type HintsContextType = {
  hintsEnabled: boolean;
  toggleHints: () => void;
  dismissHint: (hintId: string) => void;
  isHintDismissed: (hintId: string) => boolean;
  resetDismissedHints: () => void;
};

const HintsContext = createContext<HintsContextType | undefined>(undefined);

const HINTS_ENABLED_KEY = 'auditflow-hints-enabled';
const DISMISSED_HINTS_KEY = 'auditflow-dismissed-hints';

export function HintsProvider({ children }: { children: React.ReactNode }) {
  const [hintsEnabled, setHintsEnabled] = useState(true);
  const [dismissedHints, setDismissedHints] = useState<Set<string>>(new Set());
  const [isLoaded, setIsLoaded] = useState(false);

  // Load preferences from localStorage
  useEffect(() => {
    const storedEnabled = localStorage.getItem(HINTS_ENABLED_KEY);
    const storedDismissed = localStorage.getItem(DISMISSED_HINTS_KEY);

    if (storedEnabled !== null) {
      setHintsEnabled(storedEnabled === 'true');
    }

    if (storedDismissed) {
      try {
        const parsed = JSON.parse(storedDismissed);
        setDismissedHints(new Set(parsed));
      } catch {
        // Invalid JSON, ignore
      }
    }

    setIsLoaded(true);
  }, []);

  // Persist hintsEnabled
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(HINTS_ENABLED_KEY, String(hintsEnabled));
    }
  }, [hintsEnabled, isLoaded]);

  // Persist dismissedHints
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(
        DISMISSED_HINTS_KEY,
        JSON.stringify([...dismissedHints]),
      );
    }
  }, [dismissedHints, isLoaded]);

  const toggleHints = useCallback(() => {
    setHintsEnabled(prev => !prev);
  }, []);

  const dismissHint = useCallback((hintId: string) => {
    setDismissedHints(prev => new Set([...prev, hintId]));
  }, []);

  const isHintDismissed = useCallback(
    (hintId: string) => dismissedHints.has(hintId),
    [dismissedHints],
  );

  const resetDismissedHints = useCallback(() => {
    setDismissedHints(new Set());
  }, []);

  return (
    <HintsContext.Provider
      value={{
        hintsEnabled,
        toggleHints,
        dismissHint,
        isHintDismissed,
        resetDismissedHints,
      }}
    >
      {children}
    </HintsContext.Provider>
  );
}

export function useHints() {
  const context = useContext(HintsContext);
  if (context === undefined) {
    throw new Error('useHints must be used within a HintsProvider');
  }
  return context;
}



