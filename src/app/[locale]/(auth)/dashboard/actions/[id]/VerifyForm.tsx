'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { verifyAction } from '@/actions/supabase';
import { buttonVariants } from '@/components/ui/buttonVariants';

export function VerifyActionForm({ actionId }: { actionId: string }) {
  const t = useTranslations('ActionDetail');
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleVerify(approved: boolean) {
    setIsSubmitting(true);

    const result = await verifyAction(actionId, approved);

    if (result.success) {
      router.push('/dashboard/actions');
    } else {
      alert(result.error || 'Failed to verify action');
    }

    setIsSubmitting(false);
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
      <h3 className="mb-4 font-semibold">{t('verify_response')}</h3>
      <p className="mb-4 text-sm text-muted-foreground">{t('verify_description')}</p>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => handleVerify(false)}
          disabled={isSubmitting}
          className={buttonVariants({ variant: 'outline', className: 'flex-1' })}
        >
          <svg className="mr-2 size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
          {t('reject')}
        </button>
        <button
          type="button"
          onClick={() => handleVerify(true)}
          disabled={isSubmitting}
          className={buttonVariants({ className: 'flex-1' })}
        >
          <svg className="mr-2 size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {t('approve')}
        </button>
      </div>
    </div>
  );
}

