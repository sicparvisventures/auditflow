import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { getAudits, getLocations, type AuditFilters } from '@/actions/supabase';
import { FilterBar } from '@/components/filters';
import { buttonVariants } from '@/components/ui/buttonVariants';
import { TitleBar } from '@/features/dashboard/TitleBar';
import { AuditsPageHints } from '@/features/hints';

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/30',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30',
};

const statusLabels: Record<string, string> = {
  draft: 'Draft',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

type Props = {
  searchParams: { [key: string]: string | string[] | undefined };
};

export default async function AuditsPage({ searchParams }: Props) {
  const t = await getTranslations('Audits');
  
  // Get locations for filter dropdown
  const locations = await getLocations();
  
  // Parse search params into filters
  const filters: AuditFilters = {
    status: searchParams.status as string,
    locationId: searchParams.location as string,
    dateFrom: searchParams.dateFrom as string,
    dateTo: searchParams.dateTo as string,
    search: searchParams.search as string,
    passed: searchParams.passed as string,
  };
  
  const audits = await getAudits(filters);

  // Build filter config
  const filterConfig = [
    {
      key: 'search',
      label: 'Search',
      type: 'search' as const,
      placeholder: 'Search audits...',
    },
    {
      key: 'status',
      label: 'Status',
      type: 'select' as const,
      placeholder: 'All statuses',
      options: [
        { value: 'draft', label: 'Draft' },
        { value: 'in_progress', label: 'In Progress' },
        { value: 'completed', label: 'Completed' },
        { value: 'cancelled', label: 'Cancelled' },
      ],
    },
    {
      key: 'location',
      label: 'Location',
      type: 'select' as const,
      placeholder: 'All locations',
      options: locations.map(loc => ({
        value: loc.id,
        label: loc.name,
      })),
    },
    {
      key: 'passed',
      label: 'Result',
      type: 'select' as const,
      placeholder: 'All results',
      options: [
        { value: 'true', label: 'Passed' },
        { value: 'false', label: 'Failed' },
      ],
    },
    {
      key: 'dateFrom',
      label: 'From',
      type: 'date' as const,
      placeholder: 'From date',
    },
  ];

  return (
    <>
      <TitleBar
        title={t('title_bar')}
        description={t('title_bar_description')}
      />

      {/* Contextual Hints */}
      <AuditsPageHints hasAudits={audits.length > 0} />

      {/* Filters */}
      <FilterBar filters={filterConfig} />

      {/* Actions Bar */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-muted-foreground">
          {audits.length} {audits.length === 1 ? 'audit' : 'audits'}
          {Object.values(filters).some(v => v && v !== 'all') && ' (filtered)'}
        </div>
        <Link
          href="/dashboard/audits/new"
          className={buttonVariants({ size: 'sm' })}
        >
          <svg
            className="mr-2 size-4"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          {t('new_audit')}
        </Link>
      </div>

      {/* Audits List */}
      {audits.length > 0 ? (
        <div className="space-y-4">
          {audits.map(audit => (
            <Link
              key={audit.id}
              href={`/dashboard/audits/${audit.id}`}
              className="group flex items-center gap-4 rounded-lg border border-border bg-card p-4 shadow-sm transition-all hover:border-primary hover:shadow-md"
            >
              {/* Score Circle */}
              <div
                className={`flex size-14 shrink-0 items-center justify-center rounded-full text-lg font-bold ${
                  audit.status === 'completed'
                    ? audit.passed
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30'
                      : 'bg-red-100 text-red-700 dark:bg-red-900/30'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {audit.status === 'completed' ? `${Math.round(audit.pass_percentage)}%` : '--'}
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="truncate font-medium group-hover:text-primary">
                    {audit.location?.name || 'Unknown Location'}
                  </h3>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[audit.status]}`}>
                    {statusLabels[audit.status]}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {new Date(audit.audit_date).toLocaleDateString('nl-NL', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                  {audit.template && ` • ${audit.template.name}`}
                </p>
              </div>

              {/* Arrow */}
              <svg
                className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </Link>
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="rounded-lg border border-border bg-card p-12 text-center shadow-sm">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-muted">
            <svg
              className="size-8 text-muted-foreground"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
              <rect x="9" y="3" width="6" height="4" rx="2" />
              <path d="M9 12h6" />
              <path d="M9 16h6" />
            </svg>
          </div>
          <h3 className="mb-2 text-lg font-semibold">
            {Object.values(filters).some(v => v && v !== 'all') 
              ? 'No matching audits' 
              : t('no_audits')}
          </h3>
          <p className="mb-6 text-muted-foreground">
            {Object.values(filters).some(v => v && v !== 'all')
              ? 'Try adjusting your filters'
              : t('start_audit')}
          </p>
          <Link href="/dashboard/audits/new" className={buttonVariants()}>
            {t('new_audit')}
          </Link>
        </div>
      )}
    </>
  );
}
