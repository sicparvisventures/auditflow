'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useState, useTransition } from 'react';

type FilterOption = {
  value: string;
  label: string;
};

type FilterConfig = {
  key: string;
  label: string;
  type: 'select' | 'date' | 'search';
  options?: FilterOption[];
  placeholder?: string;
};

type FilterBarProps = {
  filters: FilterConfig[];
  className?: string;
};

export function FilterBar({ filters, className = '' }: FilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [isExpanded, setIsExpanded] = useState(false);

  const createQueryString = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === '' || value === 'all') {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });
      
      return params.toString();
    },
    [searchParams]
  );

  const handleFilterChange = (key: string, value: string) => {
    startTransition(() => {
      const queryString = createQueryString({ [key]: value });
      router.push(`${pathname}${queryString ? `?${queryString}` : ''}`);
    });
  };

  const clearAllFilters = () => {
    startTransition(() => {
      router.push(pathname);
    });
  };

  const activeFilterCount = filters.reduce((count, filter) => {
    const value = searchParams.get(filter.key);
    return value && value !== 'all' ? count + 1 : count;
  }, 0);

  return (
    <div className={`mb-6 ${className}`}>
      {/* Mobile Filter Toggle */}
      <div className="flex items-center justify-between gap-3 md:hidden">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
            activeFilterCount > 0
              ? 'border-primary bg-primary/5 text-primary'
              : 'border-border bg-card hover:bg-muted'
          }`}
        >
          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          Filters
          {activeFilterCount > 0 && (
            <span className="flex size-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
              {activeFilterCount}
            </span>
          )}
        </button>
        
        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={clearAllFilters}
            className="rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium hover:bg-muted"
          >
            Clear
          </button>
        )}
      </div>

      {/* Filter Content - Mobile Expandable / Desktop Always Visible */}
      <div className={`${isExpanded ? 'mt-4 block' : 'hidden'} md:block`}>
        <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
          {filters.map((filter) => (
            <div key={filter.key} className="flex-1 md:max-w-[200px]">
              {filter.type === 'select' && filter.options && (
                <select
                  value={searchParams.get(filter.key) || 'all'}
                  onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                  disabled={isPending}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm transition-colors hover:bg-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                >
                  <option value="all">{filter.placeholder || `All ${filter.label}`}</option>
                  {filter.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              )}

              {filter.type === 'date' && (
                <input
                  type="date"
                  value={searchParams.get(filter.key) || ''}
                  onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                  disabled={isPending}
                  placeholder={filter.placeholder}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm transition-colors hover:bg-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                />
              )}

              {filter.type === 'search' && (
                <div className="relative">
                  <svg
                    className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    type="text"
                    value={searchParams.get(filter.key) || ''}
                    onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                    disabled={isPending}
                    placeholder={filter.placeholder || `Search ${filter.label}...`}
                    className="w-full rounded-lg border border-border bg-card py-2.5 pl-10 pr-3 text-sm transition-colors hover:bg-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                  />
                </div>
              )}
            </div>
          ))}

          {/* Desktop Clear Button */}
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={clearAllFilters}
              disabled={isPending}
              className="hidden items-center gap-1 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground md:flex"
            >
              <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              Clear filters
            </button>
          )}
        </div>

        {/* Active Filters Pills (Mobile) */}
        {activeFilterCount > 0 && (
          <div className="mt-3 flex flex-wrap gap-2 md:hidden">
            {filters.map((filter) => {
              const value = searchParams.get(filter.key);
              if (!value || value === 'all') return null;
              
              const label = filter.options?.find(o => o.value === value)?.label || value;
              
              return (
                <span
                  key={filter.key}
                  className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                >
                  {filter.label}: {label}
                  <button
                    type="button"
                    onClick={() => handleFilterChange(filter.key, '')}
                    className="ml-1 hover:text-primary/70"
                  >
                    <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Loading indicator */}
      {isPending && (
        <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
          <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          Updating...
        </div>
      )}
    </div>
  );
}
