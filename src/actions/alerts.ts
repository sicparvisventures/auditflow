'use server';

import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';

import { createServiceClient, isSupabaseConfigured } from '@/libs/supabase/server';

// ============================================
// Types
// ============================================

export type AlertSeverity = 'info' | 'warning' | 'urgent' | 'critical';
export type AlertStatus = 'active' | 'acknowledged' | 'resolved' | 'dismissed';
export type AlertType = 
  | 'score_drop'
  | 'consecutive_failures'
  | 'action_overdue'
  | 'audit_overdue'
  | 'critical_finding'
  | 'trend_decline'
  | 'compliance_risk'
  | 'safety_risk';

export type TrendAlert = {
  id: string;
  organization_id: string;
  alert_type: AlertType;
  severity: AlertSeverity;
  status: AlertStatus;
  location_id: string | null;
  group_id: string | null;
  audit_id: string | null;
  action_id: string | null;
  title: string;
  message: string;
  current_value: number | null;
  threshold_value: number | null;
  previous_value: number | null;
  change_percentage: number | null;
  triggered_at: string;
  acknowledged_at: string | null;
  acknowledged_by_id: string | null;
  resolved_at: string | null;
  resolved_by_id: string | null;
  resolution_notes: string | null;
  created_at: string;
  // Joined data
  location_name?: string;
  group_name?: string;
  audit_score?: number;
  audit_date?: string;
};

export type AlertStats = {
  active_alerts: number;
  critical_alerts: number;
  urgent_alerts: number;
  warning_alerts: number;
  acknowledged_alerts: number;
  resolved_this_week: number;
  avg_resolution_hours: number | null;
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

async function getCurrentUserId(): Promise<string | null> {
  try {
    if (!isSupabaseConfigured()) return null;
    const { userId } = await auth();
    if (!userId) return null;

    const supabase = createServiceClient();
    const { data } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_user_id', userId)
      .single();

    return data?.id || null;
  } catch {
    return null;
  }
}

// ============================================
// Get Active Alerts
// ============================================

export async function getActiveAlerts(filters?: {
  severity?: AlertSeverity;
  type?: AlertType;
  locationId?: string;
  limit?: number;
}): Promise<TrendAlert[]> {
  try {
    const orgId = await getOrganizationId();
    if (!orgId) return [];

    const supabase = createServiceClient();
    
    let query = supabase
      .from('trend_alerts')
      .select(`
        *,
        location:locations(name),
        group:location_groups(name),
        audit:audits(audit_date, pass_percentage)
      `)
      .eq('organization_id', orgId)
      .eq('status', 'active')
      .order('triggered_at', { ascending: false });

    if (filters?.severity) {
      query = query.eq('severity', filters.severity);
    }
    if (filters?.type) {
      query = query.eq('alert_type', filters.type);
    }
    if (filters?.locationId) {
      query = query.eq('location_id', filters.locationId);
    }
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching active alerts:', error);
      return [];
    }

    return (data || []).map(alert => ({
      ...alert,
      location_name: (alert.location as any)?.name,
      group_name: (alert.group as any)?.name,
      audit_score: (alert.audit as any)?.pass_percentage,
      audit_date: (alert.audit as any)?.audit_date,
      location: undefined,
      group: undefined,
      audit: undefined,
    }));
  } catch (error) {
    console.error('Error in getActiveAlerts:', error);
    return [];
  }
}

// ============================================
// Get All Alerts (with history)
// ============================================

export async function getAllAlerts(filters?: {
  status?: AlertStatus;
  severity?: AlertSeverity;
  type?: AlertType;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
}): Promise<TrendAlert[]> {
  try {
    const orgId = await getOrganizationId();
    if (!orgId) return [];

    const supabase = createServiceClient();
    
    let query = supabase
      .from('trend_alerts')
      .select(`
        *,
        location:locations(name),
        group:location_groups(name),
        audit:audits(audit_date, pass_percentage)
      `)
      .eq('organization_id', orgId)
      .order('triggered_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.severity) {
      query = query.eq('severity', filters.severity);
    }
    if (filters?.type) {
      query = query.eq('alert_type', filters.type);
    }
    if (filters?.dateFrom) {
      query = query.gte('triggered_at', filters.dateFrom);
    }
    if (filters?.dateTo) {
      query = query.lte('triggered_at', filters.dateTo);
    }
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching alerts:', error);
      return [];
    }

    return (data || []).map(alert => ({
      ...alert,
      location_name: (alert.location as any)?.name,
      group_name: (alert.group as any)?.name,
      audit_score: (alert.audit as any)?.pass_percentage,
      audit_date: (alert.audit as any)?.audit_date,
      location: undefined,
      group: undefined,
      audit: undefined,
    }));
  } catch (error) {
    console.error('Error in getAllAlerts:', error);
    return [];
  }
}

