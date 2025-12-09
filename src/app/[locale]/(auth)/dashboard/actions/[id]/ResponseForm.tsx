'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { submitActionResponse } from '@/actions/supabase';
import { PhotoUpload } from '@/components/audit/PhotoUpload';
import { buttonVariants } from '@/components/ui/buttonVariants';

export function ActionResponseForm({ actionId }: { actionId: string }) {
  const t = useTranslations('ActionDetail');
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [response, setResponse] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData();
    formData.set('responseText', response);
    formData.set('responsePhotos', JSON.stringify(photos));

    const result = await submitActionResponse(actionId, formData);

    if (result.success) {
      router.refresh();
    } else {
      alert(result.error || 'Failed to submit response');
    }

    setIsSubmitting(false);
  }

  if (!showForm) {
    return (
      <button
        type="button"
        onClick={() => setShowForm(true)}
        className={buttonVariants({ size: 'lg', className: 'w-full' })}
      >
        {t('respond_to_action')}
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-border bg-card p-6 shadow-sm">
      <h3 className="mb-4 font-semibold">{t('submit_response')}</h3>

      <div className="mb-4">
        <label htmlFor="response" className="mb-1 block text-sm font-medium">
          {t('response_description')}
        </label>
        <textarea
          id="response"
          rows={4}
          required
          value={response}
          onChange={e => setResponse(e.target.value)}
          placeholder={t('response_placeholder')}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>

      {/* Photo Upload */}
      <div className="mb-4">
        <label className="mb-2 block text-sm font-medium">
          Proof Photos (optional)
        </label>
        <PhotoUpload
          bucket="action-photos"
          photos={photos}
          onPhotosChange={setPhotos}
          maxPhotos={5}
        />
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setShowForm(false)}
          disabled={isSubmitting}
          className={buttonVariants({ variant: 'outline', className: 'flex-1' })}
        >
          {t('cancel')}
        </button>
        <button
          type="submit"
          disabled={isSubmitting || !response}
          className={buttonVariants({ className: 'flex-1 disabled:opacity-50' })}
        >
          {isSubmitting ? t('submitting') : t('submit')}
        </button>
      </div>
    </form>
  );
}
