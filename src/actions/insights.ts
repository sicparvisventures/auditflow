'use server';

import { generateAIInsights, isHuggingFaceConfigured, type AIInsightResult, type AuditDataForAI } from '@/libs/ai/huggingface';
import { createServiceClient } from '@/libs/supabase/server';
import { getOrganizationId } from './supabase';

// ============================================
// Types
// ============================================

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type LocationRiskScore = {
  locationId: string;
  locationName: string;
  riskScore: number;
  riskLevel: RiskLevel;
  factors: string[];
  predictedNextScore: number;
  lastAuditScore: number;
  auditCount: number;
  trend: 'improving' | 'stable' | 'declining';
};

export type AuditInsight = {
  id: string;
  type: 'warning' | 'opportunity' | 'achievement' | 'prediction';
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  metric?: string;
  actionable: boolean;
  suggestedAction?: string;
  relatedLocationId?: string;
  relatedLocationName?: string;
};

export type ComplianceHealth = {
  overallScore: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  trend: number;
  breakdown: {
    auditFrequency: number;
    passRate: number;
    actionCompletion: number;
    responseTime: number;
  };
  benchmarkComparison: 'above' | 'average' | 'below';
};

export type WeeklyForecast = {
  week: string;
  predictedAudits: number;
  predictedScore: number;
  confidence: number;
};

export type InsightsFilters = {
  dateFrom?: string;
  dateTo?: string;
  locationId?: string;
};

export type InsightsDashboard = {
  complianceHealth: ComplianceHealth;
  locationRisks: LocationRiskScore[];
  insights: AuditInsight[];
  weeklyForecast: WeeklyForecast[];
  topPerformers: { locationId: string; locationName: string; avgScore: number; streak: number }[];
  attentionNeeded: { locationId: string; locationName: string; reason: string; urgency: RiskLevel }[];
  aiInsights: AIInsightResult | null;
  isAIEnabled: boolean;
  dataStats: {
    totalAudits: number;
    totalLocations: number;
    totalActions: number;
    dateRange: { from: string; to: string };
  };
};

// ============================================
// Helper Functions
// ============================================

function calculateRiskLevel(score: number): RiskLevel {
  if (score >= 75) return 'critical';
  if (score >= 50) return 'high';
  if (score >= 25) return 'medium';
  return 'low';
}

function calculateGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

function calculateTrend(scores: number[]): 'improving' | 'stable' | 'declining' {
  if (scores.length < 2) return 'stable';
  
  const recentScores = scores.slice(-3);
  const avgRecent = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
  const olderScores = scores.slice(0, -3);
  
  if (olderScores.length === 0) return 'stable';
  
  const avgOlder = olderScores.reduce((a, b) => a + b, 0) / olderScores.length;
  const diff = avgRecent - avgOlder;
  
  if (diff > 5) return 'improving';
  if (diff < -5) return 'declining';
  return 'stable';
}

function predictNextScore(scores: number[]): number {
  if (scores.length === 0) return 70;
  if (scores.length === 1) return scores[0]!;
  
  const n = scores.length;
  const recentWeight = 0.7;
  const avgAll = scores.reduce((a, b) => a + b, 0) / n;
  const avgRecent = scores.slice(-3).reduce((a, b) => a + b, 0) / Math.min(3, scores.length);
  
  const prediction = avgRecent * recentWeight + avgAll * (1 - recentWeight);
  
  const trend = calculateTrend(scores);
  let adjustment = 0;
  if (trend === 'improving') adjustment = 3;
  if (trend === 'declining') adjustment = -3;
  
  return Math.min(100, Math.max(0, Math.round(prediction + adjustment)));
}

// ============================================
// Main Functions
// ============================================