// ============================================
// Get Alert Statistics
// ============================================

export async function getAlertStats(): Promise<AlertStats | null> {
  try {
    const orgId = await getOrganizationId();
    if (!orgId) return null;

    const supabase = createServiceClient();
    
    const { data, error } = await supabase
      .from('alert_statistics')
      .select('*')
      .eq('organization_id', orgId)
      .single();

    if (error) {
      console.error('Error fetching alert stats:', error);
      return {
        active_alerts: 0,
        critical_alerts: 0,
        urgent_alerts: 0,
        warning_alerts: 0,
        acknowledged_alerts: 0,
        resolved_this_week: 0,
        avg_resolution_hours: null,
      };
    }

    return data;
  } catch (error) {
    console.error('Error in getAlertStats:', error);
    return null;
  }
}

// ============================================
// Acknowledge Alert
// ============================================

export async function acknowledgeAlert(alertId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const orgId = await getOrganizationId();
    const userId = await getCurrentUserId();
    if (!orgId || !userId) {
      return { success: false, error: 'Not authenticated' };
    }

    const supabase = createServiceClient();

    const { error } = await supabase
      .from('trend_alerts')
      .update({
        status: 'acknowledged',
        acknowledged_at: new Date().toISOString(),
        acknowledged_by_id: userId,
      })
      .eq('id', alertId)
      .eq('organization_id', orgId);

    if (error) {
      console.error('Error acknowledging alert:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/alerts');
    
    return { success: true };
  } catch (error) {
    console.error('Error in acknowledgeAlert:', error);
    return { success: false, error: 'Failed to acknowledge alert' };
  }
}

// ============================================
// Resolve Alert
// ============================================

export async function resolveAlert(
  alertId: string,
  resolutionNotes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const orgId = await getOrganizationId();
    const userId = await getCurrentUserId();
    if (!orgId || !userId) {
      return { success: false, error: 'Not authenticated' };
    }

    const supabase = createServiceClient();

    const { error } = await supabase
      .from('trend_alerts')
      .update({
        status: 'resolved',
        resolved_at: new Date().toISOString(),
        resolved_by_id: userId,
        resolution_notes: resolutionNotes || null,
      })
      .eq('id', alertId)
      .eq('organization_id', orgId);

    if (error) {
      console.error('Error resolving alert:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/alerts');
    
    return { success: true };
  } catch (error) {
    console.error('Error in resolveAlert:', error);
    return { success: false, error: 'Failed to resolve alert' };
  }
}

// ============================================
// Dismiss Alert
// ============================================

export async function dismissAlert(alertId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const orgId = await getOrganizationId();
    if (!orgId) {
      return { success: false, error: 'Not authenticated' };
    }

    const supabase = createServiceClient();

    const { error } = await supabase
      .from('trend_alerts')
      .update({ status: 'dismissed' })
      .eq('id', alertId)
      .eq('organization_id', orgId);

    if (error) {
      console.error('Error dismissing alert:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/alerts');
    
    return { success: true };
  } catch (error) {
    console.error('Error in dismissAlert:', error);
    return { success: false, error: 'Failed to dismiss alert' };
  }
}

// ============================================
// Get Alert Count (for badge)
// ============================================

export async function getActiveAlertCount(): Promise<number> {
  try {
    const orgId = await getOrganizationId();
    if (!orgId) return 0;

    const supabase = createServiceClient();
    
    const { count, error } = await supabase
      .from('trend_alerts')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .eq('status', 'active');

    if (error) {
      console.error('Error fetching alert count:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Error in getActiveAlertCount:', error);
    return 0;
  }
}

// ============================================
// Get Critical Alert Count
// ============================================

export async function getCriticalAlertCount(): Promise<number> {
  try {
    const orgId = await getOrganizationId();
    if (!orgId) return 0;

    const supabase = createServiceClient();
    
    const { count, error } = await supabase
      .from('trend_alerts')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .eq('status', 'active')
      .in('severity', ['critical', 'urgent']);

    if (error) {
      console.error('Error fetching critical alert count:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Error in getCriticalAlertCount:', error);
    return 0;
  }
}


