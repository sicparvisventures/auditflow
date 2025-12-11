'use client';

import { useState } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { LocaleSwitcher } from '@/components/LocaleSwitcher';
import { TitleBar } from '@/features/dashboard/TitleBar';
import { HintToggle } from '@/features/hints';
import { useUserRole } from '@/hooks/useUserRole';

type MenuItem = {
  href: string;
  label: string;
  description: string;
  adminOnly?: boolean;
};

type MenuSection = {
  id: string;
  title: string;
  icon: React.ReactNode;
  items: MenuItem[];
  adminOnly?: boolean;
};

const MorePage = () => {
  const t = useTranslations('DashboardLayout');
  const { isAdmin, isLoading } = useUserRole();
  const router = useRouter();
  const [expandedSection, setExpandedSection] = useState<string | null>('insights');

  // Redirect members away from this page since they shouldn't access it
  if (!isLoading && !isAdmin) {
    router.push('/dashboard/audits');
    return null;
  }

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  // Grouped menu items (all are admin only since this page is admin only)
  const menuSections: MenuSection[] = [
    {
      id: 'insights',
      title: 'Insights & Analysis',
      icon: (
        <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 3v18h18" />
          <path d="M7 16l4-8 4 4 4-8" />
        </svg>
      ),
      items: [
        { href: '/dashboard/insights', label: 'AI Insights', description: 'Smart predictions' },
        { href: '/dashboard/analytics', label: t('analytics'), description: 'Performance trends' },
        { href: '/dashboard/benchmarking', label: 'Benchmarking', description: 'Compare locations' },
        { href: '/dashboard/reports', label: t('reports'), description: 'Export reports' },
      ],
    },
    {
      id: 'monitoring',
      title: 'Monitoring',
      icon: (
        <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      ),
      items: [
        { href: '/dashboard/alerts', label: 'Alerts', description: 'Performance warnings' },
        { href: '/dashboard/activity', label: 'Activity Log', description: 'Audit trail' },
      ],
    },
    {
      id: 'planning',
      title: 'Planning & Media',
      icon: (
        <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      ),
      items: [
        { href: '/dashboard/calendar', label: 'Calendar', description: 'Audit schedule' },
        { href: '/dashboard/settings/scheduled-audits', label: 'Scheduled Audits', description: 'Recurring audits' },
        { href: '/dashboard/photos', label: 'Photo Evidence', description: 'All audit photos' },
      ],
    },
    {
      id: 'organization',
      title: 'Organization',
      icon: (
        <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 21h18" />
          <path d="M5 21V7l8-4v18" />
          <path d="M19 21V11l-6-4" />
        </svg>
      ),
      items: [
        { href: '/dashboard/locations', label: t('locations'), description: 'Manage locations' },
        { href: '/dashboard/settings/regions', label: 'Regions', description: 'Group locations' },
        { href: '/dashboard/settings/templates', label: 'Templates', description: 'Audit checklists' },
      ],
    },
    {
      id: 'team',
      title: 'Team & Settings',
      icon: (
        <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
      items: [
        { href: '/dashboard/organization-profile', label: t('members'), description: 'Manage team' },
        { href: '/dashboard/settings', label: t('settings'), description: 'Organization settings' },
        { href: '/dashboard/user-profile', label: 'Profile', description: 'Your account' },
      ],
    },
  ];

  return (
    <>
      <TitleBar
        title="More"
        description="All features and settings"
      />

      {/* Accordion Menu */}
      <div className="space-y-2">
        {menuSections.map((section) => (
          <div key={section.id} className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
            {/* Section Header */}
            <button
              onClick={() => toggleSection(section.id)}
              className="flex w-full items-center justify-between p-3 text-left transition-colors hover:bg-muted sm:p-4"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  {section.icon}
                </div>
                <span className="font-semibold">{section.title}</span>
              </div>
              <svg
                className={`size-5 shrink-0 text-muted-foreground transition-transform ${
                  expandedSection === section.id ? 'rotate-180' : ''
                }`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {/* Section Items */}
            {expandedSection === section.id && (
              <div className="border-t border-border">
                {section.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center justify-between border-b border-border/50 px-4 py-3 last:border-0 hover:bg-muted"
                  >
                    <div>
                      <div className="font-medium">{item.label}</div>
                      <div className="text-xs text-muted-foreground">{item.description}</div>
                    </div>
                    <svg className="size-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Quick Settings - Mobile only */}
      <div className="mt-6 sm:hidden">
        <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Quick Settings
        </h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                </svg>
              </div>
              <span className="font-medium">Tips & Hints</span>
            </div>
            <HintToggle />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
      </div>

      {/* App Version */}
      <div className="mt-8 pb-4 text-center text-xs text-muted-foreground">
        AuditFlow v1.5.1
      </div>
    </>
  );
};

export default MorePage;