export async function getInsightsDashboard(filters?: InsightsFilters): Promise<InsightsDashboard | null> {
  try {
    const orgId = await getOrganizationId();
    if (!orgId) return null;

    const supabase = createServiceClient();

    // Build date filter
    const dateFrom = filters?.dateFrom || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const dateTo = filters?.dateTo || new Date().toISOString().split('T')[0];

    // Fetch all required data in parallel
    let locationsQuery = supabase
      .from('locations')
      .select('id, name, status')
      .eq('organization_id', orgId)
      .eq('status', 'active');

    let auditsQuery = supabase
      .from('audits')
      .select('id, location_id, pass_percentage, passed, audit_date, status, completed_at')
      .eq('organization_id', orgId)
      .gte('audit_date', dateFrom)
      .lte('audit_date', dateTo)
      .order('audit_date', { ascending: false });

    let actionsQuery = supabase
      .from('actions')
      .select('id, status, urgency, deadline, created_at, completed_at, location_id')
      .eq('organization_id', orgId);

    // Apply location filter if specified
    if (filters?.locationId) {
      locationsQuery = locationsQuery.eq('id', filters.locationId);
      auditsQuery = auditsQuery.eq('location_id', filters.locationId);
      actionsQuery = actionsQuery.eq('location_id', filters.locationId);
    }

    const [locationsResult, auditsResult, actionsResult] = await Promise.all([
      locationsQuery,
      auditsQuery,
      actionsQuery,
    ]);

    const locations = locationsResult.data || [];
    const audits = auditsResult.data || [];
    const actions = actionsResult.data || [];

    // Calculate Compliance Health
    const complianceHealth = calculateComplianceHealth(locations, audits, actions);

    // Calculate Location Risk Scores
    const locationRisks = calculateLocationRisks(locations, audits, actions);

    // Get Top Performers
    const topPerformers = getTopPerformers(locations, audits);

    // Get Attention Needed
    const attentionNeeded = getAttentionNeeded(locationRisks, actions);

    // Generate Weekly Forecast
    const weeklyForecast = generateWeeklyForecast(audits);

    // Prepare data for AI analysis
    const completedAudits = audits.filter(a => a.status === 'completed');
    const avgScore = completedAudits.length > 0
      ? Math.round(completedAudits.reduce((sum, a) => sum + a.pass_percentage, 0) / completedAudits.length)
      : 0;
    const passedAudits = completedAudits.filter(a => a.passed);
    const passRate = completedAudits.length > 0
      ? Math.round((passedAudits.length / completedAudits.length) * 100)
      : 0;
    const completedActions = actions.filter(a => a.status === 'completed' || a.status === 'verified');
    const overdueActions = actions.filter(a => 
      a.deadline && 
      new Date(a.deadline) < new Date() && 
      !['completed', 'verified'].includes(a.status)
    );

    const aiDataInput: AuditDataForAI = {
      totalAudits: completedAudits.length,
      passRate,
      avgScore,
      scoreTrend: complianceHealth.trend,
      totalLocations: locations.length,
      openActions: actions.filter(a => !['completed', 'verified'].includes(a.status)).length,
      overdueActions: overdueActions.length,
      completedActions: completedActions.length,
      topLocation: topPerformers[0] ? { name: topPerformers[0].locationName, score: topPerformers[0].avgScore } : undefined,
      worstLocation: locationRisks[0] ? { name: locationRisks[0].locationName, score: locationRisks[0].lastAuditScore } : undefined,
      recentAudits: completedAudits.slice(0, 5).map(a => ({
        location: locations.find(l => l.id === a.location_id)?.name || 'Unknown',
        score: a.pass_percentage,
        date: a.audit_date,
      })),
    };

    // Generate AI insights
    const aiInsights = await generateAIInsights(aiDataInput);

    // Generate rule-based insights (always available)
    const insights = generateInsights(locations, audits, actions, locationRisks, complianceHealth);

    return {
      complianceHealth,
      locationRisks: locationRisks.slice(0, 10),
      insights: insights.slice(0, 8),
      weeklyForecast,
      topPerformers: topPerformers.slice(0, 5),
      attentionNeeded: attentionNeeded.slice(0, 5),
      aiInsights,
      isAIEnabled: isHuggingFaceConfigured(),
      dataStats: {
        totalAudits: completedAudits.length,
        totalLocations: locations.length,
        totalActions: actions.length,
        dateRange: { from: dateFrom || '', to: dateTo || '' },
      },
    };
  } catch (error) {
    console.error('Error generating insights dashboard:', error);
    return null;
  }
}

