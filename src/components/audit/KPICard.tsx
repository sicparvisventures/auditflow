import { ReactNode } from 'react';

type KPICardProps = {
  title: string;
  value: string | number;
  change?: {
    value: number;
    isPositive: boolean;
  };
  icon: ReactNode;
  color?: 'default' | 'success' | 'warning' | 'danger';
};

const colorClasses = {
  default: 'bg-primary/10 text-primary',
  success: 'bg-green-100 text-green-600 dark:bg-green-900/30',
  warning: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30',
  danger: 'bg-red-100 text-red-600 dark:bg-red-900/30',
};

export function KPICard({ title, value, change, icon, color = 'default' }: KPICardProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className={`flex size-10 items-center justify-center rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
        {change && (
          <span
            className={`flex items-center gap-0.5 text-xs font-medium ${
              change.isPositive ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {change.isPositive ? (
              <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="18 15 12 9 6 15" />
              </svg>
            ) : (
              <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            )}
            {Math.abs(change.value)}%
          </span>
        )}
      </div>
      <div className="mt-3">
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm text-muted-foreground">{title}</p>
      </div>
    </div>
  );
}

