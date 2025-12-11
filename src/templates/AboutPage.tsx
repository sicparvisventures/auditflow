'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { Logo } from './Logo';

export const AboutPage = () => {
  const t = useTranslations('AboutPage');

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
        {/* Hero Section */}
        <section className="border-b border-border/40 bg-gradient-to-b from-primary/5 to-background px-6 py-10">
          <div className="mx-auto max-w-md text-center">
            <div className="mx-auto mb-4 flex items-center justify-center">
              <Logo size="lg" isTextHidden />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {t('hero_title')}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {t('hero_description')}
            </p>
          </div>
        </section>

        {/* What is AuditFlow */}
        <section className="px-6 py-8">
          <div className="mx-auto max-w-md">
            <h2 className="text-lg font-semibold text-foreground">{t('what_title')}</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {t('what_description')}
            </p>
          </div>
        </section>

        {/* Who is it for */}
        <section className="border-t border-border/40 bg-muted/30 px-6 py-8">
          <div className="mx-auto max-w-md">
            <h2 className="text-lg font-semibold text-foreground">{t('who_title')}</h2>
            <div className="mt-4 space-y-3">
              <IndustryCard
                icon={
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 11v3a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-3" />
                    <path d="M12 19H4a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-3.83" />
                    <path d="m3 11 7.77-6.04a2 2 0 0 1 2.46 0L21 11H3Z" />
                  </svg>
                }
                title={t('industry1_title')}
                description={t('industry1_description')}
              />
              <IndustryCard
                icon={
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7" />
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                    <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4" />
                    <path d="M2 7h20" />
                  </svg>
                }
                title={t('industry2_title')}
                description={t('industry2_description')}
              />
              <IndustryCard
                icon={
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                  </svg>
                }
                title={t('industry3_title')}
                description={t('industry3_description')}
              />
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="px-6 py-8">
          <div className="mx-auto max-w-md">
            <h2 className="text-lg font-semibold text-foreground">{t('how_title')}</h2>
            <div className="mt-4 space-y-4">
              <StepCard number="1" title={t('step1_title')} description={t('step1_description')} />
              <StepCard number="2" title={t('step2_title')} description={t('step2_description')} />
              <StepCard number="3" title={t('step3_title')} description={t('step3_description')} />
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="border-t border-border/40 bg-muted/30 px-6 py-8">
          <div className="mx-auto max-w-md">
            <h2 className="text-center text-lg font-semibold text-foreground">{t('pricing_title')}</h2>
            <p className="mt-2 text-center text-sm text-muted-foreground">{t('pricing_subtitle')}</p>
            
            <div className="mt-6 space-y-4">
              {/* Free Plan */}
              <PricingCard
                name={t('starter_name')}
                price={t('starter_price')}
                period=""
                description={t('starter_description')}
                features={[
                  t('starter_feature1'),
                  t('starter_feature2'),
                  t('starter_feature3'),
                ]}
                buttonText={t('get_started')}
                buttonHref="/sign-up"
              />

              {/* Professional Plan */}
              <PricingCard
                name={t('pro_name')}
                price={t('pro_price')}
                period={t('period')}
                description={t('pro_description')}
                features={[
                  t('pro_feature1'),
                  t('pro_feature2'),
                  t('pro_feature3'),
                  t('pro_feature4'),
                ]}
                buttonText={t('get_started')}
                buttonHref="/sign-up"
              />

              {/* Business Plan */}
              <PricingCard
                name={t('business_name')}
                price={t('business_price')}
                period={t('period')}
                description={t('business_description')}
                features={[
                  t('business_feature1'),
                  t('business_feature2'),
                  t('business_feature3'),
                  t('business_feature4'),
                ]}
                buttonText={t('get_started')}
                buttonHref="/sign-up"
                highlighted
              />

              {/* Enterprise */}
              <div className="rounded-xl border border-border/40 bg-card p-4 text-center shadow-sm">
                <p className="font-medium text-foreground">{t('enterprise_name')}</p>
                <p className="mt-1 text-xs text-muted-foreground">{t('enterprise_description')}</p>
                <Link
                  href="mailto:hello@auditflow.app"
                  className="mt-3 inline-flex h-9 items-center justify-center rounded-full bg-muted px-4 text-sm font-medium text-foreground transition-all hover:bg-muted/80 active:scale-[0.98]"
                >
                  {t('contact_sales')}
                </Link>
              </div>
            </div>

            <p className="mt-6 text-center text-xs text-muted-foreground">
              {t('trust_text')}
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 bg-muted/20 px-6 py-4 pb-20">
        <div className="mx-auto max-w-md text-center">
          <p className="text-xs text-muted-foreground/60">
            {t('footer_text')}
          </p>
          <p 
            className="mt-2 text-[10px] text-muted-foreground/30 transition-colors hover:text-muted-foreground/60"
            title="Crafted with care by Dietmar Lattré"
          >
            Crafted with care in Belgium
          </p>
        </div>
      </footer>

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
            href="/features"
            className="flex flex-col items-center justify-center gap-1 px-4 py-2 text-muted-foreground transition-colors hover:text-foreground"
          >
            <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
            <span className="text-[10px] font-medium">{t('nav_features')}</span>
          </Link>
        </div>
      </nav>
    </div>
  );
};

const IndustryCard = (props: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) => (
  <div className="flex items-start gap-3 rounded-xl bg-background p-3 shadow-sm">
    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
      <div className="size-4">{props.icon}</div>
    </div>
    <div>
      <h3 className="text-sm font-medium text-foreground">{props.title}</h3>
      <p className="mt-0.5 text-xs text-muted-foreground">{props.description}</p>
    </div>
  </div>
);

const StepCard = (props: {
  number: string;
  title: string;
  description: string;
}) => (
  <div className="flex items-start gap-3">
    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
      {props.number}
    </div>
    <div>
      <h3 className="text-sm font-medium text-foreground">{props.title}</h3>
      <p className="mt-0.5 text-xs text-muted-foreground">{props.description}</p>
    </div>
  </div>
);

const PricingCard = (props: {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  buttonText: string;
  buttonHref: string;
  highlighted?: boolean;
}) => (
  <div className={`rounded-xl border p-4 ${props.highlighted ? 'border-primary bg-primary/5 shadow-md' : 'border-border/40 bg-card shadow-sm'}`}>
    <div className="flex items-center justify-between">
      <div>
        <h3 className="font-medium text-foreground">{props.name}</h3>
        <p className="text-xs text-muted-foreground">{props.description}</p>
      </div>
      <div className="text-right">
        <span className="text-2xl font-bold text-foreground">{props.price}</span>
        {props.period && <span className="text-xs text-muted-foreground">/{props.period}</span>}
      </div>
    </div>
    <ul className="mt-3 space-y-1.5">
      {props.features.map((feature, index) => (
        <li key={index} className="flex items-center gap-2 text-xs text-muted-foreground">
          <svg className="size-3.5 shrink-0 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {feature}
        </li>
      ))}
    </ul>
    <Link
      href={props.buttonHref}
      className={`mt-4 flex h-9 w-full items-center justify-center rounded-full text-sm font-medium transition-all active:scale-[0.98] ${
        props.highlighted 
          ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
          : 'bg-muted text-foreground hover:bg-muted/80'
      }`}
    >
      {props.buttonText}
    </Link>
  </div>
);


