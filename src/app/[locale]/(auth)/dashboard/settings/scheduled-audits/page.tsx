import Link from 'next/link';

import { getScheduledAudits } from '@/actions/scheduled-audits';
import { buttonVariants } from '@/components/ui/buttonVariants';
import { TitleBar } from '@/features/dashboard/TitleBar';

// Recurrence labels
const recurrenceLabels: Record<string, string> = {
  once: 'One-time',
  daily: 'Daily',
  weekly: 'Weekly',
  biweekly: 'Bi-weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
};

export default async function ScheduledAuditsPage() {
  const scheduledAudits = await getScheduledAudits();
  const activeCount = scheduledAudits.filter(s => s.is_active).length;

  return (
    <>
      <TitleBar
        title="Scheduled Audits"
        description="Plan and automate recurring audits"
      />

      {/* Action Buttons */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
            {activeCount} Active
          </span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
            {scheduledAudits.length - activeCount} Inactive
          </span>
        </div>
        <Link
          href="/dashboard/settings/scheduled-audits/new"
          className={buttonVariants()}
        >
          <svg className="mr-2 size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          New Schedule
        </Link>
      </div>

      {/* Scheduled Audits List */}
      {scheduledAudits.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {scheduledAudits.map((schedule) => (
            <Link
              key={schedule.id}
              href={`/dashboard/settings/scheduled-audits/${schedule.id}`}
              className="group rounded-lg border border-border bg-card p-4 shadow-sm transition-all hover:border-primary hover:shadow-md"
            >
              {/* Header */}
              <div className="mb-3 flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold group-hover:text-primary">
                    {schedule.name}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {schedule.location?.name}
                  </p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  schedule.is_active
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                }`}>
                  {schedule.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>

              {/* Details */}
              <div className="space-y-2 text-sm">
                {/* Template */}
                <div className="flex items-center gap-2 text-muted-foreground">
                  <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                    <rect x="9" y="3" width="6" height="4" rx="2" />
                  </svg>
                  <span className="truncate">{schedule.template?.name}</span>
                </div>

                {/* Recurrence */}
                <div className="flex items-center gap-2 text-muted-foreground">
                  <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 8v4l3 3" />
                    <circle cx="12" cy="12" r="10" />
                  </svg>
                  <span>{recurrenceLabels[schedule.recurrence] || schedule.recurrence}</span>
                </div>

                {/* Next Scheduled Date */}
                {schedule.next_scheduled_date && schedule.is_active && (
                  <div className="flex items-center gap-2">
                    <svg className="size-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    <span className="font-medium text-primary">
                      Next: {new Date(schedule.next_scheduled_date).toLocaleDateString('nl-NL', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                  </div>
                )}
              </div>

              {/* Inspector */}
              {schedule.inspector && (
                <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
                  <div className="flex size-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
                    {schedule.inspector.full_name?.charAt(0) || '?'}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {schedule.inspector.full_name}
                  </span>
                </div>
              )}
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-primary/10">
            <svg className="size-8 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
              <path d="M12 14l2 2 4-4" />
            </svg>
          </div>
          <h3 className="mb-2 text-lg font-semibold">No Scheduled Audits</h3>
          <p className="mb-6 text-muted-foreground">
            Create a schedule to automate recurring audits for your locations
          </p>
          <Link
            href="/dashboard/settings/scheduled-audits/new"
            className={buttonVariants()}
          >
            Create First Schedule
          </Link>
        </div>
      )}

      {/* Help Section */}
      <div className="mt-8 rounded-lg border border-border bg-muted/30 p-6">
        <h4 className="mb-4 font-semibold">How Scheduled Audits Work</h4>
        <div className="grid gap-4 text-sm md:grid-cols-3">
          <div className="flex gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              1
            </div>
            <div>
              <p className="font-medium">Create a Schedule</p>
              <p className="text-muted-foreground">
                Choose location, template, and recurrence pattern
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              2
            </div>
            <div>
              <p className="font-medium">Get Notified</p>
              <p className="text-muted-foreground">
                Receive reminders before scheduled audit dates
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              3
            </div>
            <div>
              <p className="font-medium">Complete Audits</p>
              <p className="text-muted-foreground">
                Start audits with one click when they&apos;re due
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
