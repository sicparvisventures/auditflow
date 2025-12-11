'use server';

import { auth } from '@clerk/nextjs/server';

import { createServiceClient, isSupabaseConfigured } from '@/libs/supabase/server';

// ============================================
// Types
// ============================================

export type ActivityLogEntry = {
  id: string;
  organization_id: string;
  user_id: string | null;
  user_email: string | null;
  user_name: string | null;
  action_type: string;
  entity_type: string;
  entity_id: string | null;
  entity_name: string | null;
  description: string;
  metadata: Record<string, any>;
  ip_address: string | null;
  created_at: string;
};

export type ActivityFilters = {
  entityType?: string;
  actionType?: string;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
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
// Get Activity Log
// ============================================

export async function getActivityLog(
  filters?: ActivityFilters,
  limit: number = 50,
  offset: number = 0
): Promise<{ data: ActivityLogEntry[]; total: number }> {
  try {
    const orgId = await getOrganizationId();
    if (!orgId) return { data: [], total: 0 };

    const supabase = createServiceClient();
    
    let query = supabase
      .from('activity_log')
      .select('*', { count: 'exact' })
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters?.entityType && filters.entityType !== 'all') {
      query = query.eq('entity_type', filters.entityType);
    }

    if (filters?.actionType && filters.actionType !== 'all') {
      query = query.eq('action_type', filters.actionType);
    }

    if (filters?.userId && filters.userId !== 'all') {
      query = query.eq('user_id', filters.userId);
    }

    if (filters?.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }

    if (filters?.dateTo) {
      query = query.lte('created_at', `${filters.dateTo}T23:59:59`);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching activity log:', error);
      return { data: [], total: 0 };
    }

    let results = data || [];

    // Client-side search filter
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      results = results.filter(entry =>
        entry.description?.toLowerCase().includes(searchLower) ||
        entry.entity_name?.toLowerCase().includes(searchLower) ||
        entry.user_name?.toLowerCase().includes(searchLower) ||
        entry.user_email?.toLowerCase().includes(searchLower)
      );
    }

    return { data: results, total: count || 0 };
  } catch (error) {
    console.error('Error in getActivityLog:', error);
    return { data: [], total: 0 };
  }
}

// ============================================
// Log Activity (Manual)
// ============================================

export async function logActivity(
  actionType: string,
  entityType: string,
  entityId: string | null,
  entityName: string | null,
  description: string,
  metadata: Record<string, any> = {}
): Promise<{ success: boolean; error?: string }> {
  try {
    const orgId = await getOrganizationId();
    if (!orgId) return { success: false, error: 'No organization' };

    const { userId: clerkUserId } = await auth();
    const supabase = createServiceClient();

    // Get user info
    let userData = null;
    if (clerkUserId) {
      const { data } = await supabase
        .from('users')
        .select('id, email, full_name')
        .eq('clerk_user_id', clerkUserId)
        .single();
      userData = data;
    }

    const { error } = await supabase.from('activity_log').insert([{
      organization_id: orgId,
      user_id: userData?.id || null,
      user_email: userData?.email || null,
      user_name: userData?.full_name || null,
      action_type: actionType,
      entity_type: entityType,
      entity_id: entityId,
      entity_name: entityName,
      description,
      metadata,
    }]);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error logging activity:', error);
    return { success: false, error: 'Failed to log activity' };
  }
}

// ============================================
// Get Activity Stats (for dashboard)
// ============================================

export async function getActivityStats() {
  try {
    const orgId = await getOrganizationId();
    if (!orgId) return null;

    const supabase = createServiceClient();
    
    // Get counts by entity type for last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: recentActivity } = await supabase
      .from('activity_log')
      .select('entity_type, action_type')
      .eq('organization_id', orgId)
      .gte('created_at', sevenDaysAgo.toISOString());

    if (!recentActivity) return null;

    const stats = {
      total: recentActivity.length,
      byEntityType: {} as Record<string, number>,
      byActionType: {} as Record<string, number>,
    };

    recentActivity.forEach(entry => {
      stats.byEntityType[entry.entity_type] = (stats.byEntityType[entry.entity_type] || 0) + 1;
      stats.byActionType[entry.action_type] = (stats.byActionType[entry.action_type] || 0) + 1;
    });

    return stats;
  } catch (error) {
    console.error('Error getting activity stats:', error);
    return null;
  }
}
