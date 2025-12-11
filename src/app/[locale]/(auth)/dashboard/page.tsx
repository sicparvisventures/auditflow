import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { getActions, getAudits, getDashboardStats, getMyActions } from '@/actions/supabase';
import { getPendingScheduledInstances } from '@/actions/scheduled-audits';
import { AdminOnly } from '@/components/AdminOnly';
import { buttonVariants } from '@/components/ui/buttonVariants';
import { TitleBar } from '@/features/dashboard/TitleBar';
import { DashboardHomeHints } from '@/features/hints';

export default async function DashboardIndexPage() {
  const t = await getTranslations('DashboardIndex');
  
  // Fetch real data from Supabase
  const [stats, recentAudits, pendingActions, myActions, upcomingAudits] = await Promise.all([
    getDashboardStats(),
    getAudits(),
    getActions({ status: 'pending' }),
    getMyActions(5),
    getPendingScheduledInstances(),
  ]);

  const hasData = stats.locationsCount > 0 || stats.totalAudits > 0;
  const hasOverdue = (stats.overdueActions ?? 0) > 0;
  const hasDueSoon = (stats.actionsDueSoon ?? 0) > 0;

  return (
    <AdminOnly>
      <TitleBar
        title={t('title_bar')}
        description={t('title_bar_description')}
      />

      {/* Contextual Hints */}
      <DashboardHomeHints hasData={hasData} />

      {/* Urgent Alert - Overdue Actions */}
      {hasOverdue && (
        <Link 
          href="/dashboard/actions?overdue=true"
          className="mb-6 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 transition-colors hover:bg-red-100 dark:border-red-900 dark:bg-red-950/50 dark:hover:bg-red-950"
        >
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
            <svg className="size-5 text-red-600 dark:text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-red-800 dark:text-red-200">
              {stats.overdueActions ?? 0} {(stats.overdueActions ?? 0) === 1 ? 'overdue action' : 'overdue actions'}
            </p>
            <p className="text-sm text-red-600 dark:text-red-400">Requires immediate attention</p>
          </div>
          <svg className="size-5 shrink-0 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </Link>
      )}

      {/* Warning - Actions Due Soon */}
      {hasDueSoon && !hasOverdue && (
        <Link 
          href="/dashboard/actions"
          className="mb-6 flex items-center gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-4 transition-colors hover:bg-yellow-100 dark:border-yellow-900 dark:bg-yellow-950/50 dark:hover:bg-yellow-950"
        >
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900">
            <svg className="size-5 text-yellow-600 dark:text-yellow-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-yellow-800 dark:text-yellow-200">
              {stats.actionsDueSoon ?? 0} {(stats.actionsDueSoon ?? 0) === 1 ? 'action' : 'actions'} due this week
            </p>
            <p className="text-sm text-yellow-600 dark:text-yellow-400">Complete before deadline</p>
          </div>
          <svg className="size-5 shrink-0 text-yellow-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </Link>
      )}

      {/* KPI Cards - Enhanced */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <KPICard
          title={t('kpi_total_audits')}
          value={stats.totalAudits.toString()}
          subtitle={(stats.auditsThisMonth ?? 0) > 0 ? `${stats.auditsThisMonth} this month` : undefined}
        />
        <KPICard
          title={t('kpi_pass_rate')}
          value={stats.totalAudits > 0 ? `${stats.passRate}%` : '-%'}
          color={stats.passRate >= 70 ? 'success' : stats.passRate > 0 ? 'warning' : 'default'}
          trend={stats.scoreTrend ?? 0}
        />
        <KPICard
          title={t('kpi_open_actions')}
          value={stats.openActions.toString()}
          color={(stats.overdueActions ?? 0) > 0 ? 'danger' : stats.openActions > 5 ? 'warning' : 'default'}
          subtitle={(stats.overdueActions ?? 0) > 0 ? `${stats.overdueActions} overdue` : undefined}
        />
        <KPICard
          title={t('kpi_locations')}
          value={stats.locationsCount.toString()}
        />
      </div>

      {/* Welcome Message for New Users */}
      {!hasData && (
        <div className="rounded-lg border border-border bg-card p-6 text-center shadow-sm">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-primary/10">
            <svg className="size-8 text-primary" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
              <rect x="9" y="3" width="6" height="4" rx="2" />
              <path d="m9 14 2 2 4-4" />
            </svg>
          </div>
          <h3 className="mb-2 text-xl font-semibold">{t('welcome_title')}</h3>
          <p className="mb-6 text-muted-foreground">{t('welcome_description')}</p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/dashboard/locations/new"
              className={buttonVariants({ variant: 'outline' })}
            >
              {t('create_first_location')}
            </Link>
            <Link
              href="/dashboard/audits/new"
              className={buttonVariants()}
            >
              {t('create_first_audit')}
            </Link>
          </div>
        </div>
      )}

      {/* Upcoming Scheduled Audits */}
      {upcomingAudits.length > 0 && (
        <div className="mb-6 rounded-lg border border-primary/20 bg-primary/5 p-4">
          <div className="mb-3 flex items-center gap-2">
            <svg className="size-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <h3 className="font-semibold text-primary">Upcoming Audits</h3>
          </div>
          <div className="space-y-2">
            {upcomingAudits.slice(0, 3).map(({ instance, scheduledAudit }) => (
              <div 
                key={instance.id}
                className="flex items-center justify-between rounded-lg bg-background p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{scheduledAudit.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {scheduledAudit.location?.name} • Due {new Date(instance.due_date).toLocaleDateString('nl-NL')}
                  </p>
                </div>
                <Link
                  href={`/dashboard/audits/new?locationId=${scheduledAudit.location_id}&templateId=${scheduledAudit.template_id}`}
                  className={buttonVariants({ size: 'sm' })}
                >
                  Start
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity Section */}
      {hasData && (
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
          {/* My Actions (assigned to current user) */}
          {myActions.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-4 shadow-sm sm:p-6 lg:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg className="size-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <h3 className="font-semibold">My Actions</h3>
                </div>
                <Link href="/dashboard/actions?assigned=me" className="text-sm text-primary hover:underline">
                  {t('view_all')}
                </Link>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {myActions.map(action => {
                  const isOverdue = action.deadline && new Date(action.deadline) < new Date();
                  return (
                    <Link
                      key={action.id}
                      href={`/dashboard/actions/${action.id}`}
                      className={`flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted ${
                        isOverdue ? 'border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/30' : 'border-border'
                      }`}
                    >
                      <span className={`size-2.5 shrink-0 rounded-full ${
                        action.urgency === 'critical' ? 'bg-red-500' :
                        action.urgency === 'high' ? 'bg-orange-500' :
                        action.urgency === 'medium' ? 'bg-yellow-500' : 'bg-gray-400'
                      }`} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{action.title}</p>
                        <p className={`text-xs ${isOverdue ? 'font-medium text-red-600' : 'text-muted-foreground'}`}>
                          {isOverdue ? 'Overdue' : action.deadline 
                            ? `Due ${new Date(action.deadline).toLocaleDateString('nl-NL')}` 
                            : 'No deadline'}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recent Audits */}
          <div className="rounded-lg border border-border bg-card p-4 shadow-sm sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold">{t('recent_audits')}</h3>
              <Link href="/dashboard/audits" className="text-sm text-primary hover:underline">
                {t('view_all')}
              </Link>
            </div>
            {recentAudits.length > 0 ? (
              <div className="space-y-2">
                {recentAudits.slice(0, 5).map(audit => (
                  <Link
                    key={audit.id}
                    href={`/dashboard/audits/${audit.id}`}
                    className="flex items-center justify-between rounded-lg p-2.5 transition-colors hover:bg-muted sm:p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{audit.location?.name || 'Unknown Location'}</p>
                      <p className="text-xs text-muted-foreground sm:text-sm">
                        {new Date(audit.audit_date).toLocaleDateString('nl-NL')}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium ${
                      audit.status === 'completed'
                        ? audit.passed
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30'
                    }`}>
                      {audit.status === 'completed' ? `${Math.round(audit.pass_percentage)}%` : 'In Progress'}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex h-32 items-center justify-center text-muted-foreground">
                <p>{t('no_audits')}</p>
              </div>
            )}
          </div>

          {/* Pending Actions */}
          <div className="rounded-lg border border-border bg-card p-4 shadow-sm sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold">{t('pending_actions')}</h3>
              <Link href="/dashboard/actions" className="text-sm text-primary hover:underline">
                {t('view_all')}
              </Link>
            </div>
            {pendingActions.length > 0 ? (
              <div className="space-y-2">
                {pendingActions.slice(0, 5).map(action => {
                  const isOverdue = action.deadline && new Date(action.deadline) < new Date();
                  return (
                  <Link
                    key={action.id}
                    href={`/dashboard/actions/${action.id}`}
                      className="flex items-center justify-between rounded-lg p-2.5 transition-colors hover:bg-muted sm:p-3"
                  >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{action.title}</p>
                        <p className={`text-xs sm:text-sm ${isOverdue ? 'font-medium text-red-600' : 'text-muted-foreground'}`}>
                          {action.location?.name}
                          {action.deadline && ` • ${isOverdue ? 'Overdue' : new Date(action.deadline).toLocaleDateString('nl-NL')}`}
                        </p>
                    </div>
                      <span className={`size-2.5 shrink-0 rounded-full ${
                      action.urgency === 'critical' ? 'bg-red-500' :
                      action.urgency === 'high' ? 'bg-orange-500' :
                      action.urgency === 'medium' ? 'bg-yellow-500' : 'bg-gray-400'
                    }`} />
                  </Link>
                  );
                })}
              </div>
            ) : (
              <div className="flex h-32 items-center justify-center text-muted-foreground">
                <p>{t('no_actions')}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      {hasData && (
        <div className="mt-6 flex flex-wrap gap-2 sm:gap-3">
          <Link
            href="/dashboard/audits/new"
            className={buttonVariants({ size: 'sm' })}
          >
            <svg className="mr-1.5 size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
              <rect x="9" y="3" width="6" height="4" rx="2" />
            </svg>
            New Audit
          </Link>
          <Link
            href="/dashboard/analytics"
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            <svg className="mr-1.5 size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3v18h18" />
              <path d="M7 16l4-8 4 4 4-8" />
            </svg>
            View Analytics
          </Link>
          <Link
            href="/dashboard/reports"
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            <svg className="mr-1.5 size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            Reports
          </Link>
        </div>
      )}
    </AdminOnly>
  );
}

// KPI Card Component
function KPICard({
  title,
  value,
  color = 'default',
  trend,
  subtitle,
}: {
  title: string;
  value: string;
  color?: 'default' | 'success' | 'warning' | 'danger';
  trend?: number;
  subtitle?: string;
}) {
  const colorClasses = {
    default: '',
    success: 'text-green-600 dark:text-green-500',
    warning: 'text-yellow-600 dark:text-yellow-500',
    danger: 'text-red-600 dark:text-red-500',
  };

  return (
    <div className="rounded-lg border border-border bg-card p-3 shadow-sm sm:p-4">
      <div className="flex items-start justify-between gap-2">
        <div className={`text-xl font-bold sm:text-2xl ${colorClasses[color]}`}>{value}</div>
        {trend !== undefined && trend !== 0 && (
          <div className={`flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium ${
            trend > 0 
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
          }`}>
            {trend > 0 ? (
              <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="18 15 12 9 6 15" />
              </svg>
            ) : (
              <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            )}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div className="mt-0.5 text-xs text-muted-foreground">{title}</div>
      {subtitle && (
        <div className={`mt-1 text-xs ${color === 'danger' ? 'font-medium text-red-600' : 'text-muted-foreground'}`}>
          {subtitle}
        </div>
      )}
    </div>
  );
}
