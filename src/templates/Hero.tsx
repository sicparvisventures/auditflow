import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { badgeVariants } from '@/components/ui/badgeVariants';
import { buttonVariants } from '@/components/ui/buttonVariants';
import { CenteredHero } from '@/features/landing/CenteredHero';
import { Section } from '@/features/landing/Section';

export const Hero = () => {
  const t = useTranslations('Hero');

  return (
    <Section className="py-20 md:py-36">
      <CenteredHero
        banner={(
          <span className={badgeVariants()}>
            <svg
              className="mr-1.5 size-4"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3v18" />
              <path d="M8 6h8" />
              <path d="M6 9h12" />
              <path d="M8 12h8" />
              <circle cx="12" cy="18" r="3" />
            </svg>
            {t('follow_twitter')}
          </span>
        )}
        title={t.rich('title', {
          important: chunks => (
            <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              {chunks}
            </span>
          ),
        })}
        description={t('description')}
        buttons={(
          <>
            <Link
              className={buttonVariants({ size: 'lg' })}
              href="/sign-up"
            >
              {t('primary_button')}
            </Link>

            <Link
              className={buttonVariants({ variant: 'outline', size: 'lg' })}
              href="#features"
            >
              <svg
                className="mr-2 size-5"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              {t('secondary_button')}
            </Link>
          </>
        )}
      />
    </Section>
  );
};
