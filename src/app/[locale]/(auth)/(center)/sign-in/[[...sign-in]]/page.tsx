import { SignIn } from '@clerk/nextjs';
import { getTranslations } from 'next-intl/server';

import { getI18nPath } from '@/utils/Helpers';

export async function generateMetadata(props: { params: { locale: string } }) {
  const t = await getTranslations({
    locale: props.params.locale,
    namespace: 'SignIn',
  });

  return {
    title: t('meta_title'),
    description: t('meta_description'),
  };
}

const SignInPage = (props: { params: { locale: string } }) => (
  <SignIn
    path={getI18nPath('/sign-in', props.params.locale)}
    signUpUrl={getI18nPath('/sign-up', props.params.locale)}
    forceRedirectUrl="/dashboard"
    fallbackRedirectUrl="/dashboard"
    appearance={{
      elements: {
        footer: 'hidden',
        footerAction: 'hidden',
        footerPages: 'hidden',
      },
    }}
  />
);

export default SignInPage;
