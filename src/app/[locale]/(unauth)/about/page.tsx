import { getTranslations, unstable_setRequestLocale } from 'next-intl/server';

import { AboutPage } from '@/templates/AboutPage';

export async function generateMetadata(props: { params: { locale: string } }) {
  const t = await getTranslations({
    locale: props.params.locale,
    namespace: 'AboutPage',
  });

  return {
    title: t('meta_title'),
    description: t('meta_description'),
  };
}

const About = (props: { params: { locale: string } }) => {
  unstable_setRequestLocale(props.params.locale);

  return <AboutPage />;
};

export default About;
