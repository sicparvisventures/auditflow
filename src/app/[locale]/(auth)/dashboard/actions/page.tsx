import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { getActions } from '@/actions/supabase';
import { TitleBar } from '@/features/dashboard/TitleBar';
import { ActionsPageHints } from '@/features/hints';

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/30',
  verified: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30',
};

const statusLabels = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
  verified: 'Verified',
  rejected: 'Rejected',
};

const urgencyColors = {
  low: 'bg-gray-400',
  medium: 'bg-yellow-500',
  high: 'bg-orange-500',
  critical: 'bg-red-500',
};

export default async function ActionsPage() {
  const t = await getTranslations('Actions');
  const actions = await getActions();

  const pendingCount = actions.filter(a => a.status === 'pending').length;
  const inProgressCount = actions.filter(a => a.status === 'in_progress').length;
  const completedCount = actions.filter(a => a.status === 'completed' || a.status === 'verified').length;

  return (
    <>
      <TitleBar
        title={t('title_bar')}
        description={t('title_bar_description')}
      />

      {/* Contextual Hints */}
      <ActionsPageHints hasActions={actions.length > 0} />

      {/* Stats */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-border bg-card p-4 text-center shadow-sm">
          <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
          <div className="text-sm text-muted-foreground">{t('filter_pending')}</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 text-center shadow-sm">
          <div className="text-2xl font-bold text-blue-600">{inProgressCount}</div>
          <div className="text-sm text-muted-foreground">{t('filter_in_progress')}</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 text-center shadow-sm">
          <div className="text-2xl font-bold text-green-600">{completedCount}</div>
          <div className="text-sm text-muted-foreground">{t('filter_completed')}</div>
        </div>
      </div>

      {/* Actions List */}
      {actions.length > 0 ? (
        <div className="space-y-4">
          {actions.map(action => {
            const isOverdue = action.deadline && new Date(action.deadline) < new Date() && 
              !['verified', 'completed'].includes(action.status);

            return (
              <Link
                key={action.id}
                href={`/dashboard/actions/${action.id}`}
                className="group flex items-start gap-4 rounded-lg border border-border bg-card p-4 shadow-sm transition-all hover:border-primary hover:shadow-md"
              >
                {/* Urgency Indicator */}
                <div className={`mt-1.5 size-3 shrink-0 rounded-full ${urgencyColors[action.urgency]}`} />

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <h3 className="truncate font-medium group-hover:text-primary">{action.title}</h3>
                  </div>
                  <p className="mb-2 text-sm text-muted-foreground">
                    {action.location?.name || 'Unknown Location'}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[action.status]}`}>
                      {statusLabels[action.status]}
                    </span>
                    {action.deadline && (
                      <span className={`text-xs ${isOverdue ? 'font-medium text-destructive' : 'text-muted-foreground'}`}>
                        {isOverdue ? 'Overdue: ' : 'Due: '}
                        {new Date(action.deadline).toLocaleDateString('nl-NL')}
                      </span>
                    )}
                  </div>
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
            );
          })}
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
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <h3 className="mb-2 text-lg font-semibold">{t('no_actions')}</h3>
          <p className="text-muted-foreground">
            Actions will appear here when created from audit findings
          </p>
        </div>
      )}

      {/* Urgency Legend */}
      <div className="mt-8 flex flex-wrap justify-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="size-3 rounded-full bg-gray-400" />
          <span className="text-muted-foreground">{t('urgency_low')}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="size-3 rounded-full bg-yellow-500" />
          <span className="text-muted-foreground">{t('urgency_medium')}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="size-3 rounded-full bg-orange-500" />
          <span className="text-muted-foreground">{t('urgency_high')}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="size-3 rounded-full bg-red-500" />
          <span className="text-muted-foreground">{t('urgency_critical')}</span>
        </div>
      </div>
    </>
  );
}
