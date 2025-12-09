import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { getAudit } from '@/actions/supabase';
import { TitleBar } from '@/features/dashboard/TitleBar';
import { AuditDetailHints } from '@/features/hints';

import { DownloadPdfButton } from './DownloadPdfButton';

type Props = {
  params: { id: string; locale: string };
};

type AuditStatus = 'draft' | 'in_progress' | 'completed' | 'cancelled';
type ActionStatus = 'pending' | 'in_progress' | 'completed' | 'verified' | 'rejected';

const statusColors: Record<AuditStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

const statusLabels: Record<AuditStatus, string> = {
  draft: 'Draft',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const actionStatusColors: Record<ActionStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  verified: 'bg-purple-100 text-purple-700',
  rejected: 'bg-red-100 text-red-700',
};

export default async function AuditDetailPage({ params }: Props) {
  const t = await getTranslations('AuditDetail');
  const audit = await getAudit(params.id);

  if (!audit) {
    notFound();
  }

  // Group results by category
  const resultsByCategory: Record<string, any[]> = {};
  audit.results?.forEach((result: any) => {
    const categoryName = result.template_item?.category?.name || 'Uncategorized';
    if (!resultsByCategory[categoryName]) {
      resultsByCategory[categoryName] = [];
    }
    resultsByCategory[categoryName].push(result);
  });

  const resultColors = {
    pass: 'text-green-600',
    fail: 'text-red-600',
    na: 'text-gray-400',
  };

  // Get inspector name
  const inspectorName = audit.inspector 
    ? `${audit.inspector.first_name || ''} ${audit.inspector.last_name || ''}`.trim() || audit.inspector.email
    : 'Unknown';

  // Count results
  const passedCount = audit.results?.filter((r: any) => r.result === 'pass').length || 0;
  const failedCount = audit.results?.filter((r: any) => r.result === 'fail').length || 0;
  const naCount = audit.results?.filter((r: any) => r.result === 'na').length || 0;

  return (
    <>
      <TitleBar
        title={audit.location?.name || 'Audit'}
        description={new Date(audit.audit_date).toLocaleDateString('nl-NL', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}
      />

      {/* Contextual Hints */}
      <AuditDetailHints status={audit.status} />

      <div className="mx-auto max-w-3xl space-y-6">
        {/* Summary Card */}
        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className={`rounded-full px-3 py-1 text-sm font-medium ${statusColors[audit.status as AuditStatus]}`}>
                {statusLabels[audit.status as AuditStatus]}
              </span>
              {audit.status === 'completed' && (
                audit.passed ? (
                  <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
                    {t('passed')}
                  </span>
                ) : (
                  <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-700">
                    {t('failed')}
                  </span>
                )
              )}
            </div>
            <div className="flex gap-2">
              <DownloadPdfButton audit={audit} />
            </div>
          </div>

          {/* Score Display */}
          {audit.status === 'completed' && (
            <div className="mb-6 flex items-center justify-center">
              <div className="relative">
                <svg className="size-32" viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="hsl(var(--muted))"
                    strokeWidth="3"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke={audit.passed ? 'hsl(142, 76%, 36%)' : 'hsl(0, 84%, 60%)'}
                    strokeWidth="3"
                    strokeDasharray={`${audit.pass_percentage}, 100`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold">{Math.round(audit.pass_percentage)}%</span>
                  <span className="text-sm text-muted-foreground">{t('score')}</span>
                </div>
              </div>
            </div>
          )}

          {/* Results Summary */}
          <div className="mb-6 grid grid-cols-3 gap-4 text-center">
            <div className="rounded-lg bg-green-50 p-3 dark:bg-green-900/20">
              <div className="text-2xl font-bold text-green-600">{passedCount}</div>
              <div className="text-sm text-muted-foreground">Passed</div>
            </div>
            <div className="rounded-lg bg-red-50 p-3 dark:bg-red-900/20">
              <div className="text-2xl font-bold text-red-600">{failedCount}</div>
              <div className="text-sm text-muted-foreground">Failed</div>
            </div>
            <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
              <div className="text-2xl font-bold text-gray-600">{naCount}</div>
              <div className="text-sm text-muted-foreground">N/A</div>
            </div>
          </div>

          {/* Meta Info */}
          <div className="grid gap-4 border-t border-border pt-4 text-sm sm:grid-cols-2">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
                <svg className="size-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <div>
                <p className="text-muted-foreground">{t('inspector')}</p>
                <p className="font-medium">{inspectorName}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
                <svg className="size-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                  <rect x="9" y="3" width="6" height="4" rx="2" />
                </svg>
              </div>
              <div>
                <p className="text-muted-foreground">{t('template')}</p>
                <p className="font-medium">{audit.template?.name || '-'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
                <svg className="size-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 21h18" />
                  <path d="M5 21V7l8-4v18" />
                  <path d="M19 21V11l-6-4" />
                </svg>
              </div>
              <div>
                <p className="text-muted-foreground">{t('location')}</p>
                <p className="font-medium">{audit.location?.name || '-'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
                <svg className="size-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <div>
                <p className="text-muted-foreground">Completed</p>
                <p className="font-medium">
                  {audit.completed_at 
                    ? new Date(audit.completed_at).toLocaleString('nl-NL')
                    : 'In Progress'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions Created */}
        {audit.actions && audit.actions.length > 0 && (
          <div className="rounded-lg border border-border bg-card shadow-sm">
            <div className="flex items-center justify-between border-b border-border p-4">
              <h3 className="font-semibold">Actions Created ({audit.actions.length})</h3>
              <Link href="/dashboard/actions" className="text-sm text-primary hover:underline">
                View all actions
              </Link>
            </div>
            <div className="divide-y divide-border">
              {audit.actions.map((action: any) => (
                <Link
                  key={action.id}
                  href={`/dashboard/actions/${action.id}`}
                  className="flex items-center gap-3 p-4 transition-colors hover:bg-muted"
                >
                  <span className={`size-3 rounded-full ${
                    action.urgency === 'critical' ? 'bg-red-500' :
                    action.urgency === 'high' ? 'bg-orange-500' :
                    action.urgency === 'medium' ? 'bg-yellow-500' : 'bg-gray-400'
                  }`} />
                  <span className="flex-1 font-medium">{action.title}</span>
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${actionStatusColors[action.status as ActionStatus]}`}>
                    {action.status}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Results by Category */}
        {Object.entries(resultsByCategory).map(([categoryName, items]) => (
          <div key={categoryName} className="rounded-lg border border-border bg-card shadow-sm">
            <div className="flex items-center justify-between border-b border-border p-4">
              <h3 className="font-semibold">{categoryName}</h3>
              <span className="text-sm text-muted-foreground">
                {items.filter((i: any) => i.result === 'pass').length}/{items.filter((i: any) => i.result !== 'na').length} passed
              </span>
            </div>

            <div className="divide-y divide-border">
              {items.map((item: any) => (
                <div key={item.id} className="flex items-center gap-4 p-4">
                  {/* Result Icon */}
                  <div className={resultColors[item.result as keyof typeof resultColors]}>
                    {item.result === 'pass' ? (
                      <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : item.result === 'fail' ? (
                      <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    ) : (
                      <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    )}
                  </div>

                  {/* Item Title */}
                  <div className="flex-1">
                    <span>{item.template_item?.title || 'Unknown Item'}</span>
                    {item.comments && (
                      <p className="text-sm text-muted-foreground">{item.comments}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Empty state if no results */}
        {(!audit.results || audit.results.length === 0) && (
          <div className="rounded-lg border border-border bg-card p-8 text-center shadow-sm">
            <p className="text-muted-foreground">No results recorded yet</p>
            {audit.status === 'in_progress' && (
              <Link
                href={`/dashboard/audits/new?continue=${audit.id}`}
                className={buttonVariants({ className: 'mt-4' })}
              >
                Continue Audit
              </Link>
            )}
          </div>
        )}

        {/* Back Button */}
        <Link
          href="/dashboard/audits"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          {t('back_to_audits')}
        </Link>
      </div>
    </>
  );
}
