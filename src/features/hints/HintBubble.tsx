'use client';

import { useEffect, useState } from 'react';

import { useHints } from './HintsProvider';

type HintBubbleProps = {
  id: string;
  title: string;
  message: string;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  delay?: number;
  icon?: 'lightbulb' | 'info' | 'arrow' | 'star';
};

export function HintBubble({
  id,
  title,
  message,
  position = 'bottom-right',
  delay = 500,
  icon = 'lightbulb',
}: HintBubbleProps) {
  const { hintsEnabled, isHintDismissed, dismissHint } = useHints();
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (!hintsEnabled || isHintDismissed(id)) {
      setIsVisible(false);
      return;
    }

    const showTimer = setTimeout(() => {
      setIsVisible(true);
      setTimeout(() => setIsAnimating(true), 50);
    }, delay);

    return () => clearTimeout(showTimer);
  }, [hintsEnabled, isHintDismissed, id, delay]);

  const handleDismiss = () => {
    setIsAnimating(false);
    setTimeout(() => {
      setIsVisible(false);
      dismissHint(id);
    }, 300);
  };

  if (!isVisible) return null;

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-24 left-4 md:bottom-4',
    'bottom-right': 'bottom-24 right-4 md:bottom-4',
    'center': 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
  };

  const icons = {
    lightbulb: (
      <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
        <path d="M9 18h6" />
        <path d="M10 22h4" />
      </svg>
    ),
    info: (
      <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4" />
        <path d="M12 8h.01" />
      </svg>
    ),
    arrow: (
      <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14" />
        <path d="m12 5 7 7-7 7" />
      </svg>
    ),
    star: (
      <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  };

  return (
    <div
      className={`fixed z-50 ${positionClasses[position]} transition-all duration-300 ${
        isAnimating
          ? 'translate-y-0 scale-100 opacity-100'
          : 'translate-y-4 scale-95 opacity-0'
      }`}
    >
      <div className="relative max-w-sm overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background shadow-lg backdrop-blur-sm">
        {/* Animated glow effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 opacity-50" />
        
        {/* Pulsing indicator */}
        <div className="absolute -right-1 -top-1">
          <span className="relative flex size-3">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex size-3 rounded-full bg-primary" />
          </span>
        </div>

        <div className="relative p-4">
          {/* Header */}
          <div className="mb-2 flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 text-primary">
              {icons[icon]}
              <span className="text-sm font-semibold">{title}</span>
            </div>
            <button
              onClick={handleDismiss}
              className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Dismiss hint"
            >
              <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>

          {/* Message */}
          <p className="text-sm leading-relaxed text-muted-foreground">
            {message}
          </p>

          {/* Got it button */}
          <button
            onClick={handleDismiss}
            className="mt-3 w-full rounded-lg bg-primary/10 px-3 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
          >
            Got it! 👍
          </button>
        </div>
      </div>
    </div>
  );
}
