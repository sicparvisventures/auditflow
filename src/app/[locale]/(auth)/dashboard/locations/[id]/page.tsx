import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { getLocation } from '@/actions/supabase';
import { buttonVariants } from '@/components/ui/buttonVariants';
import { TitleBar } from '@/features/dashboard/TitleBar';
import { LocationDetailHints } from '@/features/hints';

import { DeleteLocationButton } from './DeleteButton';

type Props = {
  params: { id: string; locale: string };
};

export default async function LocationDetailPage({ params }: Props) {
  const t = await getTranslations('Locations');
  const location = await getLocation(params.id);
  
  // Manager is now included in location data
  const manager = location?.manager;

  if (!location) {
    notFound();
  }

  return (
    <>
      <TitleBar
        title={location.name}
        description={`${location.address || ''} ${location.city || ''}`.trim() || 'No address'}
      />

      {/* Contextual Hints */}
      <LocationDetailHints />

      <div className="mx-auto max-w-2xl space-y-6">
        {/* Status Badge */}
        <div className="flex items-center gap-3">
          <span className={`rounded-full px-3 py-1 text-sm font-medium ${
            location.status === 'active'
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30'
              : 'bg-gray-100 text-gray-700 dark:bg-gray-800'
          }`}>
            {location.status === 'active' ? t('active') : t('inactive')}
          </span>
        </div>

        {/* Details Card */}
        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <h3 className="mb-4 font-semibold">Location Details</h3>
          
          <dl className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <dt className="text-sm text-muted-foreground">{t('address')}</dt>
              <dd className="col-span-2">{location.address || '-'}</dd>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <dt className="text-sm text-muted-foreground">City</dt>
              <dd className="col-span-2">{location.city || '-'}</dd>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <dt className="text-sm text-muted-foreground">Postal Code</dt>
              <dd className="col-span-2">{location.postal_code || '-'}</dd>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <dt className="text-sm text-muted-foreground">Country</dt>
              <dd className="col-span-2">{location.country || '-'}</dd>
            </div>
          </dl>
        </div>

        {/* Contact Card */}
        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <h3 className="mb-4 font-semibold">Contact Information</h3>
          
          <dl className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <dt className="text-sm text-muted-foreground">{t('phone')}</dt>
              <dd className="col-span-2">
                {location.phone ? (
                  <a href={`tel:${location.phone}`} className="text-primary hover:underline">
                    {location.phone}
                  </a>
                ) : '-'}
              </dd>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <dt className="text-sm text-muted-foreground">{t('email')}</dt>
              <dd className="col-span-2">
                {location.email ? (
                  <a href={`mailto:${location.email}`} className="text-primary hover:underline">
                    {location.email}
                  </a>
                ) : '-'}
              </dd>
            </div>
          </dl>
        </div>

        {/* Manager Card */}
        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">{t('manager')}</h3>
            <Link
              href={`/dashboard/locations/${location.id}/edit`}
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              <svg className="mr-2 size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              {t('edit_location')}
            </Link>
          </div>
          
          {manager ? (
            <div className="flex items-center gap-4">
              <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
                <span className="text-lg font-semibold text-primary">
                  {(manager.first_name?.[0] || manager.email[0] || 'M').toUpperCase()}
                </span>
              </div>
              <div>
                <p className="font-medium">{manager.full_name || manager.email}</p>
                <p className="text-sm text-muted-foreground">{manager.email}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4 rounded-lg border border-dashed border-border p-4">
              <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                <svg className="size-6 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-muted-foreground">Geen manager toegewezen</p>
                <p className="text-sm text-muted-foreground">
                  <Link href={`/dashboard/locations/${location.id}/edit`} className="text-primary hover:underline">
                    Wijs een manager toe
                  </Link>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <h3 className="mb-4 font-semibold">Quick Actions</h3>
          
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/dashboard/audits/new?locationId=${location.id}`}
              className={buttonVariants({ size: 'sm' })}
            >
              <svg className="mr-2 size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                <rect x="9" y="3" width="6" height="4" rx="2" />
              </svg>
              Start Audit
            </Link>
            <Link
              href={`/dashboard/audits?locationId=${location.id}`}
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              View Audits
            </Link>
            <Link
              href={`/dashboard/actions?locationId=${location.id}`}
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              View Actions
            </Link>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-6">
          <h3 className="mb-2 font-semibold text-destructive">Danger Zone</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Deleting this location will also delete all associated audits and actions.
          </p>
          <DeleteLocationButton locationId={location.id} locationName={location.name} />
        </div>

        {/* Back Link */}
        <Link
          href="/dashboard/locations"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to Locations
        </Link>
      </div>
    </>
  );
}

