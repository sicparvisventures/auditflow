'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { LocaleSwitcher } from '@/components/LocaleSwitcher';
import { TitleBar } from '@/features/dashboard/TitleBar';
import { HintToggle } from '@/features/hints';

const MorePage = () => {
  const t = useTranslations('DashboardLayout');

  // Main feature links - most important first
  const featureItems = [
    {
      href: '/dashboard/analytics',
      label: t('analytics'),
      icon: (
        <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 3v18h18" />
          <path d="M7 16l4-8 4 4 4-8" />
        </svg>
      ),
      description: 'Performance insights and trends',
    },
    {
      href: '/dashboard/reports',
      label: t('reports'),
      icon: (
        <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      ),
      description: 'Generate and export reports',
    },
    {
      href: '/dashboard/locations',
      label: t('locations'),
      icon: (
        <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 21h18" />
          <path d="M5 21V7l8-4v18" />
          <path d="M19 21V11l-6-4" />
        </svg>
      ),
      description: 'Manage locations and branches',
    },
  ];

  // Configuration/setup items
  const configItems = [
    {
      href: '/dashboard/settings/templates',
      label: 'Audit Templates',
      icon: (
        <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
          <rect x="9" y="3" width="6" height="4" rx="2" />
          <path d="M9 12h6" />
          <path d="M9 16h6" />
        </svg>
      ),
      description: 'Create and manage templates',
    },
    {
      href: '/dashboard/settings/scheduled-audits',
      label: 'Scheduled Audits',
      icon: (
        <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
          <path d="M12 14l2 2 4-4" />
        </svg>
      ),
      description: 'Automate recurring audits',
    },
    {
      href: '/dashboard/activity',
      label: 'Activity Log',
      icon: (
        <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 8v4l3 3" />
          <circle cx="12" cy="12" r="10" />
        </svg>
      ),
      description: 'Track changes and audit trail',
    },
  ];

  // Account/team items
  const accountItems = [
    {
      href: '/dashboard/organization-profile/organization-members',
      label: t('members'),
      icon: (
        <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
      description: 'Invite and manage team',
    },
    {
      href: '/dashboard/settings',
      label: t('settings'),
      icon: (
        <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      ),
      description: 'Organization settings',
    },
    {
      href: '/dashboard/user-profile',
      label: 'Profile',
      icon: (
        <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ),
      description: 'Your account settings',
    },
  ];

  const MenuItem = ({ item }: { item: { href: string; label: string; icon: React.ReactNode; description: string } }) => (
    <Link
      href={item.href}
      className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 shadow-sm transition-colors hover:bg-muted sm:gap-4 sm:p-4"
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary sm:size-10">
        {item.icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{item.label}</div>
        <div className="truncate text-xs text-muted-foreground sm:text-sm">{item.description}</div>
      </div>
      <svg
        className="size-4 shrink-0 text-muted-foreground sm:size-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </Link>
  );

  return (
    <>
      <TitleBar
        title="More"
        description="Additional options and settings"
      />

      {/* Features Section */}
      <div className="space-y-2">
        {featureItems.map(item => (
          <MenuItem key={item.href} item={item} />
        ))}
      </div>

      {/* Configuration Section */}
      <div className="mt-6">
        <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Configuration
        </h3>
        <div className="space-y-2">
          {configItems.map(item => (
            <MenuItem key={item.href} item={item} />
          ))}
        </div>
      </div>

      {/* Account Section */}
      <div className="mt-6">
        <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Account
        </h3>
        <div className="space-y-2">
          {accountItems.map(item => (
            <MenuItem key={item.href} item={item} />
          ))}
        </div>
      </div>

      {/* Quick Settings - Mobile only (these are in header on desktop) */}
      <div className="mt-6 sm:hidden">
        <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Quick Settings
        </h3>
        <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            </div>
            <span className="font-medium">Tips & Hints</span>
          </div>
          <HintToggle />
        </div>
        <div className="mt-2 flex items-center justify-between rounded-lg border border-border bg-card p-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
            </div>
            <span className="font-medium">Language</span>
          </div>
          <LocaleSwitcher />
        </div>
      </div>

      {/* App Version */}
      <div className="mt-8 pb-4 text-center text-xs text-muted-foreground">
        AuditFlow v1.0.0
      </div>
    </>
  );
};

export default MorePage;
