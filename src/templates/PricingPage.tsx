'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { Logo } from './Logo';

export const PricingPage = () => {
  const t = useTranslations('PricingPage');

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

        {/* Pricing Cards */}
        <section className="px-6 py-8">
          <div className="mx-auto max-w-md space-y-6">
            {/* Free Plan */}
            <PricingCard
              name={t('plan_free_name')}
              price={t('plan_free_price')}
              description={t('plan_free_description')}
              features={[
                t('plan_free_feature1'),
                t('plan_free_feature2'),
                t('plan_free_feature3'),
                t('plan_free_feature4'),
              ]}
              buttonText={t('plan_free_button')}
              buttonHref="/sign-up"
              highlighted={false}
            />

            {/* Pro Plan */}
            <PricingCard
              name={t('plan_pro_name')}
              price={t('plan_pro_price')}
              description={t('plan_pro_description')}
              features={[
                t('plan_pro_feature1'),
                t('plan_pro_feature2'),
                t('plan_pro_feature3'),
                t('plan_pro_feature4'),
                t('plan_pro_feature5'),
              ]}
              buttonText={t('plan_pro_button')}
              buttonHref="/sign-up"
              highlighted={true}
              badge={t('plan_pro_badge')}
            />

            {/* Enterprise Plan */}
            <PricingCard
              name={t('plan_enterprise_name')}
              price={t('plan_enterprise_price')}
              description={t('plan_enterprise_description')}
              features={[
                t('plan_enterprise_feature1'),
                t('plan_enterprise_feature2'),
                t('plan_enterprise_feature3'),
                t('plan_enterprise_feature4'),
                t('plan_enterprise_feature5'),
              ]}
              buttonText={t('plan_enterprise_button')}
              buttonHref="mailto:sales@auditflow.app"
              highlighted={false}
            />
          </div>
        </section>

        {/* FAQ Section */}
        <section className="px-6 py-8">
          <div className="mx-auto max-w-md">
            <h2 className="mb-6 text-center text-lg font-semibold text-foreground">
              {t('faq_title')}
            </h2>
            <div className="space-y-4">
              <FaqItem
                question={t('faq1_question')}
                answer={t('faq1_answer')}
              />
              <FaqItem
                question={t('faq2_question')}
                answer={t('faq2_answer')}
              />
              <FaqItem
                question={t('faq3_question')}
                answer={t('faq3_answer')}
              />
            </div>
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
            className="-mt-3 flex items-center justify-center"
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

const PricingCard = (props: {
  name: string;
  price: string;
  description: string;
  features: string[];
  buttonText: string;
  buttonHref: string;
  highlighted?: boolean;
  badge?: string;
}) => (
  <div className={`relative rounded-2xl border p-6 shadow-sm ${
    props.highlighted
      ? 'border-primary bg-primary/5'
      : 'border-border/40 bg-card'
  }`}>
    {props.badge && (
      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
        <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
          {props.badge}
        </span>
      </div>
    )}
    <div className="text-center">
      <h3 className="text-lg font-semibold text-foreground">{props.name}</h3>
      <div className="mt-2">
        <span className="text-3xl font-bold text-foreground">{props.price}</span>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{props.description}</p>
    </div>
    <ul className="mt-6 space-y-3">
      {props.features.map((feature, index) => (
        <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
          <svg className="mt-0.5 size-4 shrink-0 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {feature}
        </li>
      ))}
    </ul>
    <Link
      href={props.buttonHref}
      className={`mt-6 flex h-11 w-full items-center justify-center rounded-full text-sm font-medium transition-all active:scale-[0.98] ${
        props.highlighted
          ? 'bg-primary text-primary-foreground hover:bg-primary/90'
          : 'border border-border bg-background text-foreground hover:bg-muted'
      }`}
    >
      {props.buttonText}
    </Link>
  </div>
);

const FaqItem = (props: { question: string; answer: string }) => (
  <div className="rounded-xl border border-border/40 bg-card p-4">
    <h4 className="font-medium text-foreground">{props.question}</h4>
    <p className="mt-2 text-sm text-muted-foreground">{props.answer}</p>
  </div>
);
