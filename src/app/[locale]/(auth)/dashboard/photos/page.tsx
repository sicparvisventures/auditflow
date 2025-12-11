import Link from 'next/link';

import { getAudits, getLocations, getPhotoStats } from '@/actions/supabase';
import { FilterBar } from '@/components/filters';
import { TitleBar } from '@/features/dashboard/TitleBar';

type Props = {
  searchParams: { [key: string]: string | string[] | undefined };
};

export default async function PhotoGalleryPage({ searchParams }: Props) {
  const locationFilter = searchParams.location as string | undefined;
  
  const [locations, allAudits, photoStats] = await Promise.all([
    getLocations(),
    getAudits({ status: 'completed' }),
    getPhotoStats(locationFilter),
  ]);

  // Build filter config
  const filterConfig = [
    {
      key: 'location',
      label: 'Location',
      type: 'select' as const,
      placeholder: 'All locations',
      options: locations.map(loc => ({
        value: loc.id,
        label: loc.name,
      })),
    },
    {
      key: 'dateFrom',
      label: 'From',
      type: 'date' as const,
      placeholder: 'From date',
    },
    {
      key: 'dateTo',
      label: 'To',
      type: 'date' as const,
      placeholder: 'To date',
    },
  ];

  // Filter audits by location
  const filteredAudits = locationFilter 
    ? allAudits.filter(a => a.location_id === locationFilter)
    : allAudits;

  // Use photo stats for location grid
  const locationStats = photoStats.photosByLocation.length > 0 
    ? photoStats.photosByLocation.map(loc => ({
        id: loc.locationId,
        name: loc.locationName,
        photoCount: loc.photoCount,
        lastAudit: filteredAudits.find(a => a.location_id === loc.locationId)?.audit_date || null,
      }))
    : [...new Set(filteredAudits.map(a => a.location_id))].map(locId => {
        const loc = locations.find(l => l.id === locId);
        const locAudits = filteredAudits.filter(a => a.location_id === locId);
        return {
          id: locId,
          name: loc?.name || 'Unknown',
          photoCount: 0,
          lastAudit: locAudits[0]?.audit_date || null,
        };
      }).sort((a, b) => b.photoCount - a.photoCount);

  return (
    <>
      <TitleBar
        title="Photo Evidence"
        description="View all audit photos and evidence"
      />

      {/* Filters */}
      <FilterBar filters={filterConfig} />

      {/* Stats */}
      <div className="mb-6 grid grid-cols-3 gap-3 sm:gap-4">
        <div className="rounded-lg border border-border bg-card p-3 text-center shadow-sm sm:p-4">
          <div className="text-xl font-bold text-primary sm:text-2xl">{photoStats.totalPhotos}</div>
          <div className="text-xs text-muted-foreground">Total Photos</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 text-center shadow-sm sm:p-4">
          <div className="text-xl font-bold sm:text-2xl">{photoStats.auditsWithPhotos}</div>
          <div className="text-xs text-muted-foreground">Audits</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 text-center shadow-sm sm:p-4">
          <div className="text-xl font-bold sm:text-2xl">{locationStats.length}</div>
          <div className="text-xs text-muted-foreground">Locations</div>
        </div>
      </div>

      {/* Location Grid - Browse by location */}
      <h3 className="mb-4 font-semibold">Browse by Location</h3>
      {locationStats.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {locationStats.map(loc => (
            <Link
              key={loc.id}
              href={`/dashboard/locations/${loc.id}`}
              className="group rounded-lg border border-border bg-card p-4 shadow-sm transition-all hover:border-primary hover:shadow-md"
            >
              <div className="mb-3 flex items-center justify-between">
                <h4 className="truncate font-medium group-hover:text-primary">{loc.name}</h4>
                <span className="shrink-0 rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                  {loc.photoCount} photos
                </span>
              </div>
              
              {/* Photo indicator */}
              <div className="mb-3 flex items-center gap-2">
                <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                  <svg className="size-5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                </div>
                <div className="text-sm text-muted-foreground">
                  {loc.photoCount > 0 ? `${loc.photoCount} photo${loc.photoCount !== 1 ? 's' : ''} captured` : 'No photos yet'}
                </div>
              </div>
              
              <p className="text-xs text-muted-foreground">
                Last audit: {loc.lastAudit 
                  ? new Date(loc.lastAudit).toLocaleDateString('nl-NL') 
                  : 'Never'}
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card p-12 text-center shadow-sm">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-muted">
            <svg className="size-8 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
          <h3 className="mb-2 text-lg font-semibold">No Photos Yet</h3>
          <p className="text-muted-foreground">
            Photos will appear here when you complete audits with photo evidence.
          </p>
        </div>
      )}

      {/* Recent Audits with Photos */}
      {filteredAudits.length > 0 && (
        <div className="mt-8">
          <h3 className="mb-4 font-semibold">Recent Audits</h3>
          <div className="space-y-3">
            {filteredAudits.slice(0, 10).map(audit => (
              <Link
                key={audit.id}
                href={`/dashboard/audits/${audit.id}`}
                className="flex items-center gap-4 rounded-lg border border-border bg-card p-3 shadow-sm transition-colors hover:bg-muted sm:p-4"
              >
                {/* Score Circle */}
                <div className={`flex size-12 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                  audit.passed 
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30' 
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30'
                }`}>
                  {Math.round(audit.pass_percentage)}%
                </div>
                
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{audit.location?.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(audit.audit_date).toLocaleDateString('nl-NL', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                
                <svg className="size-5 shrink-0 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
