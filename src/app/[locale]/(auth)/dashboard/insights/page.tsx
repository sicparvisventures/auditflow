import Link from 'next/link';

import { getInsightsDashboard, type AuditInsight, type RiskLevel } from '@/actions/insights';
import { getLocations } from '@/actions/supabase';
import { AdminOnly } from '@/components/AdminOnly';
import { FilterBar } from '@/components/filters';
import { buttonVariants } from '@/components/ui/buttonVariants';
import { TitleBar } from '@/features/dashboard/TitleBar';

import { ExportInsightsButton } from './ExportInsightsButton';

type Props = {
  searchParams: { [key: string]: string | string[] | undefined };
};

export default async function InsightsPage({ searchParams }: Props) {
  // Parse filter params
  const filters = {
    dateFrom: searchParams.dateFrom as string | undefined,
    dateTo: searchParams.dateTo as string | undefined,
    locationId: searchParams.location as string | undefined,
  };

  const [data, locations] = await Promise.all([
    getInsightsDashboard(filters),
    getLocations(),
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
      placeholder: 'Start date',
    },
    {
      key: 'dateTo',
      label: 'To',
      type: 'date' as const,
      placeholder: 'End date',
    },
  ];

  if (!data) {
    return (
      <AdminOnly>
        <TitleBar
          title="AI Insights"
          description="Intelligent analysis and predictions for your audit program"
        />
        <FilterBar filters={filterConfig} />
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-muted">
            <svg className="size-8 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4" />
              <path d="M12 8h.01" />
            </svg>
          </div>
          <p className="text-muted-foreground">Unable to generate insights. Please try again later.</p>
        </div>
      </AdminOnly>
    );
  }

  const { complianceHealth, locationRisks, insights, weeklyForecast, topPerformers, attentionNeeded, aiInsights, isAIEnabled, dataStats } = data;

  return (
    <AdminOnly>
      <TitleBar
        title="AI Insights"
        description="Intelligent analysis and predictions for your audit program"
      />

      {/* Filters */}
      <FilterBar filters={filterConfig} />

      {/* Data Stats & Export */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 p-3">
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            {dataStats.dateRange.from} - {dataStats.dateRange.to}
          </span>
          <span>{dataStats.totalAudits} audits</span>
          <span>{dataStats.totalLocations} locations</span>
          <span>{dataStats.totalActions} actions</span>
          {isAIEnabled && (
            <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2a10 10 0 1 0 10 10H12V2z" />
              </svg>
              AI Enhanced
            </span>
          )}
        </div>
        <ExportInsightsButton filters={filters} />
      </div>

      {/* AI Summary Card */}
      {aiInsights && (
        <div className="mb-6 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/5 p-4 sm:p-6">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
              <svg className="size-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2a10 10 0 1 0 10 10H12V2z" />
                <path d="M12 12l8-8" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </div>
            <h2 className="font-semibold">AI Analysis Summary</h2>
            <span className="ml-auto text-xs text-muted-foreground">
              Generated {new Date(aiInsights.generatedAt).toLocaleString()}
            </span>
          </div>
          <p className="mb-4 text-sm leading-relaxed text-foreground">{aiInsights.summary}</p>
          
          {aiInsights.recommendations.length > 0 && (
            <div className="mb-4">
              <h3 className="mb-2 text-sm font-medium">Recommendations</h3>
              <ul className="space-y-1.5">
                {aiInsights.recommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <svg className="mt-0.5 size-4 shrink-0 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="9 11 12 14 22 4" />
                      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                    </svg>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-background/50 p-3">
              <h4 className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Risk Analysis</h4>
              <p className="text-sm">{aiInsights.riskAnalysis}</p>
            </div>
            <div className="rounded-lg bg-background/50 p-3">
              <h4 className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Forecast</h4>
              <p className="text-sm">{aiInsights.forecast}</p>
            </div>
          </div>
        </div>
      )}

      {/* Compliance Health Card */}
      <div className="mb-6 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="p-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="mb-1 text-sm font-medium uppercase tracking-wider text-muted-foreground">
                Compliance Health Score
              </h2>
              <div className="flex items-baseline gap-3">
                <span className={`text-5xl font-bold ${
                  complianceHealth.grade === 'A' ? 'text-green-600' :
                  complianceHealth.grade === 'B' ? 'text-emerald-600' :
                  complianceHealth.grade === 'C' ? 'text-yellow-600' :
                  complianceHealth.grade === 'D' ? 'text-orange-600' : 'text-red-600'
                }`}>
                  {complianceHealth.grade}
                </span>
                <span className="text-3xl text-muted-foreground">{complianceHealth.overallScore}/100</span>
                {complianceHealth.trend !== 0 && (
                  <span className={`flex items-center gap-1 rounded-full px-2 py-1 text-sm font-medium ${
                    complianceHealth.trend > 0 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {complianceHealth.trend > 0 ? (
                      <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="18 15 12 9 6 15" />
                      </svg>
                    ) : (
                      <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    )}
                    {Math.abs(complianceHealth.trend)}%
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Your organization is {complianceHealth.benchmarkComparison === 'above' ? 'performing above' : 
                complianceHealth.benchmarkComparison === 'average' ? 'meeting' : 'below'} industry standards
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <HealthMetric label="Pass Rate" value={complianceHealth.breakdown.passRate} suffix="%" />
              <HealthMetric label="Coverage" value={complianceHealth.breakdown.auditFrequency} suffix="%" />
              <HealthMetric label="Action Completion" value={complianceHealth.breakdown.actionCompletion} suffix="%" />
              <HealthMetric label="Avg Response" value={complianceHealth.breakdown.responseTime} suffix=" days" inverse />
            </div>
          </div>
        </div>
      </div>

      {/* Insights Grid */}
      {insights.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-4 font-semibold">Key Insights</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {insights.map(insight => (
              <InsightCard key={insight.id} insight={insight} />
            ))}
          </div>
        </div>
      )}

      {/* Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Risk Assessment */}
        <div className="rounded-lg border border-border bg-card p-4 shadow-sm sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">Location Risk Assessment</h3>
            <Link href="/dashboard/benchmarking" className="text-sm text-primary hover:underline">
              View All
            </Link>
          </div>
          
          {locationRisks.length > 0 ? (
            <div className="space-y-3">
              {locationRisks.slice(0, 5).map(location => (
                <Link
                  key={location.locationId}
                  href={`/dashboard/locations/${location.locationId}`}
                  className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted"
                >
                  <RiskBadge level={location.riskLevel} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{location.locationName}</p>
                    <p className="truncate text-xs text-muted-foreground">{location.factors[0]}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{location.lastAuditScore}%</p>
                    <TrendIndicator trend={location.trend} />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-muted-foreground">No locations to analyze</p>
          )}
        </div>

        {/* Performance Forecast */}
        <div className="rounded-lg border border-border bg-card p-4 shadow-sm sm:p-6">
          <h3 className="mb-4 font-semibold">4-Week Forecast</h3>
          
          <div className="space-y-4">
            {weeklyForecast.map((week) => (
              <div key={week.week} className="flex items-center gap-4">
                <div className="w-16 text-sm text-muted-foreground">{week.week}</div>
                <div className="flex-1">
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span>{week.predictedAudits} audits</span>
                    <span className="font-medium">{week.predictedScore}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div 
                      className={`h-full transition-all ${
                        week.predictedScore >= 80 ? 'bg-green-500' :
                        week.predictedScore >= 70 ? 'bg-emerald-500' :
                        week.predictedScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${week.predictedScore}%`, opacity: week.confidence / 100 }}
                    />
                  </div>
                </div>
                <div className="w-16 text-right text-xs text-muted-foreground">
                  {week.confidence}% conf.
                </div>
              </div>
            ))}
          </div>
          
          <p className="mt-4 text-xs text-muted-foreground">
            * Predictions based on historical patterns and current trends
          </p>
        </div>

        {/* Top Performers */}
        <div className="rounded-lg border border-border bg-card p-4 shadow-sm sm:p-6">
          <div className="mb-4 flex items-center gap-2">
            <svg className="size-5 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            <h3 className="font-semibold">Top Performers</h3>
          </div>
          
          {topPerformers.length > 0 ? (
            <div className="space-y-2">
              {topPerformers.map((location, index) => (
                <Link
                  key={location.locationId}
                  href={`/dashboard/locations/${location.locationId}`}
                  className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted"
                >
                  <div className={`flex size-8 items-center justify-center rounded-full text-sm font-bold ${
                    index === 0 ? 'bg-yellow-100 text-yellow-700' :
                    index === 1 ? 'bg-gray-100 text-gray-700' :
                    index === 2 ? 'bg-orange-100 text-orange-700' : 'bg-muted text-muted-foreground'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{location.locationName}</p>
                    {location.streak > 0 && (
                      <p className="flex items-center gap-1 text-xs text-green-600">
                        <svg className="size-3" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                        </svg>
                        {location.streak} audit pass streak
                      </p>
                    )}
                  </div>
                  <div className="text-lg font-bold text-green-600">{location.avgScore}%</div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-muted-foreground">Complete more audits to see top performers</p>
          )}
        </div>

        {/* Attention Needed */}
        <div className="rounded-lg border border-border bg-card p-4 shadow-sm sm:p-6">
          <div className="mb-4 flex items-center gap-2">
            <svg className="size-5 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <h3 className="font-semibold">Needs Attention</h3>
          </div>
          
          {attentionNeeded.length > 0 ? (
            <div className="space-y-2">
              {attentionNeeded.map(location => (
                <Link
                  key={location.locationId}
                  href={`/dashboard/locations/${location.locationId}`}
                  className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50/50 p-3 transition-colors hover:bg-red-100/50 dark:border-red-900 dark:bg-red-950/30 dark:hover:bg-red-950/50"
                >
                  <RiskBadge level={location.urgency} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{location.locationName}</p>
                    <p className="truncate text-xs text-red-600">{location.reason}</p>
                  </div>
                  <svg className="size-5 shrink-0 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-green-100">
                <svg className="size-6 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <p className="text-muted-foreground">All locations are performing well!</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-6 flex flex-wrap gap-2">
        <Link href="/dashboard/audits/new" className={buttonVariants({ size: 'sm' })}>
          Start New Audit
        </Link>
        <Link href="/dashboard/analytics" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
          View Detailed Analytics
        </Link>
        <Link href="/dashboard/reports" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
          Generate Report
        </Link>
      </div>
    </AdminOnly>
  );
}

// Helper Components
function HealthMetric({ label, value, suffix, inverse }: { 
  label: string; 
  value: number; 
  suffix: string;
  inverse?: boolean;
}) {
  const isGood = inverse ? value <= 5 : value >= 70;
  const isMedium = inverse ? value <= 10 : value >= 50;
  
  return (
    <div className="rounded-lg bg-muted/50 p-3 text-center">
      <div className={`text-lg font-bold ${
        isGood ? 'text-green-600' : isMedium ? 'text-yellow-600' : 'text-red-600'
      }`}>
        {value}{suffix}
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function RiskBadge({ level }: { level: RiskLevel }) {
  const config = {
    critical: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', label: 'Critical' },
    high: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400', label: 'High' },
    medium: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400', label: 'Medium' },
    low: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', label: 'Low' },
  };
  
  const { bg, text, label } = config[level];
  
  return (
    <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium ${bg} ${text}`}>
      {label}
    </span>
  );
}

function TrendIndicator({ trend }: { trend: 'improving' | 'stable' | 'declining' }) {
  if (trend === 'improving') {
    return (
      <span className="flex items-center gap-0.5 text-xs text-green-600">
        <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="18 15 12 9 6 15" />
        </svg>
        Improving
      </span>
    );
  }
  if (trend === 'declining') {
    return (
      <span className="flex items-center gap-0.5 text-xs text-red-600">
        <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="6 9 12 15 18 9" />
        </svg>
        Declining
      </span>
    );
  }
  return (
    <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
      <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
      Stable
    </span>
  );
}

function InsightCard({ insight }: { insight: AuditInsight }) {
  const typeConfig = {
    warning: { 
      bg: 'border-orange-200 bg-orange-50/50 dark:border-orange-900 dark:bg-orange-950/30',
      iconBg: 'bg-orange-100 dark:bg-orange-900/50',
      iconColor: 'text-orange-600',
    },
    opportunity: { 
      bg: 'border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/30',
      iconBg: 'bg-blue-100 dark:bg-blue-900/50',
      iconColor: 'text-blue-600',
    },
    achievement: { 
      bg: 'border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/30',
      iconBg: 'bg-green-100 dark:bg-green-900/50',
      iconColor: 'text-green-600',
    },
    prediction: { 
      bg: 'border-purple-200 bg-purple-50/50 dark:border-purple-900 dark:bg-purple-950/30',
      iconBg: 'bg-purple-100 dark:bg-purple-900/50',
      iconColor: 'text-purple-600',
    },
  };
  
  const config = typeConfig[insight.type];
  
  const InsightIcon = () => {
    if (insight.type === 'warning') {
      return (
        <svg className={`size-4 ${config.iconColor}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      );
    }
    if (insight.type === 'opportunity') {
      return (
        <svg className={`size-4 ${config.iconColor}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      );
    }
    if (insight.type === 'achievement') {
      return (
        <svg className={`size-4 ${config.iconColor}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      );
    }
    return (
      <svg className={`size-4 ${config.iconColor}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2a10 10 0 1 0 10 10H12V2z" />
        <path d="M21.2 8.4c.5.4.8 1 .8 1.6" />
      </svg>
    );
  };
  
  return (
    <div className={`rounded-lg border p-4 ${config.bg}`}>
      <div className="mb-2 flex items-start gap-3">
        <div className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${config.iconBg}`}>
          <InsightIcon />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="font-medium leading-tight">{insight.title}</h4>
          {insight.metric && (
            <p className="mt-0.5 text-xs font-medium text-primary">{insight.metric}</p>
          )}
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
          insight.priority === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400' :
          insight.priority === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400' :
          'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
        }`}>
          {insight.priority}
        </span>
      </div>
      <p className="text-sm text-muted-foreground">{insight.description}</p>
      {insight.suggestedAction && (
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-background/50 p-2">
          <svg className="mt-0.5 size-4 shrink-0 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <p className="text-xs font-medium text-primary">Suggested: {insight.suggestedAction}</p>
        </div>
      )}
    </div>
  );
}
