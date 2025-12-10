import { SignUp } from '@clerk/nextjs';
import { getTranslations } from 'next-intl/server';

import { getI18nPath } from '@/utils/Helpers';

export async function generateMetadata(props: { params: { locale: string } }) {
  const t = await getTranslations({
    locale: props.params.locale,
    namespace: 'SignUp',
  });

  return {
    title: 'Accept Invitation - AuditFlow',
    description: 'Accept your invitation to join an organization on AuditFlow',
  };
}

/**
 * This page handles organization invitation acceptance.
 * When a user clicks the invitation link from their email,
 * they are redirected here to create their account.
 */
const AcceptInvitationPage = (props: { params: { locale: string } }) => (
  <div className="w-full max-w-md">
    <div className="mb-6 text-center">
      <h1 className="text-2xl font-bold">Welcome to AuditFlow</h1>
      <p className="mt-2 text-muted-foreground">
        Create your account to join your team
      </p>
    </div>
    
    <SignUp
      path={getI18nPath('/accept-invitation', props.params.locale)}
      signInUrl={getI18nPath('/sign-in', props.params.locale)}
      forceRedirectUrl="/dashboard"
      fallbackRedirectUrl="/dashboard"
      appearance={{
        elements: {
          rootBox: 'w-full',
          card: 'w-full shadow-none border-0',
          footer: 'hidden',
          footerAction: 'hidden',
          footerPages: 'hidden',
        },
      }}
    />
  </div>
);

export default AcceptInvitationPage;
