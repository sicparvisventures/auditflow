import Link from 'next/link';

import { getAllAlerts, getAlertStats } from '@/actions/alerts';
import { TitleBar } from '@/features/dashboard/TitleBar';

import { AlertCard } from './AlertCard';

export default async function AlertsPage() {
  const [alerts, stats] = await Promise.all([
    getAllAlerts({ limit: 50 }),
    getAlertStats(),
  ]);

  const activeAlerts = alerts.filter(a => a.status === 'active');
  const acknowledgedAlerts = alerts.filter(a => a.status === 'acknowledged');
  const resolvedAlerts = alerts.filter(a => a.status === 'resolved' || a.status === 'dismissed');

  return (
    <>
      <TitleBar
        title="Alerts & Warnings"
        description="Monitor performance alerts and take action"
      />

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <div className="rounded-lg border border-border bg-card p-3 text-center shadow-sm sm:p-4">
          <div className={`text-xl font-bold sm:text-2xl ${(stats?.active_alerts ?? 0) > 0 ? 'text-red-600' : ''}`}>
            {stats?.active_alerts ?? 0}
          </div>
          <div className="text-xs text-muted-foreground">Active</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 text-center shadow-sm sm:p-4">
          <div className={`text-xl font-bold sm:text-2xl ${(stats?.critical_alerts ?? 0) > 0 ? 'text-red-600' : ''}`}>
            {stats?.critical_alerts ?? 0}
          </div>
          <div className="text-xs text-muted-foreground">Critical</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 text-center shadow-sm sm:p-4">
          <div className="text-xl font-bold text-yellow-600 sm:text-2xl">{stats?.acknowledged_alerts ?? 0}</div>
          <div className="text-xs text-muted-foreground">Acknowledged</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 text-center shadow-sm sm:p-4">
          <div className="text-xl font-bold text-green-600 sm:text-2xl">{stats?.resolved_this_week ?? 0}</div>
          <div className="text-xs text-muted-foreground">Resolved (7d)</div>
        </div>
      </div>

      {/* Active Alerts */}
      {activeAlerts.length > 0 && (
        <div className="mb-8">
          <h3 className="mb-4 flex items-center gap-2 font-semibold">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-red-500" />
            </span>
            Active Alerts ({activeAlerts.length})
          </h3>
          <div className="space-y-3">
            {activeAlerts.map(alert => (
              <AlertCard key={alert.id} alert={alert} />
            ))}
          </div>
        </div>
      )}

      {/* Acknowledged Alerts */}
      {acknowledgedAlerts.length > 0 && (
        <div className="mb-8">
          <h3 className="mb-4 font-semibold text-yellow-600">
            Acknowledged ({acknowledgedAlerts.length})
          </h3>
          <div className="space-y-3">
            {acknowledgedAlerts.map(alert => (
              <AlertCard key={alert.id} alert={alert} />
            ))}
          </div>
        </div>
      )}

      {/* Resolved Alerts */}
      {resolvedAlerts.length > 0 && (
        <div className="mb-8">
          <h3 className="mb-4 font-semibold text-muted-foreground">
            Resolved History ({resolvedAlerts.length})
          </h3>
          <div className="space-y-3 opacity-75">
            {resolvedAlerts.slice(0, 10).map(alert => (
              <AlertCard key={alert.id} alert={alert} />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {alerts.length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-green-100">
            <svg className="size-8 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <h3 className="mb-2 text-lg font-semibold">All Clear!</h3>
          <p className="text-muted-foreground">
            No alerts at this time. Keep up the great work!
          </p>
        </div>
      )}

      {/* Quick Actions */}
      <div className="mt-6 flex flex-wrap gap-2">
        <Link
          href="/dashboard/analytics"
          className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
        >
          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 3v18h18" />
            <path d="M7 16l4-8 4 4 4-8" />
          </svg>
          View Analytics
        </Link>
        <Link
          href="/dashboard/benchmarking"
          className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
        >
          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <line x1="3" y1="9" x2="21" y2="9" />
            <line x1="9" y1="21" x2="9" y2="9" />
          </svg>
          Benchmarking
        </Link>
      </div>
    </>
  );
}


