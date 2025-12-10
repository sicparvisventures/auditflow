import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { getActions, getAudits, getDashboardStats } from '@/actions/supabase';
import { buttonVariants } from '@/components/ui/buttonVariants';
import { TitleBar } from '@/features/dashboard/TitleBar';
import { DashboardHomeHints } from '@/features/hints';

export default async function DashboardIndexPage() {
  const t = await getTranslations('DashboardIndex');
  
  // Fetch real data from Supabase
  const [stats, recentAudits, pendingActions] = await Promise.all([
    getDashboardStats(),
    getAudits(),
    getActions({ status: 'pending' }),
  ]);

  const hasData = stats.locationsCount > 0 || stats.totalAudits > 0;

  return (
    <>
      <TitleBar
        title={t('title_bar')}
        description={t('title_bar_description')}
      />

      {/* Contextual Hints */}
      <DashboardHomeHints hasData={hasData} />

      {/* KPI Cards */}
      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        <KPICard
          title={t('kpi_total_audits')}
          value={stats.totalAudits.toString()}
        />
        <KPICard
          title={t('kpi_pass_rate')}
          value={stats.totalAudits > 0 ? `${stats.passRate}%` : '-%'}
          color={stats.passRate >= 70 ? 'success' : stats.passRate > 0 ? 'warning' : 'default'}
        />
        <KPICard
          title={t('kpi_open_actions')}
          value={stats.openActions.toString()}
          color={stats.openActions > 5 ? 'warning' : 'default'}
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

      {/* Recent Activity Section */}
      {hasData && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Recent Audits */}
          <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold">{t('recent_audits')}</h3>
              <Link href="/dashboard/audits" className="text-sm text-primary hover:underline">
                {t('view_all')}
              </Link>
            </div>
            {recentAudits.length > 0 ? (
              <div className="space-y-3">
                {recentAudits.slice(0, 5).map(audit => (
                  <Link
                    key={audit.id}
                    href={`/dashboard/audits/${audit.id}`}
                    className="flex items-center justify-between rounded-lg p-3 transition-colors hover:bg-muted"
                  >
                    <div>
                      <p className="font-medium">{audit.location?.name || 'Unknown Location'}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(audit.audit_date).toLocaleDateString('nl-NL')}
                      </p>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                      audit.status === 'completed'
                        ? audit.passed
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                        : 'bg-blue-100 text-blue-700'
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
          <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold">{t('pending_actions')}</h3>
              <Link href="/dashboard/actions" className="text-sm text-primary hover:underline">
                {t('view_all')}
              </Link>
            </div>
            {pendingActions.length > 0 ? (
              <div className="space-y-3">
                {pendingActions.slice(0, 5).map(action => (
                  <Link
                    key={action.id}
                    href={`/dashboard/actions/${action.id}`}
                    className="flex items-center justify-between rounded-lg p-3 transition-colors hover:bg-muted"
                  >
                    <div>
                      <p className="font-medium">{action.title}</p>
                      <p className="text-sm text-muted-foreground">{action.location?.name}</p>
                    </div>
                    <span className={`size-3 rounded-full ${
                      action.urgency === 'critical' ? 'bg-red-500' :
                      action.urgency === 'high' ? 'bg-orange-500' :
                      action.urgency === 'medium' ? 'bg-yellow-500' : 'bg-gray-400'
                    }`} />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex h-32 items-center justify-center text-muted-foreground">
                <p>{t('no_actions')}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// KPI Card Component
function KPICard({
  title,
  value,
  color = 'default',
}: {
  title: string;
  value: string;
  color?: 'default' | 'success' | 'warning' | 'danger';
}) {
  const colorClasses = {
    default: '',
    success: 'text-green-600',
    warning: 'text-yellow-600',
    danger: 'text-red-600',
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className={`text-2xl font-bold ${colorClasses[color]}`}>{value}</div>
      <div className="text-xs text-muted-foreground">{title}</div>
    </div>
  );
}
