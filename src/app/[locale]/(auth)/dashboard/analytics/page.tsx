import Link from 'next/link';

import {
  getCategoryPerformance,
  getInspectorPerformance,
  getLocationComparison,
  getMonthlyAuditStats,
  getMostFailedItems,
  getScoreTrend,
} from '@/actions/analytics';
import { AdminOnly } from '@/components/AdminOnly';
import { TitleBar } from '@/features/dashboard/TitleBar';

export default async function AnalyticsPage() {
  // Fetch all analytics data in parallel
  const [
    monthlyStats,
    scoreTrend,
    categoryPerformance,
    mostFailedItems,
    inspectorPerformance,
    locationComparison,
  ] = await Promise.all([
    getMonthlyAuditStats(12),
    getScoreTrend(undefined, 6),
    getCategoryPerformance(),
    getMostFailedItems(5),
    getInspectorPerformance(),
    getLocationComparison(),
  ]);

  return (
    <AdminOnly>
      <TitleBar
        title="Analytics"
        description="Detailed insights and trends across your organization"
      />

      {/* Score Trend Chart */}
      <div className="mb-8 rounded-lg border border-border bg-card p-6 shadow-sm">
        <h3 className="mb-4 font-semibold">Score Trend (Last 6 Months)</h3>
        {scoreTrend.length > 0 ? (
          <div className="space-y-3">
            {scoreTrend.map((month, index) => {
              const prevScore = index > 0 ? scoreTrend[index - 1]!.avg_score : month.avg_score;
              const trend = month.avg_score - prevScore;
              
              return (
                <div key={month.month} className="flex items-center gap-4">
                  <span className="w-16 text-sm text-muted-foreground">
                    {new Date(month.month + '-01').toLocaleDateString('en-US', { month: 'short' })}
                  </span>
                  <div className="flex-1">
                    <div className="h-8 overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full transition-all ${
                          month.avg_score >= 70 ? 'bg-green-500' : 
                          month.avg_score >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${month.avg_score}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex w-24 items-center justify-end gap-2">
                    <span className="font-medium">{month.avg_score}%</span>
                    {trend !== 0 && (
                      <span className={`flex items-center text-xs ${
                        trend > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {trend > 0 ? '↑' : '↓'}{Math.abs(Math.round(trend))}
                      </span>
                    )}
                  </div>
                  <span className="w-16 text-right text-xs text-muted-foreground">
                    {month.audit_count} audits
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex h-32 items-center justify-center text-muted-foreground">
            No data available
          </div>
        )}
      </div>

      {/* Grid Layout */}
      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        {/* Location Comparison */}
        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">Location Performance</h3>
            <Link href="/dashboard/reports" className="text-sm text-primary hover:underline">
              View Details
            </Link>
          </div>
          {locationComparison.length > 0 ? (
            <div className="space-y-3">
              {locationComparison.slice(0, 5).map((loc) => (
                <div key={loc.locationId} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{loc.locationName}</span>
                      <span className="text-sm">{loc.currentScore}%</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full ${
                          loc.currentScore >= 70 ? 'bg-green-500' : 
                          loc.currentScore >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${loc.currentScore}%` }}
                      />
                    </div>
                  </div>
                  <span className={`flex items-center gap-1 text-xs ${
                    loc.trend === 'up' ? 'text-green-600' : 
                    loc.trend === 'down' ? 'text-red-600' : 'text-muted-foreground'
                  }`}>
                    {loc.trend === 'up' && '↑'}
                    {loc.trend === 'down' && '↓'}
                    {loc.trend === 'stable' && '→'}
                    {loc.trendValue !== 0 && Math.abs(loc.trendValue)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-32 items-center justify-center text-muted-foreground">
              No data available
            </div>
          )}
        </div>

        {/* Most Failed Items */}
        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <h3 className="mb-4 font-semibold">Most Failed Checklist Items</h3>
          {mostFailedItems.length > 0 ? (
            <div className="space-y-3">
              {mostFailedItems.map((item, index) => (
                <div key={item.item_id} className="flex items-start gap-3">
                  <span className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                    index === 0 ? 'bg-red-100 text-red-700' : 'bg-muted text-muted-foreground'
                  }`}>
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium">{item.item_title}</p>
                    <p className="text-xs text-muted-foreground">{item.category_name}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium text-red-600">{item.fail_count}×</span>
                    <p className="text-xs text-muted-foreground">{item.fail_rate}% fail</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-32 items-center justify-center text-muted-foreground">
              No failed items yet
            </div>
          )}
        </div>
      </div>

      {/* Category Performance */}
      <div className="mb-8 rounded-lg border border-border bg-card p-6 shadow-sm">
        <h3 className="mb-4 font-semibold">Category Performance</h3>
        {categoryPerformance.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categoryPerformance.slice(0, 6).map((cat) => (
              <div key={cat.category_id} className="rounded-lg border border-border p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium truncate">{cat.category_name}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    cat.pass_rate >= 80 ? 'bg-green-100 text-green-700' :
                    cat.pass_rate >= 60 ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {cat.pass_rate}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full ${
                      cat.pass_rate >= 80 ? 'bg-green-500' :
                      cat.pass_rate >= 60 ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${cat.pass_rate}%` }}
                  />
                </div>
                <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                  <span>{cat.passed_checks} passed</span>
                  <span>{cat.failed_checks} failed</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-32 items-center justify-center text-muted-foreground">
            No category data yet
          </div>
        )}
      </div>

      {/* Inspector Performance */}
      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <h3 className="mb-4 font-semibold">Inspector Performance</h3>
        {inspectorPerformance.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left text-sm text-muted-foreground">
                  <th className="pb-3 font-medium">Inspector</th>
                  <th className="pb-3 text-center font-medium">Audits</th>
                  <th className="pb-3 text-center font-medium">This Month</th>
                  <th className="pb-3 text-center font-medium">Avg Score</th>
                  <th className="pb-3 text-center font-medium">Pass Rate</th>
                  <th className="hidden pb-3 text-center font-medium sm:table-cell">Locations</th>
                </tr>
              </thead>
              <tbody>
                {inspectorPerformance.map((inspector) => (
                  <tr key={inspector.inspector_id} className="border-b border-border last:border-0">
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        {inspector.avatar_url ? (
                          <img
                            src={inspector.avatar_url}
                            alt=""
                            className="size-8 rounded-full"
                          />
                        ) : (
                          <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                            {inspector.inspector_name?.charAt(0) || '?'}
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{inspector.inspector_name}</p>
                          <p className="text-xs text-muted-foreground">{inspector.inspector_email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 text-center">{inspector.total_audits}</td>
                    <td className="py-3 text-center">
                      <span className={inspector.audits_this_month > 0 ? 'font-medium text-primary' : ''}>
                        {inspector.audits_this_month}
                      </span>
                    </td>
                    <td className="py-3 text-center">
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                        (inspector.avg_score || 0) >= 70 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {inspector.avg_score || 0}%
                      </span>
                    </td>
                    <td className="py-3 text-center">{inspector.pass_rate}%</td>
                    <td className="hidden py-3 text-center sm:table-cell">
                      {inspector.locations_audited}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex h-32 items-center justify-center text-muted-foreground">
            No inspector data yet
          </div>
        )}
      </div>

      {/* Monthly Stats */}
      <div className="mt-8 rounded-lg border border-border bg-card p-6 shadow-sm">
        <h3 className="mb-4 font-semibold">Monthly Overview (Last 12 Months)</h3>
        {monthlyStats.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="pb-2 text-left font-medium">Month</th>
                  <th className="pb-2 text-center font-medium">Total</th>
                  <th className="pb-2 text-center font-medium">Passed</th>
                  <th className="pb-2 text-center font-medium">Failed</th>
                  <th className="pb-2 text-center font-medium">Avg Score</th>
                  <th className="pb-2 text-center font-medium">Pass Rate</th>
                </tr>
              </thead>
              <tbody>
                {monthlyStats.map((month) => (
                  <tr key={month.month} className="border-b border-border last:border-0">
                    <td className="py-2">
                      {new Date(month.month).toLocaleDateString('en-US', { 
                        month: 'short', 
                        year: 'numeric' 
                      })}
                    </td>
                    <td className="py-2 text-center font-medium">{month.total_audits}</td>
                    <td className="py-2 text-center text-green-600">{month.passed_audits}</td>
                    <td className="py-2 text-center text-red-600">{month.failed_audits}</td>
                    <td className="py-2 text-center">{month.avg_score || 0}%</td>
                    <td className="py-2 text-center">
                      <span className={`rounded px-2 py-0.5 text-xs ${
                        month.pass_rate >= 70 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {month.pass_rate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex h-32 items-center justify-center text-muted-foreground">
            No monthly data available
          </div>
        )}
      </div>
    </AdminOnly>
  );
}
