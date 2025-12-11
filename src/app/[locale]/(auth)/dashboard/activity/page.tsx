import Link from 'next/link';

import { getActivityLog, type ActivityFilters } from '@/actions/activity';
import { FilterBar } from '@/components/filters';
import { TitleBar } from '@/features/dashboard/TitleBar';

// Action type icons and colors
const actionTypeConfig: Record<string, { icon: JSX.Element; color: string; label: string }> = {
  create: {
    icon: (
      <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 5v14M5 12h14" />
      </svg>
    ),
    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    label: 'Created',
  },
  update: {
    icon: (
      <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      </svg>
    ),
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    label: 'Updated',
  },
  delete: {
    icon: (
      <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
      </svg>
    ),
    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    label: 'Deleted',
  },
  complete: {
    icon: (
      <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    label: 'Completed',
  },
  verify: {
    icon: (
      <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 12l2 2 4-4" />
        <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
      </svg>
    ),
    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    label: 'Verified',
  },
  reject: {
    icon: (
      <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </svg>
    ),
    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    label: 'Rejected',
  },
  assign: {
    icon: (
      <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M19 8l2 2-4 4" />
      </svg>
    ),
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    label: 'Assigned',
  },
  comment: {
    icon: (
      <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
    color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
    label: 'Comment',
  },
};

// Entity type icons
const entityTypeConfig: Record<string, { icon: JSX.Element; path: string }> = {
  audit: {
    icon: (
      <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
        <rect x="9" y="3" width="6" height="4" rx="2" />
        <path d="m9 14 2 2 4-4" />
      </svg>
    ),
    path: '/dashboard/audits',
  },
  action: {
    icon: (
      <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4M12 8h.01" />
      </svg>
    ),
    path: '/dashboard/actions',
  },
  location: {
    icon: (
      <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4" />
      </svg>
    ),
    path: '/dashboard/locations',
  },
  template: {
    icon: (
      <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
    path: '/dashboard/settings/templates',
  },
};

type Props = {
  searchParams: { [key: string]: string | string[] | undefined };
};

export default async function ActivityLogPage({ searchParams }: Props) {
  // Parse filters from search params
  const filters: ActivityFilters = {
    entityType: searchParams.entityType as string,
    actionType: searchParams.actionType as string,
    dateFrom: searchParams.dateFrom as string,
    dateTo: searchParams.dateTo as string,
    search: searchParams.search as string,
  };
  
  const page = parseInt(searchParams.page as string) || 1;
  const limit = 25;
  const offset = (page - 1) * limit;
  
  const { data: activities, total } = await getActivityLog(filters, limit, offset);
  const totalPages = Math.ceil(total / limit);

  // Filter configuration
  const filterConfig = [
    {
      key: 'entityType',
      label: 'Entity',
      type: 'select' as const,
      placeholder: 'All entities',
      options: [
        { value: 'audit', label: 'Audits' },
        { value: 'action', label: 'Actions' },
        { value: 'location', label: 'Locations' },
        { value: 'template', label: 'Templates' },
      ],
    },
    {
      key: 'actionType',
      label: 'Action',
      type: 'select' as const,
      placeholder: 'All actions',
      options: [
        { value: 'create', label: 'Created' },
        { value: 'update', label: 'Updated' },
        { value: 'complete', label: 'Completed' },
        { value: 'verify', label: 'Verified' },
        { value: 'delete', label: 'Deleted' },
      ],
    },
    {
      key: 'dateFrom',
      label: 'From',
      type: 'date' as const,
    },
    {
      key: 'dateTo',
      label: 'To',
      type: 'date' as const,
    },
  ];

  // Format timestamp
  const formatTimestamp = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return d.toLocaleDateString('nl-NL', {
      day: 'numeric',
      month: 'short',
      year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      <TitleBar
        title="Activity Log"
        description="Track all changes and actions in your organization"
      />

      {/* Filters */}
      <div className="mb-6">
        <FilterBar filters={filterConfig} />
      </div>

      {/* Stats Summary */}
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <div className="text-2xl font-bold">{total}</div>
          <div className="text-xs text-muted-foreground">Total Activities</div>
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="rounded-lg border border-border bg-card shadow-sm">
        {activities.length > 0 ? (
          <div className="divide-y divide-border">
            {activities.map((activity, index) => {
              const actionConfig = actionTypeConfig[activity.action_type] ?? actionTypeConfig.update!;
              const entityConfig = entityTypeConfig[activity.entity_type];
              
              return (
                <div
                  key={activity.id}
                  className="flex gap-4 p-4 transition-colors hover:bg-muted/30"
                >
                  {/* Timeline Indicator */}
                  <div className="flex flex-col items-center">
                    <div className={`flex size-8 items-center justify-center rounded-full ${actionConfig?.color}`}>
                      {actionConfig?.icon}
                    </div>
                    {index < activities.length - 1 && (
                      <div className="mt-2 h-full w-px bg-border" />
                    )}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm">
                          <span className="font-medium">
                            {activity.user_name || activity.user_email || 'System'}
                          </span>
                          {' '}
                          <span className="text-muted-foreground">{activity.description}</span>
                        </p>
                        
                        {/* Entity Link */}
                        {activity.entity_id && entityConfig && (
                          <Link
                            href={`${entityConfig.path}/${activity.entity_id}`}
                            className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            {entityConfig.icon}
                            {activity.entity_name || activity.entity_type}
                          </Link>
                        )}
                        
                        {/* Metadata */}
                        {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {activity.metadata.old_status && activity.metadata.new_status && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs">
                                <span className="text-muted-foreground">{activity.metadata.old_status}</span>
                                <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M5 12h14M12 5l7 7-7 7" />
                                </svg>
                                <span className="font-medium">{activity.metadata.new_status}</span>
                              </span>
                            )}
                            {activity.metadata.pass_percentage !== undefined && (
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${
                                activity.metadata.passed 
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              }`}>
                                {Math.round(activity.metadata.pass_percentage)}%
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {/* Timestamp */}
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatTimestamp(activity.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <svg className="mb-4 size-12 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>No activity recorded yet</p>
            <p className="mt-1 text-sm">Activities will appear here as you use the app</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          {page > 1 && (
            <Link
              href={`/dashboard/activity?page=${page - 1}`}
              className="rounded-md border border-border px-3 py-1 text-sm hover:bg-muted"
            >
              Previous
            </Link>
          )}
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={`/dashboard/activity?page=${page + 1}`}
              className="rounded-md border border-border px-3 py-1 text-sm hover:bg-muted"
            >
              Next
            </Link>
          )}
        </div>
      )}
    </>
  );
}
