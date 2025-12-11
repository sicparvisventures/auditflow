'use server';

import { auth } from '@clerk/nextjs/server';

import { createServiceClient, isSupabaseConfigured } from '@/libs/supabase/server';

// ============================================
// Types
// ============================================

export type LocationPerformance = {
  location_id: string;
  organization_id: string;
  location_name: string;
  city: string | null;
  manager_id: string | null;
  manager_name: string | null;
  total_audits: number;
  passed_audits: number;
  failed_audits: number;
  pass_rate: number;
  avg_score: number | null;
  total_actions: number;
  open_actions: number;
  verified_actions: number;
  overdue_actions: number;
  last_audit_date: string | null;
  first_audit_date: string | null;
  recent_avg_score: number | null;
};

export type MonthlyStats = {
  organization_id: string;
  month: string;
  total_audits: number;
  passed_audits: number;
  failed_audits: number;
  avg_score: number | null;
  pass_rate: number;
};

export type CategoryPerformance = {
  organization_id: string;
  category_id: string;
  category_name: string;
  template_id: string;
  template_name: string;
  total_checks: number;
  passed_checks: number;
  failed_checks: number;
  na_checks: number;
  pass_rate: number;
};

export type MostFailedItem = {
  organization_id: string;
  item_id: string;
  item_title: string;
  category_name: string;
  template_name: string;
  total_checks: number;
  fail_count: number;
  fail_rate: number;
};

export type InspectorPerformance = {
  organization_id: string;
  inspector_id: string;
  inspector_name: string;
  inspector_email: string;
  avatar_url: string | null;
  total_audits: number;
  passed_audits: number;
  avg_score: number | null;
  audits_this_month: number;
  pass_rate: number;
  last_audit_date: string | null;
  locations_audited: number;
};

// ============================================
// Helper: Get Organization ID
// ============================================

async function getOrganizationId(): Promise<string | null> {
  try {
    if (!isSupabaseConfigured()) return null;
    const { orgId } = await auth();
    if (!orgId) return null;
    
    const supabase = createServiceClient();
    const { data } = await supabase
      .from('organizations')
      .select('id')
      .eq('clerk_org_id', orgId)
      .single();
    
    return data?.id || null;
  } catch {
    return null;
  }
}

// ============================================
// Get Location Performance
// ============================================

