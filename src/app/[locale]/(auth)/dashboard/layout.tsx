import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';

import { MobileNavigation } from '@/components/MobileNavigation';
import { DashboardHeader } from '@/features/dashboard/DashboardHeader';
import { HintsProvider } from '@/features/hints';

export async function generateMetadata(props: { params: { locale: string } }) {
  const t = await getTranslations({
    locale: props.params.locale,
    namespace: 'Dashboard',
  });

  return {
    title: t('meta_title'),
    description: t('meta_description'),
  };
}

export default function DashboardLayout(props: { children: React.ReactNode }) {
  const t = useTranslations('DashboardLayout');

  return (
    <HintsProvider>
      {/* Desktop Header */}
      <div className="shadow-md">
        <div className="mx-auto flex max-w-screen-xl items-center justify-between px-3 py-4">
          <DashboardHeader
            menu={[
              {
                href: '/dashboard',
                label: t('home'),
              },
              {
                href: '/dashboard/audits',
                label: t('audits'),
              },
              {
                href: '/dashboard/actions',
                label: t('actions'),
              },
              {
                href: '/dashboard/reports',
                label: t('reports'),
              },
              {
                href: '/dashboard/analytics',
                label: t('analytics'),
              },
              {
                href: '/dashboard/organization-profile',
                label: t('settings'),
              },
            ]}
          />
        </div>
      </div>

      {/* Main Content - with bottom padding for mobile nav */}
      <div className="min-h-[calc(100vh-72px)] bg-muted">
        <div className="mx-auto max-w-screen-xl px-3 pb-24 pt-6 md:pb-16">
          {props.children}
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNavigation />
    </HintsProvider>
  );
}

export const dynamic = 'force-dynamic';
