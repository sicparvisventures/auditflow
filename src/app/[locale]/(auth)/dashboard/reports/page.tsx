import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { getActions, getAudits, getDashboardStats, getLocations } from '@/actions/supabase';
import { TitleBar } from '@/features/dashboard/TitleBar';
import { ReportsPageHints } from '@/features/hints';

import { ExportReportButton } from './ExportReportButton';

export default async function ReportsPage() {
  const t = await getTranslations('Reports');
  
  // Fetch all data for reports
  const [audits, actions, locations, stats] = await Promise.all([
    getAudits(),
    getActions(),
    getLocations(),
    getDashboardStats(),
  ]);

  // Calculate additional stats
  const completedAudits = audits.filter(a => a.status === 'completed');
  const passedAudits = completedAudits.filter(a => a.passed);
  
  const pendingActions = actions.filter(a => a.status === 'pending');
  const completedActions = actions.filter(a => a.status === 'completed' || a.status === 'verified');

  // Audits by month (last 6 months)
  const monthlyStats = getMonthlyStats(audits);

  // Location performance
  const locationPerformance = getLocationPerformance(audits, locations);

  // Prepare data for export
  const reportData = {
    totalAudits: completedAudits.length,
    passRate: completedAudits.length > 0 
      ? Math.round((passedAudits.length / completedAudits.length) * 100) 
      : 0,
    openActions: pendingActions.length,
    locationsCount: locations.length,
    monthlyStats,
    locationPerformance,
  };

  return (
    <>
      <TitleBar
        title={t('title_bar')}
        description={t('title_bar_description')}
      />

      {/* Contextual Hints */}
      <ReportsPageHints />

      {/* Export Actions */}
      <div className="mb-6 flex justify-end">
        <ExportReportButton data={reportData} />
      </div>

      {/* Summary Stats */}
      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          title="Total Audits"
          value={completedAudits.length.toString()}
          icon={(
            <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
              <rect x="9" y="3" width="6" height="4" rx="2" />
            </svg>
          )}
        />
        <StatCard
          title="Pass Rate"
          value={completedAudits.length > 0 
            ? `${Math.round((passedAudits.length / completedAudits.length) * 100)}%` 
            : '-%'}
          color={stats.passRate >= 70 ? 'success' : stats.passRate > 0 ? 'warning' : 'default'}
          icon={(
            <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22,4 12,14.01 9,11.01" />
            </svg>
          )}
        />
        <StatCard
          title="Open Actions"
          value={pendingActions.length.toString()}
          color={pendingActions.length > 10 ? 'warning' : 'default'}
          icon={(
            <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12,6 12,12 16,14" />
            </svg>
          )}
        />
        <StatCard
          title="Locations"
          value={locations.length.toString()}
          icon={(
            <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 21h18" />
              <path d="M5 21V7l8-4v18" />
              <path d="M19 21V11l-6-4" />
            </svg>
          )}
        />
      </div>

      {/* Charts Row */}
      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        {/* Monthly Audits Chart */}
        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <h3 className="mb-4 font-semibold">Audits Over Time</h3>
          {monthlyStats.length > 0 ? (
            <div className="space-y-3">
              {monthlyStats.map(month => (
                <div key={month.month} className="flex items-center gap-4">
                  <span className="w-12 text-sm text-muted-foreground">{month.month}</span>
                  <div className="flex-1">
                    <div className="flex h-6 overflow-hidden rounded-full bg-muted">
                      <div
                        className="bg-green-500 transition-all"
                        style={{ width: `${month.total > 0 ? (month.passed / month.total) * 100 : 0}%` }}
                      />
                      <div
                        className="bg-red-500 transition-all"
                        style={{ width: `${month.total > 0 ? (month.failed / month.total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                  <span className="w-16 text-right text-sm font-medium">{month.total} audits</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-32 items-center justify-center text-muted-foreground">
              No audit data yet
            </div>
          )}
          <div className="mt-4 flex gap-4 text-xs">
            <span className="flex items-center gap-1">
              <span className="size-3 rounded-full bg-green-500" /> Passed
            </span>
            <span className="flex items-center gap-1">
              <span className="size-3 rounded-full bg-red-500" /> Failed
            </span>
          </div>
        </div>

        {/* Actions Overview */}
        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <h3 className="mb-4 font-semibold">Actions Overview</h3>
          {actions.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Pending</span>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-yellow-500"
                      style={{ width: `${(pendingActions.length / actions.length) * 100}%` }}
                    />
                  </div>
                  <span className="w-8 text-right font-medium">{pendingActions.length}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">In Progress</span>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-blue-500"
                      style={{ width: `${(actions.filter(a => a.status === 'in_progress').length / actions.length) * 100}%` }}
                    />
                  </div>
                  <span className="w-8 text-right font-medium">
                    {actions.filter(a => a.status === 'in_progress').length}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Completed</span>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-green-500"
                      style={{ width: `${(completedActions.length / actions.length) * 100}%` }}
                    />
                  </div>
                  <span className="w-8 text-right font-medium">{completedActions.length}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-32 items-center justify-center text-muted-foreground">
              No actions yet
            </div>
          )}
        </div>
      </div>

      {/* Location Performance */}
      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold">Location Performance</h3>
          <Link
            href="/dashboard/locations"
            className="text-sm text-primary hover:underline"
          >
            View all locations
          </Link>
        </div>
        
        {locationPerformance.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left text-sm text-muted-foreground">
                  <th className="pb-3 font-medium">Location</th>
                  <th className="pb-3 text-center font-medium">Audits</th>
                  <th className="pb-3 text-center font-medium">Pass Rate</th>
                  <th className="pb-3 text-center font-medium">Open Actions</th>
                  <th className="pb-3 text-center font-medium">Last Audit</th>
                </tr>
              </thead>
              <tbody>
                {locationPerformance.map(loc => (
                  <tr key={loc.id} className="border-b border-border last:border-0">
                    <td className="py-3">
                      <Link 
                        href={`/dashboard/locations/${loc.id}`}
                        className="font-medium hover:text-primary"
                      >
                        {loc.name}
                      </Link>
                    </td>
                    <td className="py-3 text-center">{loc.totalAudits}</td>
                    <td className="py-3 text-center">
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                        loc.passRate >= 70 
                          ? 'bg-green-100 text-green-700' 
                          : loc.passRate > 0 
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-600'
                      }`}>
                        {loc.passRate > 0 ? `${loc.passRate}%` : 'N/A'}
                      </span>
                    </td>
                    <td className="py-3 text-center">
                      {loc.openActions > 0 ? (
                        <span className="font-medium text-yellow-600">{loc.openActions}</span>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </td>
                    <td className="py-3 text-center text-sm text-muted-foreground">
                      {loc.lastAudit || 'Never'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex h-32 items-center justify-center text-muted-foreground">
            No locations yet
          </div>
        )}
      </div>
    </>
  );
}

// Helper components and functions
function StatCard({
  title,
  value,
  icon,
  color = 'default',
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  color?: 'default' | 'success' | 'warning';
}) {
  const colorClasses = {
    default: 'text-muted-foreground',
    success: 'text-green-500',
    warning: 'text-yellow-500',
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className={colorClasses[color]}>{icon}</span>
      </div>
      <div className="mt-2">
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-xs text-muted-foreground">{title}</div>
      </div>
    </div>
  );
}

function getMonthlyStats(audits: any[]) {
  const months: Record<string, { passed: number; failed: number; total: number }> = {};
  const now = new Date();
  
  // Initialize last 6 months
  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = date.toLocaleDateString('en-US', { month: 'short' });
    months[key] = { passed: 0, failed: 0, total: 0 };
  }
  
  // Count audits
  audits.filter(a => a.status === 'completed').forEach(audit => {
    const date = new Date(audit.audit_date);
    const monthDiff = (now.getFullYear() - date.getFullYear()) * 12 + now.getMonth() - date.getMonth();
    
    if (monthDiff >= 0 && monthDiff < 6) {
      const key = date.toLocaleDateString('en-US', { month: 'short' });
      if (months[key]) {
        months[key].total++;
        if (audit.passed) {
          months[key].passed++;
        } else {
          months[key].failed++;
        }
      }
    }
  });
  
  return Object.entries(months).map(([month, data]) => ({
    month,
    ...data,
  }));
}

function getLocationPerformance(audits: any[], locations: any[]) {
  return locations.map(loc => {
    const locAudits = audits.filter(a => a.location_id === loc.id && a.status === 'completed');
    const passedAudits = locAudits.filter(a => a.passed);
    const lastAudit = locAudits[0];
    
    return {
      id: loc.id,
      name: loc.name,
      totalAudits: locAudits.length,
      passRate: locAudits.length > 0 ? Math.round((passedAudits.length / locAudits.length) * 100) : 0,
      openActions: 0, // Will be calculated separately
      lastAudit: lastAudit ? new Date(lastAudit.audit_date).toLocaleDateString('nl-NL') : null,
    };
  }).sort((a, b) => b.totalAudits - a.totalAudits);
}
