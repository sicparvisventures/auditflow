import Link from 'next/link';

import { getLocationPerformance, getLocationComparison } from '@/actions/analytics';
import { getLocationGroups, getGroupPerformance } from '@/actions/location-groups';
import { getLocations } from '@/actions/supabase';
import { TitleBar } from '@/features/dashboard/TitleBar';

export default async function BenchmarkingPage() {
  const [locations, groups, groupPerformance, locationPerformance, locationComparison] = await Promise.all([
    getLocations(),
    getLocationGroups(),
    getGroupPerformance(),
    getLocationPerformance(),
    getLocationComparison(),
  ]);

  // Calculate overall averages
  const avgScore = locationPerformance.length > 0
    ? Math.round(locationPerformance.reduce((sum, l) => sum + (l.avg_score ?? 0), 0) / locationPerformance.length)
    : 0;

  const topPerformers = [...locationPerformance]
    .filter(l => l.total_audits > 0)
    .sort((a, b) => (b.avg_score ?? 0) - (a.avg_score ?? 0))
    .slice(0, 5);

  const needsImprovement = [...locationPerformance]
    .filter(l => l.total_audits > 0)
    .sort((a, b) => (a.avg_score ?? 0) - (b.avg_score ?? 0))
    .slice(0, 5);

  return (
    <>
      <TitleBar
        title="Benchmarking"
        description="Compare performance across locations and regions"
      />

      {/* Summary Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <div className="rounded-lg border border-border bg-card p-3 text-center shadow-sm sm:p-4">
          <div className="text-xl font-bold sm:text-2xl">{locations.length}</div>
          <div className="text-xs text-muted-foreground">Locations</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 text-center shadow-sm sm:p-4">
          <div className="text-xl font-bold sm:text-2xl">{groups.length}</div>
          <div className="text-xs text-muted-foreground">Regions</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 text-center shadow-sm sm:p-4">
          <div className={`text-xl font-bold sm:text-2xl ${avgScore >= 70 ? 'text-green-600' : 'text-red-600'}`}>
            {avgScore}%
          </div>
          <div className="text-xs text-muted-foreground">Avg Score</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 text-center shadow-sm sm:p-4">
          <div className="text-xl font-bold text-primary sm:text-2xl">
            {locationPerformance.reduce((sum, l) => sum + l.total_audits, 0)}
          </div>
          <div className="text-xs text-muted-foreground">Total Audits</div>
        </div>
      </div>

      {/* Regional Performance */}
      {groupPerformance.length > 0 && (
        <div className="mb-8 rounded-lg border border-border bg-card p-4 shadow-sm sm:p-6">
          <h3 className="mb-4 text-lg font-semibold">Regional Performance</h3>
          <div className="space-y-4">
            {groupPerformance.map(group => (
              <div key={group.group_id} className="rounded-lg border border-border p-3 sm:p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">{group.group_name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {group.location_count} locations • {group.completed_audits} audits
                    </p>
                  </div>
                  <div className={`text-2xl font-bold ${
                    group.avg_score >= 70 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {Math.round(group.avg_score)}%
                  </div>
                </div>
                
                {/* Progress bar */}
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div 
                    className={`h-full transition-all ${
                      group.avg_score >= 70 ? 'bg-green-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${group.avg_score}%` }}
                  />
                </div>
                
                <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                  <span>{group.passed_audits} passed / {group.failed_audits} failed</span>
                  <span>{group.open_actions} open actions</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Location Comparison */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Performers */}
        <div className="rounded-lg border border-border bg-card p-4 shadow-sm sm:p-6">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-full bg-green-100 text-green-600">
              <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </div>
            <h3 className="font-semibold">Top Performers</h3>
          </div>
          
          {topPerformers.length > 0 ? (
            <div className="space-y-3">
              {topPerformers.map((loc, index) => (
                <Link
                  key={loc.location_id}
                  href={`/dashboard/locations/${loc.location_id}`}
                  className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted"
                >
                  <div className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                    index === 0 ? 'bg-yellow-100 text-yellow-700' :
                    index === 1 ? 'bg-gray-100 text-gray-600' :
                    index === 2 ? 'bg-orange-100 text-orange-700' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{loc.location_name}</p>
                    <p className="text-xs text-muted-foreground">{loc.total_audits} audits</p>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-green-600">{Math.round(loc.avg_score ?? 0)}%</div>
                    <p className="text-xs text-muted-foreground">{loc.pass_rate}% pass rate</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground">No data yet</p>
          )}
        </div>

        {/* Needs Improvement */}
        <div className="rounded-lg border border-border bg-card p-4 shadow-sm sm:p-6">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-full bg-red-100 text-red-600">
              <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h3 className="font-semibold">Needs Improvement</h3>
          </div>
          
          {needsImprovement.length > 0 ? (
            <div className="space-y-3">
              {needsImprovement.map(loc => (
                <Link
                  key={loc.location_id}
                  href={`/dashboard/locations/${loc.location_id}`}
                  className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted"
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-red-100">
                    <svg className="size-4 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
                      <polyline points="17 18 23 18 23 12" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{loc.location_name}</p>
                    <p className="text-xs text-muted-foreground">{loc.total_audits} audits</p>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-red-600">{Math.round(loc.avg_score ?? 0)}%</div>
                    <p className="text-xs text-muted-foreground">{loc.open_actions} open actions</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground">No data yet</p>
          )}
        </div>
      </div>

      {/* All Locations Comparison Table */}
      <div className="mt-8 rounded-lg border border-border bg-card p-4 shadow-sm sm:p-6">
        <h3 className="mb-4 font-semibold">All Locations Comparison</h3>
        
        {locationComparison.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-border text-left text-sm text-muted-foreground">
                  <th className="pb-3 font-medium">Location</th>
                  <th className="pb-3 text-center font-medium">Current Score</th>
                  <th className="pb-3 text-center font-medium">Previous</th>
                  <th className="pb-3 text-center font-medium">Trend</th>
                  <th className="pb-3 text-center font-medium">vs Avg</th>
                </tr>
              </thead>
              <tbody>
                {locationComparison.map(loc => {
                  const vsAvg = loc.currentScore - avgScore;
                  return (
                    <tr key={loc.locationId} className="border-b border-border last:border-0">
                      <td className="py-3">
                        <Link 
                          href={`/dashboard/locations/${loc.locationId}`}
                          className="font-medium hover:text-primary"
                        >
                          {loc.locationName}
                        </Link>
                      </td>
                      <td className="py-3 text-center">
                        <span className={`font-bold ${
                          loc.currentScore >= 70 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {Math.round(loc.currentScore)}%
                        </span>
                      </td>
                      <td className="py-3 text-center text-muted-foreground">
                        {Math.round(loc.previousScore)}%
                      </td>
                      <td className="py-3 text-center">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                          loc.trend === 'up' ? 'bg-green-100 text-green-700' :
                          loc.trend === 'down' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {loc.trend === 'up' ? '↑' : loc.trend === 'down' ? '↓' : '→'}
                          {Math.abs(loc.trendValue).toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3 text-center">
                        <span className={`font-medium ${
                          vsAvg >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {vsAvg >= 0 ? '+' : ''}{vsAvg.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex h-32 items-center justify-center text-muted-foreground">
            No comparison data available yet
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="mt-6 flex flex-wrap gap-2">
        <Link
          href="/dashboard/analytics"
          className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
        >
          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 3v18h18" />
            <path d="M7 16l4-8 4 4 4-8" />
          </svg>
          View Analytics
        </Link>
        <Link
          href="/dashboard/settings/regions"
          className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
        >
          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 21h18" />
            <path d="M5 21V7l8-4v18" />
            <path d="M19 21V11l-6-4" />
          </svg>
          Manage Regions
        </Link>
      </div>
    </>
  );
}


