import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { getLocation, getLocationStats, getUserPermissions } from '@/actions/supabase';
import { buttonVariants } from '@/components/ui/buttonVariants';
import { TitleBar } from '@/features/dashboard/TitleBar';
import { LocationDetailHints } from '@/features/hints';
import { LocationQRCode } from '@/features/qrcode/LocationQRCode';

import { DeleteLocationButton } from './DeleteButton';

type Props = {
  params: { id: string; locale: string };
};

export default async function LocationDetailPage({ params }: Props) {
  const t = await getTranslations('Locations');
  const [location, stats, permissions] = await Promise.all([
    getLocation(params.id),
    getLocationStats(params.id),
    getUserPermissions(),
  ]);
  
  const isAdmin = permissions.isAdmin;
  
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

        {/* Performance Summary Card */}
        {stats && stats.totalAudits > 0 && (
          <div className="rounded-lg border border-border bg-card p-4 shadow-sm sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold">Performance Overview</h3>
              {stats.scoreTrend !== 0 && (
                <div className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
                  stats.scoreTrend > 0 
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30' 
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30'
                }`}>
                  {stats.scoreTrend > 0 ? (
                    <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="18 15 12 9 6 15" />
                    </svg>
                  ) : (
                    <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  )}
                  {Math.abs(stats.scoreTrend)}% trend
                </div>
              )}
            </div>
            
            {/* Score Display */}
            <div className="mb-4 flex items-center gap-4">
              <div className={`flex size-16 items-center justify-center rounded-full text-xl font-bold sm:size-20 sm:text-2xl ${
                stats.avgScore >= 70 
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30' 
                  : stats.avgScore >= 50 
                    ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30'
              }`}>
                {stats.avgScore}%
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.avgScore}%</p>
                <p className="text-sm text-muted-foreground">Average Score</p>
              </div>
            </div>

            {/* Mini Stats Grid */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg bg-muted/50 p-3 text-center">
                <div className="text-lg font-semibold">{stats.totalAudits}</div>
                <div className="text-xs text-muted-foreground">Total Audits</div>
              </div>
              <div className="rounded-lg bg-muted/50 p-3 text-center">
                <div className="text-lg font-semibold text-green-600">{stats.passRate}%</div>
                <div className="text-xs text-muted-foreground">Pass Rate</div>
              </div>
              <div className="rounded-lg bg-muted/50 p-3 text-center">
                <div className={`text-lg font-semibold ${stats.overdueActions > 0 ? 'text-red-600' : ''}`}>
                  {stats.openActions}
                </div>
                <div className="text-xs text-muted-foreground">Open Actions</div>
              </div>
              <div className="rounded-lg bg-muted/50 p-3 text-center">
                <div className="text-lg font-semibold">
                  {stats.lastAuditDate 
                    ? new Date(stats.lastAuditDate).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
                    : '-'}
                </div>
                <div className="text-xs text-muted-foreground">Last Audit</div>
              </div>
            </div>

            {/* Score History Mini Chart */}
            {stats.monthlyScores.length >= 2 && (
              <div className="mt-4 border-t border-border pt-4">
                <p className="mb-2 text-xs text-muted-foreground">Recent Scores</p>
                <div className="flex items-end gap-1.5 sm:gap-2">
                  {stats.monthlyScores.map((entry, idx) => (
                    <div key={idx} className="flex flex-1 flex-col items-center gap-1">
                      <div 
                        className={`w-full rounded-t ${
                          entry.score >= 70 ? 'bg-green-500' : entry.score >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ height: `${Math.max(entry.score * 0.6, 8)}px` }}
                      />
                      <span className="text-xs text-muted-foreground">{entry.score}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Overdue Alert */}
            {stats.overdueActions > 0 && (
              <Link 
                href={`/dashboard/actions?location=${location.id}&overdue=true`}
                className="mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm transition-colors hover:bg-red-100 dark:border-red-900 dark:bg-red-950/50"
              >
                <svg className="size-4 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <span className="font-medium text-red-800 dark:text-red-200">
                  {stats.overdueActions} overdue {stats.overdueActions === 1 ? 'action' : 'actions'}
                </span>
              </Link>
            )}
          </div>
        )}

        {/* No Audits Yet */}
        {(!stats || stats.totalAudits === 0) && (
          <div className="rounded-lg border border-dashed border-border bg-muted/20 p-6 text-center">
            <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-muted">
              <svg className="size-6 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                <rect x="9" y="3" width="6" height="4" rx="2" />
              </svg>
            </div>
            <p className="mb-1 font-medium">No audits yet</p>
            <p className="mb-4 text-sm text-muted-foreground">Start your first audit for this location</p>
            <Link 
              href={`/dashboard/audits/new?locationId=${location.id}`}
              className={buttonVariants({ size: 'sm' })}
            >
              Start First Audit
            </Link>
          </div>
        )}

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
            {isAdmin && (
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
            )}
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
                {isAdmin && (
                  <p className="text-sm text-muted-foreground">
                    <Link href={`/dashboard/locations/${location.id}/edit`} className="text-primary hover:underline">
                      Wijs een manager toe
                    </Link>
                  </p>
                )}
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

        {/* QR Code Section */}
        {location.qr_code_token && (
          <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="size-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                </svg>
                <h3 className="font-semibold">Quick Access QR Code</h3>
              </div>
              <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                location.qr_code_enabled 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {location.qr_code_enabled ? 'Active' : 'Disabled'}
              </span>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">
              Print or share this QR code. Team members can scan it to instantly start an audit at this location.
            </p>
            <LocationQRCode
              locationName={location.name}
              qrToken={location.qr_code_token}
              size={180}
            />
          </div>
        )}

        {/* Danger Zone - Admin Only */}
        {isAdmin && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-6">
            <h3 className="mb-2 font-semibold text-destructive">Danger Zone</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Deleting this location will also delete all associated audits and actions.
            </p>
            <DeleteLocationButton locationId={location.id} locationName={location.name} />
          </div>
        )}

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