export async function getLocationPerformance(): Promise<LocationPerformance[]> {
  try {
    const orgId = await getOrganizationId();
    if (!orgId) return [];

    const supabase = createServiceClient();
    
    const { data, error } = await supabase
      .from('location_performance')
      .select('*')
      .eq('organization_id', orgId)
      .order('total_audits', { ascending: false });

    if (error) {
      console.error('Error fetching location performance:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getLocationPerformance:', error);
    return [];
  }
}

// ============================================
// Get Monthly Audit Statistics
// ============================================

export async function getMonthlyAuditStats(
  months: number = 12
): Promise<MonthlyStats[]> {
  try {
    const orgId = await getOrganizationId();
    if (!orgId) return [];

    const supabase = createServiceClient();
    
    const { data, error } = await supabase
      .from('monthly_audit_stats')
      .select('*')
      .eq('organization_id', orgId)
      .order('month', { ascending: false })
      .limit(months);

    if (error) {
      console.error('Error fetching monthly stats:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getMonthlyAuditStats:', error);
    return [];
  }
}

// ============================================
// Get Category Performance
// ============================================

export async function getCategoryPerformance(): Promise<CategoryPerformance[]> {
  try {
    const orgId = await getOrganizationId();
    if (!orgId) return [];

    const supabase = createServiceClient();
    
    const { data, error } = await supabase
      .from('category_performance')
      .select('*')
      .eq('organization_id', orgId)
      .order('pass_rate', { ascending: true });

    if (error) {
      console.error('Error fetching category performance:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getCategoryPerformance:', error);
    return [];
  }
}

// ============================================
// Get Most Failed Items
// ============================================

export async function getMostFailedItems(
  limit: number = 10
): Promise<MostFailedItem[]> {
  try {
    const orgId = await getOrganizationId();
    if (!orgId) return [];

    const supabase = createServiceClient();
    
    const { data, error } = await supabase
      .from('most_failed_items')
      .select('*')
      .eq('organization_id', orgId)
      .limit(limit);

    if (error) {
      console.error('Error fetching most failed items:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getMostFailedItems:', error);
    return [];
  }
}

// ============================================
// Get Inspector Performance
// ============================================

export async function getInspectorPerformance(): Promise<InspectorPerformance[]> {
  try {
    const orgId = await getOrganizationId();
    if (!orgId) return [];

    const supabase = createServiceClient();
    
    const { data, error } = await supabase
      .from('inspector_performance')
      .select('*')
      .eq('organization_id', orgId)
      .order('total_audits', { ascending: false });

    if (error) {
      console.error('Error fetching inspector performance:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getInspectorPerformance:', error);
    return [];
  }
}

// ============================================
// Get Dashboard Summary
// ============================================

export async function getDashboardSummary() {
  try {
    const orgId = await getOrganizationId();
    if (!orgId) return null;

    const supabase = createServiceClient();
    
    const { data, error } = await supabase
      .from('dashboard_summary')
      .select('*')
      .eq('organization_id', orgId)
      .single();

    if (error) {
      console.error('Error fetching dashboard summary:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getDashboardSummary:', error);
    return null;
  }
}

// ============================================
// Get Trend Data (Score over time)
// ============================================

export async function getScoreTrend(
  locationId?: string,
  months: number = 6
): Promise<{ month: string; avg_score: number; audit_count: number }[]> {
  try {
    const orgId = await getOrganizationId();
    if (!orgId) return [];

    const supabase = createServiceClient();
    
    // Calculate date range
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);
    
    let query = supabase
      .from('audits')
      .select('audit_date, pass_percentage')
      .eq('organization_id', orgId)
      .eq('status', 'completed')
      .gte('audit_date', startDate.toISOString().split('T')[0])
      .order('audit_date', { ascending: true });
    
    if (locationId && locationId !== 'all') {
      query = query.eq('location_id', locationId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching score trend:', error);
      return [];
    }

    // Group by month
    const monthlyData: Record<string, { scores: number[]; count: number }> = {};
    
    (data || []).forEach(audit => {
      const month = audit.audit_date.substring(0, 7); // YYYY-MM
      if (!monthlyData[month]) {
        monthlyData[month] = { scores: [], count: 0 };
      }
      monthlyData[month].scores.push(audit.pass_percentage);
      monthlyData[month].count++;
    });

    return Object.entries(monthlyData).map(([month, data]) => ({
      month,
      avg_score: Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length),
      audit_count: data.count,
    }));
  } catch (error) {
    console.error('Error in getScoreTrend:', error);
    return [];
  }
}

// ============================================
// Get Action Status Distribution
// ============================================

export async function getActionStatusDistribution(): Promise<{
  status: string;
  urgency: string;
  count: number;
  overdue_count: number;
}[]> {
  try {
    const orgId = await getOrganizationId();
    if (!orgId) return [];

    const supabase = createServiceClient();
    
    const { data, error } = await supabase
      .from('action_status_distribution')
      .select('*')
      .eq('organization_id', orgId);

    if (error) {
      console.error('Error fetching action distribution:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getActionStatusDistribution:', error);
    return [];
  }
}

// ============================================
// Get Location Comparison
// ============================================

export async function getLocationComparison(): Promise<{
  locationId: string;
  locationName: string;
  currentScore: number;
  previousScore: number;
  trend: 'up' | 'down' | 'stable';
  trendValue: number;
}[]> {
  try {
    const performance = await getLocationPerformance();
    
    return performance
      .filter(loc => loc.total_audits >= 2)
      .map(loc => {
        const current = loc.recent_avg_score || loc.avg_score || 0;
        const previous = loc.avg_score || 0;
        const diff = current - previous;
        
        return {
          locationId: loc.location_id,
          locationName: loc.location_name,
          currentScore: Math.round(current),
          previousScore: Math.round(previous),
          trend: (diff > 2 ? 'up' : diff < -2 ? 'down' : 'stable') as 'up' | 'down' | 'stable',
          trendValue: Math.round(diff),
        };
      })
      .sort((a, b) => b.currentScore - a.currentScore);
  } catch (error) {
    console.error('Error in getLocationComparison:', error);
    return [];
  }
}
