import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { getLocations, getUserPermissions, type LocationFilters } from '@/actions/supabase';
import { FilterBar } from '@/components/filters';
import { buttonVariants } from '@/components/ui/buttonVariants';
import { TitleBar } from '@/features/dashboard/TitleBar';
import { LocationsPageHints } from '@/features/hints';

type Props = {
  searchParams: { [key: string]: string | string[] | undefined };
};

export default async function LocationsPage({ searchParams }: Props) {
  const t = await getTranslations('Locations');
  
  // Get user permissions
  const permissions = await getUserPermissions();
  const isAdmin = permissions.isAdmin;
  
  // Get all locations first to extract unique cities (already filtered by role)
  const allLocations = await getLocations();
  const cities = [...new Set(allLocations.filter(l => l.city).map(l => l.city as string))].sort();
  
  // Parse search params into filters
  const filters: LocationFilters = {
    status: searchParams.status as string,
    search: searchParams.search as string,
    city: searchParams.city as string,
  };
  
  const locations = await getLocations(filters);

  // Build filter config
  const filterConfig = [
    {
      key: 'search',
      label: 'Search',
      type: 'search' as const,
      placeholder: 'Search locations...',
    },
    {
      key: 'status',
      label: 'Status',
      type: 'select' as const,
      placeholder: 'All statuses',
      options: [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
      ],
    },
    {
      key: 'city',
      label: 'City',
      type: 'select' as const,
      placeholder: 'All cities',
      options: cities.map(city => ({
        value: city,
        label: city,
      })),
    },
  ];

  const hasFilters = Object.values(filters).some(v => v && v !== 'all');

  return (
    <>
      <TitleBar
        title={t('title_bar')}
        description={t('title_bar_description')}
      />

      {/* Contextual Hints */}
      <LocationsPageHints hasLocations={locations.length > 0} />

      {/* Filters */}
      <FilterBar filters={filterConfig} />

      {/* Actions Bar */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-muted-foreground">
          {locations.length} {locations.length === 1 ? 'location' : 'locations'}
          {hasFilters && ' (filtered)'}
          {!isAdmin && locations.length > 0 && ' (assigned to you)'}
        </div>
        {isAdmin && (
          <Link
            href="/dashboard/locations/new"
            className={buttonVariants({ size: 'sm' })}
          >
            <svg
              className="mr-2 size-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            {t('add_location')}
          </Link>
        )}
      </div>

      {/* Locations Grid */}
      {locations.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {locations.map(location => (
            <Link
              key={location.id}
              href={`/dashboard/locations/${location.id}`}
              className="group rounded-lg border border-border bg-card p-5 shadow-sm transition-all hover:border-primary hover:shadow-md"
            >
              {/* Header */}
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h3 className="font-semibold group-hover:text-primary">
                    {location.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {location.address && `${location.address}, `}{location.city || 'No address'}
                  </p>
                </div>
                <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                  location.status === 'active'
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30'
                    : 'bg-gray-100 text-gray-700 dark:bg-gray-800'
                }`}>
                  {location.status === 'active' ? t('active') : t('inactive')}
                </span>
              </div>

              {/* Manager Info */}
              <div className="mb-4 flex items-center gap-3 rounded-md bg-muted/50 p-3">
                {location.manager ? (
                  <>
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      {location.manager.avatar_url ? (
                        <img 
                          src={location.manager.avatar_url} 
                          alt={location.manager.full_name || 'Manager'} 
                          className="size-9 rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-sm font-semibold text-primary">
                          {(location.manager.first_name?.[0] || location.manager.email[0] || 'M').toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {location.manager.full_name || location.manager.email}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {t('manager')}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
                      <svg className="size-5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-muted-foreground">
                        Geen manager
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* Contact Info */}
              {(location.phone || location.email) && (
                <div className="mb-4 space-y-1 text-sm text-muted-foreground">
                  {location.phone && (
                    <div className="flex items-center gap-2">
                      <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                      </svg>
                      {location.phone}
                    </div>
                  )}
                  {location.email && (
                    <div className="flex items-center gap-2">
                      <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                        <polyline points="22,6 12,13 2,6" />
                      </svg>
                      {location.email}
                    </div>
                  )}
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between border-t border-border pt-4 text-sm">
                <span className="text-muted-foreground">
                  Added {new Date(location.created_at).toLocaleDateString('nl-NL')}
                </span>
                <svg
                  className="size-5 text-muted-foreground transition-transform group-hover:translate-x-1"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="rounded-lg border border-border bg-card p-12 text-center shadow-sm">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-muted">
            <svg
              className="size-8 text-muted-foreground"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 21h18" />
              <path d="M5 21V7l8-4v18" />
              <path d="M19 21V11l-6-4" />
            </svg>
          </div>
          <h3 className="mb-2 text-lg font-semibold">
            {hasFilters 
              ? 'No matching locations' 
              : isAdmin 
                ? t('no_locations') 
                : 'No locations assigned'
            }
          </h3>
          <p className="mb-6 text-muted-foreground">
            {hasFilters 
              ? 'Try adjusting your filters' 
              : isAdmin 
                ? t('add_first_location')
                : 'Contact your administrator to be assigned to a location.'
            }
          </p>
          {isAdmin && (
            <Link href="/dashboard/locations/new" className={buttonVariants()}>
              {t('add_location')}
            </Link>
          )}
        </div>
      )}
    </>
  );
}
