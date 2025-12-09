'use client';

import { useHints } from './HintsProvider';

export function HintToggle() {
  const { hintsEnabled, toggleHints, resetDismissedHints } = useHints();

  const handleClick = () => {
    if (!hintsEnabled) {
      // When enabling hints, also reset dismissed hints so they show again
      resetDismissedHints();
    }
    toggleHints();
  };

  return (
    <button
      onClick={handleClick}
      className={`relative rounded-lg p-2 transition-all ${
        hintsEnabled
          ? 'bg-primary/10 text-primary hover:bg-primary/20'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      }`}
      title={hintsEnabled ? 'Hints enabled - click to disable' : 'Hints disabled - click to enable'}
      aria-label={hintsEnabled ? 'Disable hints' : 'Enable hints'}
    >
      {/* Lightbulb icon */}
      <svg
        className="size-5"
        viewBox="0 0 24 24"
        fill={hintsEnabled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
        <path d="M9 18h6" />
        <path d="M10 22h4" />
      </svg>

      {/* Active indicator dot */}
      {hintsEnabled && (
        <span className="absolute -right-0.5 -top-0.5 flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex size-2 rounded-full bg-primary" />
        </span>
      )}
    </button>
  );
}
