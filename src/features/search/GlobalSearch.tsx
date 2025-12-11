'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { globalSearch } from '@/actions/search';

type SearchResult = {
  id: string;
  type: 'audit' | 'action' | 'location' | 'template';
  title: string;
  subtitle: string;
  url: string;
  status?: string;
  score?: number;
};

export function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // Keyboard shortcut to open search (Cmd+K or Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Search when query changes
  useEffect(() => {
    if (query.length >= 2) {
      startTransition(async () => {
        const searchResults = await globalSearch(query);
        setResults(searchResults);
        setSelectedIndex(0);
      });
    } else {
      setResults([]);
    }
  }, [query]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      router.push(results[selectedIndex].url);
      setIsOpen(false);
      setQuery('');
    }
  }, [results, selectedIndex, router]);

  // Close when clicking outside
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setIsOpen(false);
      setQuery('');
    }
  }, []);

  // Get icon for result type
  const getTypeIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'audit':
        return (
          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
            <rect x="9" y="3" width="6" height="4" rx="2" />
          </svg>
        );
      case 'action':
        return (
          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        );
      case 'location':
        return (
          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 21h18" />
            <path d="M5 21V7l8-4v18" />
            <path d="M19 21V11l-6-4" />
          </svg>
        );
      case 'template':
        return (
          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <line x1="3" y1="9" x2="21" y2="9" />
            <line x1="9" y1="21" x2="9" y2="9" />
          </svg>
        );
    }
  };

  // Get status color
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'completed':
      case 'verified':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30';
      case 'in_progress':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30';
      case 'active':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800';
    }
  };

  return (
    <>
      {/* Search Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted"
      >
        <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <span className="hidden sm:inline">Search...</span>
        <kbd className="hidden rounded border border-border bg-background px-1.5 py-0.5 text-xs sm:inline">
          ⌘K
        </kbd>
      </button>

      {/* Search Modal */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-[15vh]"
          onClick={handleBackdropClick}
        >
          <div className="w-full max-w-lg overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
            {/* Search Input */}
            <div className="flex items-center gap-3 border-b border-border p-4">
              <svg className="size-5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search audits, actions, locations..."
                className="flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
                autoFocus
              />
              {isPending && (
                <div className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              )}
              <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div className="max-h-[60vh] overflow-y-auto">
              {query.length >= 2 && results.length === 0 && !isPending && (
                <div className="p-8 text-center text-muted-foreground">
                  <svg className="mx-auto mb-3 size-12 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <p>No results found for &ldquo;{query}&rdquo;</p>
                </div>
              )}

              {results.length > 0 && (
                <div className="py-2">
                  {results.map((result, index) => (
                    <Link
                      key={`${result.type}-${result.id}`}
                      href={result.url}
                      onClick={() => {
                        setIsOpen(false);
                        setQuery('');
                      }}
                      className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                        index === selectedIndex ? 'bg-muted' : 'hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        {getTypeIcon(result.type)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-medium">{result.title}</span>
                          {result.status && (
                            <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(result.status)}`}>
                              {result.status}
                            </span>
                          )}
                          {result.score !== undefined && (
                            <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                              result.score >= 70 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {result.score}%
                            </span>
                          )}
                        </div>
                        <p className="truncate text-sm text-muted-foreground">{result.subtitle}</p>
                      </div>
                      <span className="shrink-0 text-xs capitalize text-muted-foreground">
                        {result.type}
                      </span>
                    </Link>
                  ))}
                </div>
              )}

              {query.length < 2 && (
                <div className="p-4">
                  <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Quick Links
                  </p>
                  <div className="space-y-1">
                    <Link
                      href="/dashboard/audits/new"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted"
                    >
                      <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="12" y1="5" x2="12" y2="19" />
                          <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                      </div>
                      <span>Start New Audit</span>
                    </Link>
                    <Link
                      href="/dashboard/actions?status=pending"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted"
                    >
                      <div className="flex size-8 items-center justify-center rounded-lg bg-yellow-100 text-yellow-700">
                        <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                      </div>
                      <span>Pending Actions</span>
                    </Link>
                    <Link
                      href="/dashboard/analytics"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted"
                    >
                      <div className="flex size-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                        <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 3v18h18" />
                          <path d="M7 16l4-8 4 4 4-8" />
                        </svg>
                      </div>
                      <span>View Analytics</span>
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-border px-4 py-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <span>↑↓ Navigate</span>
                <span>↵ Select</span>
              </div>
              <span>Type at least 2 characters to search</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
