import Link from 'next/link';

type ActionCardProps = {
  action: {
    id: string;
    title: string;
    location: { name: string };
    status: 'pending' | 'in_progress' | 'completed' | 'verified' | 'rejected';
    urgency: 'low' | 'medium' | 'high' | 'critical';
    deadline: string | null;
    assigned_to?: { name: string } | null;
  };
};

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

export function ActionCard({ action }: ActionCardProps) {
  const isOverdue = action.deadline && new Date(action.deadline) < new Date() && action.status !== 'verified';

  return (
    <Link
      href={`/dashboard/actions/${action.id}`}
      className="group flex items-start gap-4 rounded-lg border border-border bg-card p-4 shadow-sm transition-all hover:border-primary hover:shadow-md"
    >
      {/* Urgency Indicator */}
      <div className={`mt-1 size-3 shrink-0 rounded-full ${urgencyColors[action.urgency]}`} />

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <h3 className="truncate font-medium group-hover:text-primary">{action.title}</h3>
        </div>
        <p className="mb-2 text-sm text-muted-foreground">{action.location.name}</p>
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

      {/* Assigned User */}
      {action.assigned_to && (
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
          {action.assigned_to.name
            .split(' ')
            .map(n => n[0])
            .join('')}
        </div>
      )}

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