function calculateComplianceHealth(
  locations: any[],
  audits: any[],
  actions: any[]
): ComplianceHealth {
  const completedAudits = audits.filter(a => a.status === 'completed');
  const passedAudits = completedAudits.filter(a => a.passed);
  
  const passRate = completedAudits.length > 0 
    ? Math.round((passedAudits.length / completedAudits.length) * 100) 
    : 0;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentAudits = audits.filter(a => new Date(a.audit_date) >= thirtyDaysAgo);
  const locationsAudited = new Set(recentAudits.map(a => a.location_id));
  const auditFrequency = locations.length > 0
    ? Math.round((locationsAudited.size / locations.length) * 100)
    : 0;

  const completedActions = actions.filter(a => a.status === 'completed' || a.status === 'verified');
  const actionCompletion = actions.length > 0
    ? Math.round(((completedActions.length) / actions.length) * 100)
    : 100;

  const completedWithDates = completedActions.filter(a => a.created_at && a.completed_at);
  let avgResponseDays = 7;
  if (completedWithDates.length > 0) {
    const totalDays = completedWithDates.reduce((sum, a) => {
      const created = new Date(a.created_at);
      const completed = new Date(a.completed_at);
      return sum + Math.ceil((completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
    }, 0);
    avgResponseDays = Math.round(totalDays / completedWithDates.length);
  }
  const responseTimeScore = Math.max(0, Math.min(100, 100 - (avgResponseDays - 3) * 10));

  const overallScore = Math.round(
    passRate * 0.35 +
    auditFrequency * 0.25 +
    actionCompletion * 0.25 +
    responseTimeScore * 0.15
  );

  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
  const olderAudits = completedAudits.filter(a => {
    const date = new Date(a.audit_date);
    return date >= sixtyDaysAgo && date < thirtyDaysAgo;
  });
  const recentCompleted = completedAudits.filter(a => new Date(a.audit_date) >= thirtyDaysAgo);
  
  const recentAvg = recentCompleted.length > 0
    ? recentCompleted.reduce((sum, a) => sum + a.pass_percentage, 0) / recentCompleted.length
    : 0;
  const olderAvg = olderAudits.length > 0
    ? olderAudits.reduce((sum, a) => sum + a.pass_percentage, 0) / olderAudits.length
    : recentAvg;
  
  const trend = recentAvg - olderAvg;

  return {
    overallScore,
    grade: calculateGrade(overallScore),
    trend: Math.round(trend),
    breakdown: {
      auditFrequency,
      passRate,
      actionCompletion,
      responseTime: avgResponseDays,
    },
    benchmarkComparison: overallScore >= 80 ? 'above' : overallScore >= 60 ? 'average' : 'below',
  };
}

function calculateLocationRisks(
  locations: any[],
  audits: any[],
  actions: any[]
): LocationRiskScore[] {
  return locations.map(location => {
    const locationAudits = audits
      .filter(a => a.location_id === location.id && a.status === 'completed')
      .sort((a, b) => new Date(b.audit_date).getTime() - new Date(a.audit_date).getTime());
    
    const locationActions = actions.filter(a => a.location_id === location.id);
    const overdueActions = locationActions.filter(a => 
      a.deadline && 
      new Date(a.deadline) < new Date() && 
      !['completed', 'verified'].includes(a.status)
    );
    const pendingActions = locationActions.filter(a => 
      ['pending', 'in_progress'].includes(a.status)
    );

    const scores = locationAudits.map(a => a.pass_percentage);
    const lastScore = scores[0] ?? 70;
    const trend = calculateTrend(scores.slice().reverse());

    const factors: string[] = [];
    let riskScore = 0;

    if (lastScore < 70) {
      riskScore += 30;
      factors.push('Recent low audit score');
    } else if (lastScore < 80) {
      riskScore += 15;
    }

    if (trend === 'declining') {
      riskScore += 20;
      factors.push('Declining performance trend');
    }

    if (overdueActions.length > 0) {
      riskScore += Math.min(30, overdueActions.length * 10);
      factors.push(`${overdueActions.length} overdue action${overdueActions.length > 1 ? 's' : ''}`);
    }

    if (pendingActions.length > 5) {
      riskScore += 15;
      factors.push('High pending action backlog');
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const hasRecentAudit = locationAudits.some(a => new Date(a.audit_date) >= thirtyDaysAgo);
    if (!hasRecentAudit && locationAudits.length > 0) {
      riskScore += 10;
      factors.push('No recent audit');
    }

    if (locationAudits.length === 0) {
      riskScore += 25;
      factors.push('Never audited');
    }

    return {
      locationId: location.id,
      locationName: location.name,
      riskScore: Math.min(100, riskScore),
      riskLevel: calculateRiskLevel(riskScore),
      factors: factors.length > 0 ? factors : ['No risk factors identified'],
      predictedNextScore: predictNextScore(scores.slice().reverse()),
      lastAuditScore: lastScore,
      auditCount: locationAudits.length,
      trend,
    };
  }).sort((a, b) => b.riskScore - a.riskScore);
}

function generateInsights(
  locations: any[],
  audits: any[],
  actions: any[],
  locationRisks: LocationRiskScore[],
  complianceHealth: ComplianceHealth
): AuditInsight[] {
  const insights: AuditInsight[] = [];
  const completedAudits = audits.filter(a => a.status === 'completed');

  const highRiskLocations = locationRisks.filter(l => l.riskLevel === 'high' || l.riskLevel === 'critical');
  if (highRiskLocations.length > 0) {
    insights.push({
      id: 'high-risk-locations',
      type: 'warning',
      priority: 'high',
      title: `${highRiskLocations.length} High-Risk Location${highRiskLocations.length > 1 ? 's' : ''} Detected`,
      description: `${highRiskLocations.map(l => l.locationName).slice(0, 3).join(', ')}${highRiskLocations.length > 3 ? ' and others' : ''} require${highRiskLocations.length === 1 ? 's' : ''} immediate attention based on audit performance and action backlog.`,
      actionable: true,
      suggestedAction: 'Schedule priority audits for these locations this week',
    });
  }

  const overdueActions = actions.filter(a => 
    a.deadline && 
    new Date(a.deadline) < new Date() && 
    !['completed', 'verified'].includes(a.status)
  );
  if (overdueActions.length > 0) {
    insights.push({
      id: 'overdue-actions',
      type: 'warning',
      priority: overdueActions.length > 5 ? 'high' : 'medium',
      title: `${overdueActions.length} Overdue Action${overdueActions.length > 1 ? 's' : ''} Need Attention`,
      description: 'These actions have passed their deadline and are affecting your compliance score.',
      metric: `${Math.round((overdueActions.length / Math.max(actions.length, 1)) * 100)}% of open actions are overdue`,
      actionable: true,
      suggestedAction: 'Review and prioritize overdue actions or update deadlines if needed',
    });
  }

  const improvingLocations = locationRisks.filter(l => l.trend === 'improving' && l.auditCount >= 3);
  if (improvingLocations.length > 0) {
    insights.push({
      id: 'improving-trend',
      type: 'achievement',
      priority: 'low',
      title: `${improvingLocations.length} Location${improvingLocations.length > 1 ? 's' : ''} Showing Improvement`,
      description: `Great progress! ${improvingLocations.slice(0, 3).map(l => l.locationName).join(', ')} ${improvingLocations.length > 3 ? 'and others' : ''} are trending upward.`,
      actionable: false,
    });
  }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const locationsAudited = new Set(
    completedAudits
      .filter(a => new Date(a.audit_date) >= thirtyDaysAgo)
      .map(a => a.location_id)
  );
  const unauditedRecently = locations.filter(l => !locationsAudited.has(l.id));
  if (unauditedRecently.length > 0 && locations.length > 0) {
    const coverage = Math.round((locationsAudited.size / locations.length) * 100);
    insights.push({
      id: 'audit-coverage',
      type: 'opportunity',
      priority: coverage < 50 ? 'high' : 'medium',
      title: `Audit Coverage at ${coverage}%`,
      description: `${unauditedRecently.length} location${unauditedRecently.length > 1 ? 's have' : ' has'} not been audited in the last 30 days.`,
      metric: `${unauditedRecently.length} of ${locations.length} locations`,
      actionable: true,
      suggestedAction: 'Consider scheduling audits for uncovered locations',
    });
  }

  const avgPredictedScore = locationRisks.length > 0
    ? Math.round(locationRisks.reduce((sum, l) => sum + l.predictedNextScore, 0) / locationRisks.length)
    : 70;
  const currentAvg = completedAudits.length > 0
    ? Math.round(completedAudits.slice(0, 10).reduce((sum, a) => sum + a.pass_percentage, 0) / Math.min(10, completedAudits.length))
    : 70;
  
  insights.push({
    id: 'performance-prediction',
    type: 'prediction',
    priority: avgPredictedScore < currentAvg ? 'medium' : 'low',
    title: `Predicted Next Audit Average: ${avgPredictedScore}%`,
    description: avgPredictedScore >= currentAvg 
      ? 'Based on current trends, performance is expected to remain stable or improve.'
      : 'Trends suggest a potential dip in scores. Consider proactive measures.',
    metric: `${avgPredictedScore >= currentAvg ? '+' : ''}${avgPredictedScore - currentAvg}% vs current`,
    actionable: avgPredictedScore < currentAvg,
    suggestedAction: avgPredictedScore < currentAvg ? 'Focus on high-risk locations to prevent score decline' : undefined,
  });

  if (complianceHealth.grade === 'A' || complianceHealth.grade === 'B') {
    insights.push({
      id: 'compliance-excellence',
      type: 'achievement',
      priority: 'low',
      title: `Compliance Grade: ${complianceHealth.grade}`,
      description: `Your organization is ${complianceHealth.benchmarkComparison === 'above' ? 'performing above average' : 'meeting standards'}. Keep up the great work!`,
      metric: `${complianceHealth.overallScore}/100 overall score`,
      actionable: false,
    });
  } else if (complianceHealth.grade === 'D' || complianceHealth.grade === 'F') {
    insights.push({
      id: 'compliance-concern',
      type: 'warning',
      priority: 'high',
      title: `Compliance Grade: ${complianceHealth.grade} - Action Required`,
      description: 'Your compliance score indicates significant room for improvement. Focus on completing actions and increasing audit frequency.',
      metric: `${complianceHealth.overallScore}/100 overall score`,
      actionable: true,
      suggestedAction: 'Review the compliance breakdown and address the lowest scoring areas first',
    });
  }

  const completedActions = actions.filter(a => a.status === 'completed' || a.status === 'verified');
  if (actions.length > 10 && completedActions.length / actions.length < 0.5) {
    insights.push({
      id: 'action-completion',
      type: 'opportunity',
      priority: 'medium',
      title: 'Action Completion Rate Below Target',
      description: `Only ${Math.round((completedActions.length / actions.length) * 100)}% of actions are completed. This affects your compliance score.`,
      metric: `${completedActions.length}/${actions.length} completed`,
      actionable: true,
      suggestedAction: 'Review pending actions and close out completed items',
    });
  }

  return insights.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

function generateWeeklyForecast(audits: any[]): WeeklyForecast[] {
  const forecast: WeeklyForecast[] = [];
  const completedAudits = audits.filter(a => a.status === 'completed');
  
  const eightWeeksAgo = new Date();
  eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);
  const recentAudits = completedAudits.filter(a => new Date(a.audit_date) >= eightWeeksAgo);
  const avgPerWeek = Math.max(1, recentAudits.length / 8);
  
  const recentScores = completedAudits.slice(0, 20).map(a => a.pass_percentage);
  const avgScore = recentScores.length > 0 
    ? recentScores.reduce((a, b) => a + b, 0) / recentScores.length 
    : 70;

  for (let i = 1; i <= 4; i++) {
    const weekDate = new Date();
    weekDate.setDate(weekDate.getDate() + (i * 7));
    
    const variance = (Math.random() * 0.3 - 0.15);
    const predictedAudits = Math.max(1, Math.round(avgPerWeek * (1 + variance)));
    
    const scorePrediction = Math.round(avgScore * 0.95 + 70 * 0.05 + (Math.random() * 6 - 3));
    
    forecast.push({
      week: weekDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      predictedAudits,
      predictedScore: Math.min(100, Math.max(0, scorePrediction)),
      confidence: Math.max(60, 90 - (i * 5)),
    });
  }

  return forecast;
}

function getTopPerformers(locations: any[], audits: any[]): { locationId: string; locationName: string; avgScore: number; streak: number }[] {
  return locations.map(location => {
    const locationAudits = audits
      .filter(a => a.location_id === location.id && a.status === 'completed')
      .sort((a, b) => new Date(b.audit_date).getTime() - new Date(a.audit_date).getTime());
    
    if (locationAudits.length === 0) return null;
    
    const avgScore = Math.round(
      locationAudits.slice(0, 5).reduce((sum, a) => sum + a.pass_percentage, 0) / 
      Math.min(5, locationAudits.length)
    );
    
    let streak = 0;
    for (const audit of locationAudits) {
      if (audit.passed) streak++;
      else break;
    }
    
    return {
      locationId: location.id,
      locationName: location.name,
      avgScore,
      streak,
    };
  })
  .filter((l): l is NonNullable<typeof l> => l !== null && l.avgScore >= 80)
  .sort((a, b) => b.avgScore - a.avgScore || b.streak - a.streak);
}

function getAttentionNeeded(
  locationRisks: LocationRiskScore[],
  actions: any[]
): { locationId: string; locationName: string; reason: string; urgency: RiskLevel }[] {
  const attention: { locationId: string; locationName: string; reason: string; urgency: RiskLevel }[] = [];

  locationRisks
    .filter(l => l.riskLevel === 'critical' || l.riskLevel === 'high')
    .forEach(l => {
      attention.push({
        locationId: l.locationId,
        locationName: l.locationName,
        reason: l.factors[0] || 'High risk score',
        urgency: l.riskLevel,
      });
    });

  const criticalOverdue = actions.filter(a => 
    a.urgency === 'critical' &&
    a.deadline && 
    new Date(a.deadline) < new Date() && 
    !['completed', 'verified'].includes(a.status)
  );

  const locationIds = new Set(attention.map(a => a.locationId));
  criticalOverdue.forEach(action => {
    if (!locationIds.has(action.location_id)) {
      const risk = locationRisks.find(l => l.locationId === action.location_id);
      if (risk) {
        attention.push({
          locationId: action.location_id,
          locationName: risk.locationName,
          reason: 'Critical overdue action',
          urgency: 'critical',
        });
        locationIds.add(action.location_id);
      }
    }
  });

  return attention.sort((a, b) => {
    const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
  });
}

// Export for PDF generation
export async function getInsightsForExport(filters?: InsightsFilters) {
  return getInsightsDashboard(filters);
}
