'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { buttonVariants } from '@/components/ui/buttonVariants';
import { Logo } from '@/templates/Logo';

type OnboardingStep = 'welcome' | 'location' | 'template' | 'complete';

const OnboardingPage = () => {
  const t = useTranslations('Onboarding');
  const router = useRouter();
  const [step, setStep] = useState<OnboardingStep>('welcome');
  const [locationData, setLocationData] = useState({
    name: '',
    address: '',
    city: '',
  });

  const handleLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocationData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleComplete = () => {
    // TODO: Save to Supabase and mark onboarding as complete
    router.push('/dashboard');
  };

  // Step 1: Welcome
  if (step === 'welcome') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-muted p-4">
        <div className="w-full max-w-md text-center">
          <div className="mb-8 flex justify-center">
            <Logo size="lg" />
          </div>

          <h1 className="mb-4 text-3xl font-bold">{t('welcome_title')}</h1>
          <p className="mb-8 text-muted-foreground">{t('welcome_description')}</p>

          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setStep('location')}
              className={buttonVariants({ size: 'lg', className: 'w-full' })}
            >
              {t('get_started')}
            </button>
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="block w-full text-sm text-muted-foreground hover:text-foreground"
            >
              {t('skip_for_now')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Create First Location
  if (step === 'location') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-muted p-4">
        <div className="w-full max-w-md">
          {/* Progress */}
          <div className="mb-8">
            <div className="mb-2 flex justify-between text-sm text-muted-foreground">
              <span>{t('step')} 1 {t('of')} 3</span>
              <span>33%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-secondary">
              <div className="h-full w-1/3 bg-primary transition-all" />
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
            <div className="mb-6 text-center">
              <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-primary/10">
                <svg
                  className="size-8 text-primary"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 21h18" />
                  <path d="M5 21V7l8-4v18" />
                  <path d="M19 21V11l-6-4" />
                </svg>
              </div>
              <h2 className="mb-2 text-xl font-semibold">{t('location_title')}</h2>
              <p className="text-sm text-muted-foreground">{t('location_description')}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="mb-1 block text-sm font-medium">
                  {t('location_name')} *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  value={locationData.name}
                  onChange={handleLocationChange}
                  placeholder={t('location_name_placeholder')}
                  className="w-full rounded-md border border-input bg-background px-3 py-3 text-base"
                />
              </div>

              <div>
                <label htmlFor="address" className="mb-1 block text-sm font-medium">
                  {t('address')}
                </label>
                <input
                  type="text"
                  id="address"
                  name="address"
                  value={locationData.address}
                  onChange={handleLocationChange}
                  placeholder={t('address_placeholder')}
                  className="w-full rounded-md border border-input bg-background px-3 py-3 text-base"
                />
              </div>

              <div>
                <label htmlFor="city" className="mb-1 block text-sm font-medium">
                  {t('city')}
                </label>
                <input
                  type="text"
                  id="city"
                  name="city"
                  value={locationData.city}
                  onChange={handleLocationChange}
                  placeholder={t('city_placeholder')}
                  className="w-full rounded-md border border-input bg-background px-3 py-3 text-base"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setStep('welcome')}
                className={buttonVariants({ variant: 'outline', className: 'flex-1' })}
              >
                {t('back')}
              </button>
              <button
                type="button"
                onClick={() => setStep('template')}
                disabled={!locationData.name}
                className={buttonVariants({ className: 'flex-1 disabled:opacity-50' })}
              >
                {t('continue')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Step 3: Choose Audit Template
  if (step === 'template') {
    const templates = [
      {
        id: 'food-safety',
        name: t('template_food_safety'),
        description: t('template_food_safety_desc'),
        icon: (
          <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
            <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
            <line x1="6" y1="1" x2="6" y2="4" />
            <line x1="10" y1="1" x2="10" y2="4" />
            <line x1="14" y1="1" x2="14" y2="4" />
          </svg>
        ),
      },
      {
        id: 'general',
        name: t('template_general'),
        description: t('template_general_desc'),
        icon: (
          <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
            <rect x="9" y="3" width="6" height="4" rx="2" />
            <path d="M9 12h6" />
            <path d="M9 16h6" />
          </svg>
        ),
      },
      {
        id: 'custom',
        name: t('template_custom'),
        description: t('template_custom_desc'),
        icon: (
          <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        ),
      },
    ];

    const [selectedTemplate, setSelectedTemplate] = useState('general');

    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-muted p-4">
        <div className="w-full max-w-md">
          {/* Progress */}
          <div className="mb-8">
            <div className="mb-2 flex justify-between text-sm text-muted-foreground">
              <span>{t('step')} 2 {t('of')} 3</span>
              <span>66%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-secondary">
              <div className="h-full w-2/3 bg-primary transition-all" />
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
            <div className="mb-6 text-center">
              <h2 className="mb-2 text-xl font-semibold">{t('template_title')}</h2>
              <p className="text-sm text-muted-foreground">{t('template_description')}</p>
            </div>

            <div className="space-y-3">
              {templates.map(template => (
                <button
                  type="button"
                  key={template.id}
                  onClick={() => setSelectedTemplate(template.id)}
                  className={`flex w-full items-start gap-4 rounded-lg border p-4 text-left transition-colors ${
                    selectedTemplate === template.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className={`flex size-10 shrink-0 items-center justify-center rounded-full ${
                    selectedTemplate === template.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}>
                    {template.icon}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{template.name}</p>
                    <p className="text-sm text-muted-foreground">{template.description}</p>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setStep('location')}
                className={buttonVariants({ variant: 'outline', className: 'flex-1' })}
              >
                {t('back')}
              </button>
              <button
                type="button"
                onClick={() => setStep('complete')}
                className={buttonVariants({ className: 'flex-1' })}
              >
                {t('continue')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Step 4: Complete
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted p-4">
      <div className="w-full max-w-md text-center">
        {/* Progress */}
        <div className="mb-8">
          <div className="mb-2 flex justify-between text-sm text-muted-foreground">
            <span>{t('step')} 3 {t('of')} 3</span>
            <span>100%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-secondary">
            <div className="h-full w-full bg-primary transition-all" />
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-8 shadow-sm">
          <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <svg
              className="size-10 text-green-600"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          <h2 className="mb-2 text-2xl font-bold">{t('complete_title')}</h2>
          <p className="mb-8 text-muted-foreground">{t('complete_description')}</p>

          <div className="space-y-3">
            <button
              type="button"
              onClick={handleComplete}
              className={buttonVariants({ size: 'lg', className: 'w-full' })}
            >
              {t('go_to_dashboard')}
            </button>
            <button
              type="button"
              onClick={() => router.push('/dashboard/audits/new')}
              className={buttonVariants({ variant: 'outline', size: 'lg', className: 'w-full' })}
            >
              {t('start_first_audit')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingPage;

