'use client';

import { useTransition } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { acknowledgeAlert, dismissAlert, resolveAlert, type TrendAlert } from '@/actions/alerts';

const severityConfig = {
  critical: {
    bg: 'bg-red-50 border-red-200',
    icon: 'text-red-600',
    badge: 'bg-red-100 text-red-700',
  },
  urgent: {
    bg: 'bg-orange-50 border-orange-200',
    icon: 'text-orange-600',
    badge: 'bg-orange-100 text-orange-700',
  },
  warning: {
    bg: 'bg-yellow-50 border-yellow-200',
    icon: 'text-yellow-600',
    badge: 'bg-yellow-100 text-yellow-700',
  },
  info: {
    bg: 'bg-blue-50 border-blue-200',
    icon: 'text-blue-600',
    badge: 'bg-blue-100 text-blue-700',
  },
};

const typeConfig: Record<string, { label: string; icon: JSX.Element }> = {
  score_drop: {
    label: 'Score Drop',
    icon: (
      <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
        <polyline points="17 18 23 18 23 12" />
      </svg>
    ),
  },
  consecutive_failures: {
    label: 'Consecutive Failures',
    icon: (
      <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </svg>
    ),
  },
  action_overdue: {
    label: 'Action Overdue',
    icon: (
      <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  critical_finding: {
    label: 'Critical Finding',
    icon: (
      <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
  compliance_risk: {
    label: 'Compliance Risk',
    icon: (
      <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  safety_risk: {
    label: 'Safety Risk',
    icon: (
      <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
  },
};

export function AlertCard({ alert }: { alert: TrendAlert }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const config = severityConfig[alert.severity];
  const typeInfo = typeConfig[alert.alert_type] || {
    label: alert.alert_type,
    icon: <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /></svg>,
  };

  const handleAcknowledge = () => {
    startTransition(async () => {
      await acknowledgeAlert(alert.id);
      router.refresh();
    });
  };

  const handleResolve = () => {
    startTransition(async () => {
      await resolveAlert(alert.id);
      router.refresh();
    });
  };

  const handleDismiss = () => {
    startTransition(async () => {
      await dismissAlert(alert.id);
      router.refresh();
    });
  };

  return (
    <div className={`rounded-lg border p-4 ${config.bg} ${alert.status !== 'active' ? 'opacity-75' : ''}`}>
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`shrink-0 ${config.icon}`}>
          {typeInfo.icon}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${config.badge}`}>
              {alert.severity}
            </span>
            <span className="text-xs text-muted-foreground">{typeInfo.label}</span>
            {alert.status !== 'active' && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {alert.status}
              </span>
            )}
          </div>

          <h4 className="font-medium">{alert.title}</h4>
          <p className="mt-1 text-sm text-muted-foreground">{alert.message}</p>

          {/* Meta info */}
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            {alert.location_name && (
              <span className="flex items-center gap-1">
                <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                {alert.location_name}
              </span>
            )}
            {alert.audit_score !== undefined && (
              <span className="flex items-center gap-1">
                Score: {Math.round(alert.audit_score)}%
              </span>
            )}
            <span>
              {new Date(alert.triggered_at).toLocaleDateString('nl-NL', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>

          {/* Actions */}
          {alert.status === 'active' && (
            <div className="mt-3 flex flex-wrap gap-2">
              {alert.audit_id && (
                <Link
                  href={`/dashboard/audits/${alert.audit_id}`}
                  className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary/90"
                >
                  View Audit
                </Link>
              )}
              {alert.action_id && (
                <Link
                  href={`/dashboard/actions/${alert.action_id}`}
                  className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary/90"
                >
                  View Action
                </Link>
              )}
              <button
                onClick={handleAcknowledge}
                disabled={isPending}
                className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
              >
                Acknowledge
              </button>
              <button
                onClick={handleResolve}
                disabled={isPending}
                className="inline-flex items-center gap-1 rounded-lg border border-green-500 px-3 py-1.5 text-xs font-medium text-green-600 transition-colors hover:bg-green-50"
              >
                Resolve
              </button>
              <button
                onClick={handleDismiss}
                disabled={isPending}
                className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Resolution info */}
          {alert.status === 'resolved' && alert.resolved_at && (
            <p className="mt-2 text-xs text-green-600">
              Resolved on {new Date(alert.resolved_at).toLocaleDateString('nl-NL')}
              {alert.resolution_notes && `: ${alert.resolution_notes}`}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}


