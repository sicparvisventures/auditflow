import type { LocalePrefix } from 'node_modules/next-intl/dist/types/src/routing/types';

import { BILLING_INTERVAL, type PricingPlan } from '@/types/Subscription';

const localePrefix: LocalePrefix = 'as-needed';

// AuditFlow Configuration
export const AppConfig = {
  name: 'AuditFlow',
  tagline: 'Streamline Your Audits',
  description: 'Professional audit management platform for restaurants, retail, and hospitality businesses.',
  locales: [
    {
      id: 'en',
      name: 'English',
    },
    { id: 'nl', name: 'Nederlands' },
  ],
  defaultLocale: 'en',
  localePrefix,
};

export const AllLocales = AppConfig.locales.map(locale => locale.id);

export const PLAN_ID = {
  STARTER: 'starter',
  PROFESSIONAL: 'professional',
  ENTERPRISE: 'enterprise',
} as const;

export const PricingPlanList: Record<string, PricingPlan> = {
  [PLAN_ID.STARTER]: {
    id: PLAN_ID.STARTER,
    price: 29,
    interval: BILLING_INTERVAL.MONTH,
    testPriceId: 'price_starter_test',
    devPriceId: '',
    prodPriceId: '',
    features: {
      teamMember: 3, // 3 users
      website: 2, // 2 locations
      storage: 10, // 10 audits/month
      transfer: 1, // 1 GB photo storage
    },
  },
  [PLAN_ID.PROFESSIONAL]: {
    id: PLAN_ID.PROFESSIONAL,
    price: 79,
    interval: BILLING_INTERVAL.MONTH,
    testPriceId: 'price_professional_test',
    devPriceId: '',
    prodPriceId: '',
    features: {
      teamMember: 15, // 15 users
      website: 10, // 10 locations
      storage: 50, // 50 audits/month
      transfer: 10, // 10 GB photo storage
    },
  },
  [PLAN_ID.ENTERPRISE]: {
    id: PLAN_ID.ENTERPRISE,
    price: 199,
    interval: BILLING_INTERVAL.MONTH,
    testPriceId: 'price_enterprise_test',
    devPriceId: '',
    prodPriceId: '',
    features: {
      teamMember: 100, // Unlimited users
      website: 100, // Unlimited locations
      storage: 500, // Unlimited audits
      transfer: 100, // 100 GB photo storage
    },
  },
};
