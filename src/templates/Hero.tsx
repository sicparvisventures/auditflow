import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { badgeVariants } from '@/components/ui/badgeVariants';
import { buttonVariants } from '@/components/ui/buttonVariants';
import { CenteredHero } from '@/features/landing/CenteredHero';
import { Section } from '@/features/landing/Section';

export const Hero = () => {
  const t = useTranslations('Hero');

  return (
    <Section className="overflow-hidden py-12 sm:py-16 md:py-24 lg:py-32">
      <CenteredHero
        logo={(
          <Image
            src="/logot.png"
            alt="AuditFlow Logo"
            width={80}
            height={80}
            className="size-16 object-contain md:size-20"
            priority
          />
        )}
        banner={(
          <span className={`${badgeVariants()} border-primary/20 bg-primary/5 text-primary hover:bg-primary/10`}>
            <span className="mr-1.5 inline-flex size-2 animate-pulse rounded-full bg-green-500" />
            {t('follow_twitter')}
          </span>
        )}
        title={t.rich('title', {
          important: chunks => (
            <span className="relative whitespace-nowrap">
              <span className="relative bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                {chunks}
              </span>
            </span>
          ),
        })}
        description={t('description')}
        buttons={(
          <>
            <Link
              className={`${buttonVariants({ size: 'lg' })} group w-full px-8 py-6 text-base font-semibold shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30 sm:w-auto`}
              href="/sign-up"
            >
              {t('primary_button')}
              <svg
                className="ml-2 size-4 transition-transform group-hover:translate-x-1"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </Link>

            <Link
              className={`${buttonVariants({ variant: 'outline', size: 'lg' })} group w-full px-8 py-6 text-base font-medium sm:w-auto`}
              href="#features"
            >
              <svg
                className="mr-2 size-5 text-primary"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" />
              </svg>
              {t('secondary_button')}
            </Link>
          </>
        )}
      />
    </Section>
  );
};
