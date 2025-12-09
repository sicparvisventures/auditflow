import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { LocaleSwitcher } from '@/components/LocaleSwitcher';
import { buttonVariants } from '@/components/ui/buttonVariants';
import { CenteredMenu } from '@/features/landing/CenteredMenu';
import { Section } from '@/features/landing/Section';

import { Logo } from './Logo';

export const Navbar = () => {
  const t = useTranslations('Navbar');

  return (
    <Section className="px-3 py-4 md:py-6">
      <CenteredMenu
        logo={<Logo />}
        rightMenu={(
          <>
            <li data-fade className="hidden md:block">
              <LocaleSwitcher />
            </li>
            <li className="ml-1 mr-2.5" data-fade>
              <Link href="/sign-in" className="text-sm font-medium hover:text-primary">
                {t('sign_in')}
              </Link>
            </li>
            <li>
              <Link className={buttonVariants({ size: 'sm' })} href="/sign-up">
                {t('sign_up')}
              </Link>
            </li>
          </>
        )}
      >
        <li>
          <Link href="#features" className="hover:text-primary">
            {t('features')}
          </Link>
        </li>

        <li>
          <Link href="#pricing" className="hover:text-primary">
            {t('pricing')}
          </Link>
        </li>

        <li>
          <Link href="#faq" className="hover:text-primary">
            {t('docs')}
          </Link>
        </li>

        <li>
          <Link href="#about" className="hover:text-primary">
            {t('about')}
          </Link>
        </li>
      </CenteredMenu>
    </Section>
  );
};
