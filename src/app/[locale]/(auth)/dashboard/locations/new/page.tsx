'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { createLocation } from '@/actions/supabase';
import { buttonVariants } from '@/components/ui/buttonVariants';
import { TitleBar } from '@/features/dashboard/TitleBar';

export default function NewLocationPage() {
  const t = useTranslations('NewLocation');
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await createLocation(formData);

    if (result.success) {
      router.push('/dashboard/locations');
    } else {
      setError(result.error || 'Failed to create location');
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <TitleBar
        title={t('title_bar')}
        description={t('title_bar_description')}
      />

      <form onSubmit={handleSubmit} className="mx-auto max-w-2xl">
        {error && (
          <div className="mb-6 rounded-lg border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Location Details Card */}
        <div className="mb-6 rounded-lg border border-border bg-card p-6 shadow-sm">
          <h3 className="mb-4 font-semibold">{t('location_details')}</h3>

          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="mb-1 block text-sm font-medium">
                {t('location_name')} *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                placeholder={t('location_name_placeholder')}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="address" className="mb-1 block text-sm font-medium">
                  {t('address')}
                </label>
                <input
                  type="text"
                  id="address"
                  name="address"
                  placeholder={t('address_placeholder')}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="city" className="mb-1 block text-sm font-medium">
                  {t('city')}
                </label>
                <input
                  type="text"
                  id="city"
                  name="city"
                  placeholder={t('city_placeholder')}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="postalCode" className="mb-1 block text-sm font-medium">
                  {t('postal_code')}
                </label>
                <input
                  type="text"
                  id="postalCode"
                  name="postalCode"
                  placeholder="1234 AB"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="country" className="mb-1 block text-sm font-medium">
                  {t('country')}
                </label>
                <select
                  id="country"
                  name="country"
                  defaultValue="Netherlands"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="Netherlands">Nederland</option>
                  <option value="Belgium">België</option>
                  <option value="Germany">Duitsland</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Details Card */}
        <div className="mb-6 rounded-lg border border-border bg-card p-6 shadow-sm">
          <h3 className="mb-4 font-semibold">{t('contact_details')}</h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="phone" className="mb-1 block text-sm font-medium">
                {t('phone')}
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                placeholder="+31 6 12345678"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium">
                {t('email')}
              </label>
              <input
                type="email"
                id="email"
                name="email"
                placeholder="location@example.com"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Link
            href="/dashboard/locations"
            className={buttonVariants({ variant: 'outline', className: 'flex-1' })}
          >
            {t('cancel')}
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className={buttonVariants({ className: 'flex-1 disabled:opacity-50' })}
          >
            {isSubmitting ? t('saving') : t('save_location')}
          </button>
        </div>
      </form>
    </>
  );
}

