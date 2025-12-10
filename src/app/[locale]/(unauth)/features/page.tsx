import { getTranslations, unstable_setRequestLocale } from 'next-intl/server';

import { FeaturesPage } from '@/templates/FeaturesPage';

export async function generateMetadata(props: { params: { locale: string } }) {
  const t = await getTranslations({
    locale: props.params.locale,
    namespace: 'FeaturesPage',
  });

  return {
    title: t('meta_title'),
    description: t('meta_description'),
  };
}

const Features = (props: { params: { locale: string } }) => {
  unstable_setRequestLocale(props.params.locale);

  return <FeaturesPage />;
};

export default Features;
