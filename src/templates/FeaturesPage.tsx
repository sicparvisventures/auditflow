'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { Logo } from './Logo';

export const FeaturesPage = () => {
  const t = useTranslations('FeaturesPage');

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex h-14 max-w-screen-lg items-center justify-between px-4">
          <Link href="/">
            <Logo size="sm" />
          </Link>
          <Link
            href="/sign-in"
            className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98]"
          >
            <svg
              className="size-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              <polyline points="10 17 15 12 10 7" />
              <line x1="15" y1="12" x2="3" y2="12" />
            </svg>
            {t('sign_in')}
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 pb-24">
        {/* Page Header */}
        <section className="border-b border-border/40 bg-muted/30 px-6 py-8">
          <div className="mx-auto max-w-md text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {t('title')}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {t('subtitle')}
            </p>
          </div>
        </section>

        {/* Features List */}
        <section className="px-6 py-6">
          <div className="mx-auto max-w-md space-y-6">
            {/* Smart Audits */}
            <FeatureCard
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                  <rect x="9" y="3" width="6" height="4" rx="2" />
                  <path d="m9 14 2 2 4-4" />
                </svg>
              }
              title={t('feature1_title')}
              description={t('feature1_description')}
              details={[
                t('feature1_detail1'),
                t('feature1_detail2'),
                t('feature1_detail3'),
              ]}
            />

            {/* Multi-Location */}
            <FeatureCard
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 21h18" />
                  <path d="M5 21V7l8-4v18" />
                  <path d="M19 21V11l-6-4" />
                </svg>
              }
              title={t('feature2_title')}
              description={t('feature2_description')}
              details={[
                t('feature2_detail1'),
                t('feature2_detail2'),
                t('feature2_detail3'),
              ]}
            />

            {/* Action Tracking */}
            <FeatureCard
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              }
              title={t('feature3_title')}
              description={t('feature3_description')}
              details={[
                t('feature3_detail1'),
                t('feature3_detail2'),
                t('feature3_detail3'),
              ]}
            />

            {/* Mobile First */}
            <FeatureCard
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                  <path d="M12 18h.01" />
                </svg>
              }
              title={t('feature4_title')}
              description={t('feature4_description')}
              details={[
                t('feature4_detail1'),
                t('feature4_detail2'),
                t('feature4_detail3'),
              ]}
            />

            {/* Reports */}
            <FeatureCard
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 3v18h18" />
                  <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" />
                </svg>
              }
              title={t('feature5_title')}
              description={t('feature5_description')}
              details={[
                t('feature5_detail1'),
                t('feature5_detail2'),
                t('feature5_detail3'),
              ]}
            />
          </div>
        </section>

        {/* CTA Section */}
        <section className="px-6 py-8">
          <div className="mx-auto max-w-md rounded-2xl bg-primary/5 p-6 text-center">
            <h2 className="text-lg font-semibold text-foreground">
              {t('cta_title')}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {t('cta_description')}
            </p>
            <Link
              href="/sign-up"
              className="mt-4 inline-flex h-11 items-center justify-center rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground shadow-md transition-all hover:bg-primary/90 active:scale-[0.98]"
            >
              {t('cta_button')}
            </Link>
          </div>
        </section>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 safe-area-bottom">
        <div className="mx-auto flex h-16 max-w-md items-center justify-around px-4">
          <Link
            href="/"
            className="flex flex-col items-center justify-center gap-1 px-4 py-2 text-muted-foreground transition-colors hover:text-foreground"
          >
            <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            <span className="text-[10px] font-medium">{t('nav_home')}</span>
          </Link>
          <Link
            href="/sign-up"
            className="flex -mt-3 items-center justify-center"
          >
            <div className="flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95">
              <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </div>
          </Link>
          <Link
            href="/about"
            className="flex flex-col items-center justify-center gap-1 px-4 py-2 text-muted-foreground transition-colors hover:text-foreground"
          >
            <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4" />
              <path d="M12 8h.01" />
            </svg>
            <span className="text-[10px] font-medium">{t('nav_about')}</span>
          </Link>
        </div>
      </nav>
    </div>
  );
};

const FeatureCard = (props: {
  icon: React.ReactNode;
  title: string;
  description: string;
  details: string[];
}) => (
  <div className="rounded-2xl border border-border/40 bg-card p-5 shadow-sm">
    <div className="flex items-start gap-4">
      <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <div className="size-6">
          {props.icon}
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="font-semibold text-foreground">{props.title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{props.description}</p>
      </div>
    </div>
    <ul className="mt-4 space-y-2 border-t border-border/40 pt-4">
      {props.details.map((detail, index) => (
        <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
          <svg className="mt-0.5 size-4 shrink-0 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {detail}
        </li>
      ))}
    </ul>
  </div>
);


