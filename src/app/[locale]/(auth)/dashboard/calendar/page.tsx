import Link from 'next/link';

import { getAudits, getUserPermissions } from '@/actions/supabase';
import { getPendingScheduledInstances } from '@/actions/scheduled-audits';
import { buttonVariants } from '@/components/ui/buttonVariants';
import { TitleBar } from '@/features/dashboard/TitleBar';

type Props = {
  searchParams: { [key: string]: string | string[] | undefined };
};

export default async function CalendarPage({ searchParams }: Props) {
  // Get current month from search params or use current date
  const now = new Date();
  const year = searchParams.year ? parseInt(searchParams.year as string) : now.getFullYear();
  const month = searchParams.month ? parseInt(searchParams.month as string) : now.getMonth();

  // Fetch data (already filtered by role in getAudits)
  const [audits, pendingInstances, permissions] = await Promise.all([
    getAudits(),
    getPendingScheduledInstances(),
    getUserPermissions(),
  ]);
  
  const isAdmin = permissions.isAdmin;

  // Calculate calendar data
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDay = firstDay.getDay(); // 0 = Sunday

  // Get prev/next month dates
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear = month === 11 ? year + 1 : year;

  // Build calendar grid
  const calendarDays: (number | null)[] = [];
  
  // Add empty cells for days before the 1st
  for (let i = 0; i < startingDay; i++) {
    calendarDays.push(null);
  }
  
  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  // Get audits for this month
  const monthAudits = audits.filter(audit => {
    const auditDate = new Date(audit.audit_date);
    return auditDate.getFullYear() === year && auditDate.getMonth() === month;
  });

  // Group audits by day
  const auditsByDay: Record<number, typeof audits> = {};
  monthAudits.forEach(audit => {
    const day = new Date(audit.audit_date).getDate();
    if (!auditsByDay[day]) auditsByDay[day] = [];
    auditsByDay[day]!.push(audit);
  });

  // Get pending scheduled audits for this month
  const scheduledByDay: Record<number, typeof pendingInstances> = {};
  pendingInstances.forEach(item => {
    const dueDate = new Date(item.instance.due_date);
    if (dueDate.getFullYear() === year && dueDate.getMonth() === month) {
      const day = dueDate.getDate();
      if (!scheduledByDay[day]) scheduledByDay[day] = [];
      scheduledByDay[day]!.push(item);
    }
  });

  const monthName = firstDay.toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' });
  const todayDay = now.getFullYear() === year && now.getMonth() === month ? now.getDate() : null;

  // Calculate stats for this month
  const completedThisMonth = monthAudits.filter(a => a.status === 'completed').length;
  const passedThisMonth = monthAudits.filter(a => a.status === 'completed' && a.passed).length;
  const scheduledThisMonth = Object.values(scheduledByDay).flat().length;

  return (
    <>
      <TitleBar
        title="Audit Calendar"
        description="View and plan your audits"
      />

      {/* Month Stats */}
      <div className="mb-6 grid grid-cols-3 gap-3 sm:gap-4">
        <div className="rounded-lg border border-border bg-card p-3 text-center shadow-sm sm:p-4">
          <div className="text-xl font-bold sm:text-2xl">{completedThisMonth}</div>
          <div className="text-xs text-muted-foreground">Completed</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 text-center shadow-sm sm:p-4">
          <div className="text-xl font-bold text-green-600 sm:text-2xl">
            {completedThisMonth > 0 ? Math.round((passedThisMonth / completedThisMonth) * 100) : 0}%
          </div>
          <div className="text-xs text-muted-foreground">Pass Rate</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 text-center shadow-sm sm:p-4">
          <div className="text-xl font-bold text-primary sm:text-2xl">{scheduledThisMonth}</div>
          <div className="text-xs text-muted-foreground">Scheduled</div>
        </div>
      </div>

      {/* Calendar Header */}
      <div className="mb-4 flex items-center justify-between">
        <Link
          href={`/dashboard/calendar?year=${prevYear}&month=${prevMonth}`}
          className={buttonVariants({ variant: 'outline', size: 'sm' })}
        >
          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          <span className="hidden sm:inline">Previous</span>
        </Link>
        
        <h2 className="text-lg font-semibold capitalize sm:text-xl">{monthName}</h2>
        
        <Link
          href={`/dashboard/calendar?year=${nextYear}&month=${nextMonth}`}
          className={buttonVariants({ variant: 'outline', size: 'sm' })}
        >
          <span className="hidden sm:inline">Next</span>
          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </Link>
      </div>

      {/* Calendar Grid */}
      <div className="rounded-lg border border-border bg-card shadow-sm">
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 border-b border-border">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-2 text-center text-xs font-medium text-muted-foreground sm:p-3 sm:text-sm">
              <span className="hidden sm:inline">{day}</span>
              <span className="sm:hidden">{day.charAt(0)}</span>
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, index) => {
            const dayAudits = day ? auditsByDay[day] || [] : [];
            const dayScheduled = day ? scheduledByDay[day] || [] : [];
            const isToday = day === todayDay;
            const hasScheduled = dayScheduled.length > 0;
            const passedCount = dayAudits.filter(a => a.status === 'completed' && a.passed).length;
            const failedCount = dayAudits.filter(a => a.status === 'completed' && !a.passed).length;
            const inProgressCount = dayAudits.filter(a => a.status === 'in_progress').length;

            return (
              <div
                key={index}
                className={`min-h-[60px] border-b border-r border-border p-1 sm:min-h-[80px] sm:p-2 ${
                  !day ? 'bg-muted/30' : ''
                } ${isToday ? 'bg-primary/5' : ''}`}
              >
                {day && (
                  <>
                    <div className={`mb-1 text-right text-xs sm:text-sm ${
                      isToday ? 'font-bold text-primary' : 'text-muted-foreground'
                    }`}>
                      {day}
                    </div>
                    
                    {/* Indicators */}
                    <div className="flex flex-wrap gap-0.5 sm:gap-1">
                      {/* Passed audits */}
                      {passedCount > 0 && (
                        <Link
                          href={`/dashboard/audits?dateFrom=${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}&dateTo=${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}&passed=true`}
                          className="flex size-5 items-center justify-center rounded bg-green-500 text-[10px] font-medium text-white sm:size-6 sm:text-xs"
                          title={`${passedCount} passed`}
                        >
                          {passedCount}
                        </Link>
                      )}
                      
                      {/* Failed audits */}
                      {failedCount > 0 && (
                        <Link
                          href={`/dashboard/audits?dateFrom=${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}&dateTo=${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}&passed=false`}
                          className="flex size-5 items-center justify-center rounded bg-red-500 text-[10px] font-medium text-white sm:size-6 sm:text-xs"
                          title={`${failedCount} failed`}
                        >
                          {failedCount}
                        </Link>
                      )}
                      
                      {/* In progress */}
                      {inProgressCount > 0 && (
                        <Link
                          href={`/dashboard/audits?status=in_progress`}
                          className="flex size-5 items-center justify-center rounded bg-blue-500 text-[10px] font-medium text-white sm:size-6 sm:text-xs"
                          title={`${inProgressCount} in progress`}
                        >
                          {inProgressCount}
                        </Link>
                      )}
                      
                      {/* Scheduled */}
                      {hasScheduled && (
                        <div 
                          className="flex size-5 items-center justify-center rounded border-2 border-dashed border-primary text-[10px] font-medium text-primary sm:size-6 sm:text-xs"
                          title={`${dayScheduled.length} scheduled`}
                        >
                          {dayScheduled.length}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap justify-center gap-3 text-xs sm:gap-4 sm:text-sm">
        <div className="flex items-center gap-1.5">
          <div className="size-4 rounded bg-green-500" />
          <span className="text-muted-foreground">Passed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="size-4 rounded bg-red-500" />
          <span className="text-muted-foreground">Failed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="size-4 rounded bg-blue-500" />
          <span className="text-muted-foreground">In Progress</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="size-4 rounded border-2 border-dashed border-primary" />
          <span className="text-muted-foreground">Scheduled</span>
        </div>
      </div>

      {/* Upcoming this month */}
      {Object.keys(scheduledByDay).length > 0 && (
        <div className="mt-6 rounded-lg border border-border bg-card p-4 shadow-sm sm:p-6">
          <h3 className="mb-4 font-semibold">Upcoming This Month</h3>
          <div className="space-y-2">
            {Object.entries(scheduledByDay)
              .sort(([a], [b]) => parseInt(a) - parseInt(b))
              .map(([day, items]) => (
                items.map(item => (
                  <Link
                    key={item.instance.id}
                    href={`/dashboard/audits/new?locationId=${item.scheduledAudit.location_id}&templateId=${item.scheduledAudit.template_id}`}
                    className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-muted"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="shrink-0 rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                          {day} {firstDay.toLocaleDateString('nl-NL', { month: 'short' })}
                        </span>
                        <span className="truncate font-medium">{item.scheduledAudit.name}</span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {item.scheduledAudit.location?.name}
                      </p>
                    </div>
                    <div className={buttonVariants({ size: 'sm' })}>
                      Start
                    </div>
                  </Link>
                ))
              ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="mt-6 flex flex-wrap gap-2">
        <Link
          href="/dashboard/audits/new"
          className={buttonVariants({ size: 'sm' })}
        >
          <svg className="mr-1.5 size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Audit
        </Link>
        {isAdmin && (
          <Link
            href="/dashboard/settings/scheduled-audits"
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            <svg className="mr-1.5 size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            Manage Schedules
          </Link>
        )}
      </div>
    </>
  );
}
