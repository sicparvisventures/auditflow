import { getTranslations, unstable_setRequestLocale } from 'next-intl/server';

import { PricingPage } from '@/templates/PricingPage';

export async function generateMetadata(props: { params: { locale: string } }) {
  const t = await getTranslations({
    locale: props.params.locale,
    namespace: 'PricingPage',
  });

  return {
    title: t('meta_title'),
    description: t('meta_description'),
  };
}

const Pricing = (props: { params: { locale: string } }) => {
  unstable_setRequestLocale(props.params.locale);

  return <PricingPage />;
};

export default Pricing;


