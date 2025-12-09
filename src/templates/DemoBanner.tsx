import Link from 'next/link';

import { StickyBanner } from '@/features/landing/StickyBanner';

export const DemoBanner = () => (
  <StickyBanner>
    🎉 Start your 14-day free trial today -
    {' '}
    <Link href="/sign-up" className="font-semibold underline">
      Get Started Free
    </Link>
  </StickyBanner>
);
