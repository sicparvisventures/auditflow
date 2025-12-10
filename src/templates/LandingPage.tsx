'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { LocaleSwitcher } from '@/components/LocaleSwitcher';

import { Logo } from './Logo';

export const LandingPage = () => {
  const t = useTranslations('Landing');

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      {/* Header - Minimal */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex h-14 max-w-screen-lg items-center justify-between px-4">
          <Logo size="sm" />
          <div className="flex items-center gap-3">
            <LocaleSwitcher />
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
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 flex-col">
        {/* Hero Section - Full screen with background image */}
        {/* Mobile: back.png, Desktop: hero.png */}
        <section className="relative flex flex-1 flex-col items-center justify-center px-6 pb-28 pt-8 text-center sm:pb-24 bg-[#f8f9fa]">
          {/* Background Images - Responsive */}
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat sm:hidden"
            style={{ backgroundImage: 'url(/back.png)' }}
          />
          <div 
            className="absolute inset-0 hidden bg-cover bg-center bg-no-repeat sm:block"
            style={{ backgroundImage: 'url(/hero.png)' }}
          />
          
          {/* Very light overlay for better readability while keeping it bright and clean */}
          <div className="absolute inset-0 bg-black/10" />
          
          <div className="relative z-10 mx-auto max-w-lg px-4">
            {/* Logo Image */}
            <div className="mb-6 flex justify-center sm:mb-8">
              <div className="relative h-16 w-32 sm:h-20 sm:w-40 md:h-24 md:w-48">
                <Image
                  src="/logot.png"
                  alt="AuditFlow Logo"
                  fill
                  className="object-contain drop-shadow-lg"
                  priority
                />
              </div>
            </div>

            {/* Headline */}
            <h1 className="text-3xl font-bold tracking-tight text-white drop-shadow-md sm:text-4xl md:text-5xl">
              {t('headline')}
            </h1>

            {/* Subheadline */}
            <p className="mt-4 text-base leading-relaxed text-white drop-shadow-sm sm:mt-5 sm:text-lg md:text-xl">
              {t('subheadline')}
            </p>

            {/* CTA Button */}
            <Link
              href="/sign-up"
              className="mt-8 inline-flex h-12 w-full items-center justify-center rounded-full bg-white px-8 text-base font-semibold text-gray-900 shadow-lg transition-all hover:bg-white/90 hover:shadow-xl active:scale-[0.98] sm:mt-10 sm:h-14 sm:w-auto sm:px-10 sm:text-lg"
            >
              {t('get_started')}
            </Link>

            {/* Trust Badge */}
            <p className="mt-5 text-sm text-white drop-shadow-sm sm:mt-6 sm:text-base">
              {t('free_trial')}
            </p>
          </div>
        </section>

      </main>

      {/* Bottom Navigation - App Style */}
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 safe-area-bottom">
        <div className="mx-auto flex h-16 max-w-md items-center justify-around px-4">
          <NavItem
            href="/features"
            icon={
              <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
            }
            label={t('nav_features')}
          />
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
          <NavItem
            href="/about"
            icon={
              <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4" />
                <path d="M12 8h.01" />
              </svg>
            }
            label={t('nav_about')}
          />
        </div>
      </nav>
    </div>
  );
};

const NavItem = (props: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) => (
  <Link
    href={props.href}
    className="flex flex-col items-center justify-center gap-1 px-4 py-2 text-muted-foreground transition-colors hover:text-foreground"
  >
    {props.icon}
    <span className="text-[10px] font-medium">{props.label}</span>
  </Link>
);
