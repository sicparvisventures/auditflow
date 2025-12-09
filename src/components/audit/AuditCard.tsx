import Link from 'next/link';

type AuditCardProps = {
  audit: {
    id: string;
    location: { name: string };
    audit_date: string;
    status: 'draft' | 'in_progress' | 'completed' | 'cancelled';
    pass_percentage: number;
    passed: boolean;
  };
};

const statusColors = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/30',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30',
};

const statusLabels = {
  draft: 'Draft',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export function AuditCard({ audit }: AuditCardProps) {
  return (
    <Link
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
            {audit.location.name}
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
  );
}

