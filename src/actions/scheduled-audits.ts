'use server';

import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';

import { createServiceClient, isSupabaseConfigured } from '@/libs/supabase/server';
import { getUserPermissions } from './supabase';

// ============================================
// Types
// ============================================

export type ScheduledAudit = {
  id: string;
  organization_id: string;
  template_id: string;
  location_id: string;
  name: string;
  description: string | null;
  recurrence: 'once' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
  start_date: string;
  end_date: string | null;
  day_of_week: number | null;
  day_of_month: number | null;
  time_window_days: number;
  reminder_days_before: number;
  notify_inspector: boolean;
  notify_manager: boolean;
  default_inspector_id: string | null;
  is_active: boolean;
  last_generated_date: string | null;
  next_scheduled_date: string | null;
  created_at: string;
  // Joined data
  location?: { id: string; name: string; city: string | null };
  template?: { id: string; name: string };
  inspector?: { id: string; full_name: string; email: string };
};

export type ScheduledAuditInstance = {
  id: string;
  scheduled_audit_id: string;
  audit_id: string | null;
  scheduled_date: string;
  due_date: string;
  status: 'pending' | 'created' | 'completed' | 'missed' | 'skipped';
  created_at: string;
  completed_at: string | null;
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

async function ensureUserExists(): Promise<string | null> {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) return null;
    
    const supabase = createServiceClient();
    const { data } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_user_id', clerkUserId)
      .single();
    
    return data?.id || null;
  } catch {
    return null;
  }
}

// ============================================
// Get Scheduled Audits
// ============================================

export async function getScheduledAudits(
  filters?: { locationId?: string; isActive?: boolean }
): Promise<ScheduledAudit[]> {
  try {
    const orgId = await getOrganizationId();
    if (!orgId) return [];

    const supabase = createServiceClient();
    
    let query = supabase
      .from('scheduled_audits')
      .select(`
        *,
        location:locations(id, name, city),
        template:audit_templates(id, name),
        inspector:users!scheduled_audits_default_inspector_id_fkey(id, full_name, email)
      `)
      .eq('organization_id', orgId)
      .order('next_scheduled_date', { ascending: true, nullsFirst: false });

    if (filters?.locationId && filters.locationId !== 'all') {
      query = query.eq('location_id', filters.locationId);
    }

    if (filters?.isActive !== undefined) {
      query = query.eq('is_active', filters.isActive);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching scheduled audits:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getScheduledAudits:', error);
    return [];
  }
}

// ============================================
// Get Single Scheduled Audit
// ============================================

export async function getScheduledAudit(id: string): Promise<ScheduledAudit | null> {
  try {
    const supabase = createServiceClient();
    
    const { data, error } = await supabase
      .from('scheduled_audits')
      .select(`
        *,
        location:locations(id, name, city),
        template:audit_templates(id, name),
        inspector:users!scheduled_audits_default_inspector_id_fkey(id, full_name, email)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching scheduled audit:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getScheduledAudit:', error);
    return null;
  }
}

// ============================================
// Get Scheduled Audit Instances
// ============================================

export async function getScheduledAuditInstances(
  scheduledAuditId: string,
  limit: number = 20
): Promise<ScheduledAuditInstance[]> {
  try {
    const supabase = createServiceClient();
    
    const { data, error } = await supabase
      .from('scheduled_audit_instances')
      .select('*')
      .eq('scheduled_audit_id', scheduledAuditId)
      .order('scheduled_date', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching instances:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getScheduledAuditInstances:', error);
    return [];
  }
}

// ============================================
// Get Pending Scheduled Instances (Due Today)
// ============================================

export async function getPendingScheduledInstances(): Promise<{
  instance: ScheduledAuditInstance;
  scheduledAudit: ScheduledAudit;
}[]> {
  try {
    const orgId = await getOrganizationId();
    if (!orgId) return [];

    // Get user permissions to filter by accessible locations
    const permissions = await getUserPermissions();
    const accessibleLocationIds = permissions.canViewAllLocations 
      ? null 
      : permissions.assignedLocationIds;

    const supabase = createServiceClient();
    
    const { data, error } = await supabase
      .from('scheduled_audit_instances')
      .select(`
        *,
        scheduled_audit:scheduled_audits(
          *,
          location:locations(id, name, city),
          template:audit_templates(id, name)
        )
      `)
      .eq('status', 'pending')
      .lte('scheduled_date', new Date().toISOString().split('T')[0])
      .order('scheduled_date', { ascending: true });

    if (error) {
      console.error('Error fetching pending instances:', error);
      return [];
    }

    // Filter by organization and accessible locations
    let results = (data || [])
      .filter(d => d.scheduled_audit?.organization_id === orgId);
    
    // For members, filter by their accessible locations
    if (accessibleLocationIds !== null) {
      if (accessibleLocationIds.length === 0) {
        return [];
      }
      results = results.filter(d => 
        accessibleLocationIds.includes(d.scheduled_audit?.location_id)
      );
    }

    return results.map(d => ({
      instance: d,
      scheduledAudit: d.scheduled_audit,
    }));
  } catch (error) {
    console.error('Error in getPendingScheduledInstances:', error);
    return [];
  }
}

// ============================================
// Create Scheduled Audit
// ============================================

export async function createScheduledAudit(
  formData: FormData
): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    const orgId = await getOrganizationId();
    if (!orgId) return { success: false, error: 'No organization selected' };

    const userId = await ensureUserExists();
    const supabase = createServiceClient();

    const scheduledAuditData = {
      organization_id: orgId,
      template_id: formData.get('templateId') as string,
      location_id: formData.get('locationId') as string,
      name: formData.get('name') as string,
      description: formData.get('description') as string || null,
      recurrence: formData.get('recurrence') as string || 'monthly',
      start_date: formData.get('startDate') as string,
      end_date: formData.get('endDate') as string || null,
      day_of_week: formData.get('dayOfWeek') ? parseInt(formData.get('dayOfWeek') as string) : null,
      day_of_month: formData.get('dayOfMonth') ? parseInt(formData.get('dayOfMonth') as string) : null,
      time_window_days: parseInt(formData.get('timeWindowDays') as string) || 3,
      reminder_days_before: parseInt(formData.get('reminderDaysBefore') as string) || 1,
      notify_inspector: formData.get('notifyInspector') === 'true',
      notify_manager: formData.get('notifyManager') === 'true',
      default_inspector_id: formData.get('inspectorId') as string || null,
      is_active: true,
      created_by_id: userId,
    };

    const { data, error } = await supabase
      .from('scheduled_audits')
      .insert([scheduledAuditData])
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/dashboard/settings/scheduled-audits');
    return { success: true, id: data.id };
  } catch (error) {
    console.error('Error creating scheduled audit:', error);
    return { success: false, error: 'Failed to create scheduled audit' };
  }
}

// ============================================
// Update Scheduled Audit
// ============================================

export async function updateScheduledAudit(
  id: string,
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createServiceClient();

    const updates = {
      template_id: formData.get('templateId') as string,
      location_id: formData.get('locationId') as string,
      name: formData.get('name') as string,
      description: formData.get('description') as string || null,
      recurrence: formData.get('recurrence') as string,
      start_date: formData.get('startDate') as string,
      end_date: formData.get('endDate') as string || null,
      day_of_week: formData.get('dayOfWeek') ? parseInt(formData.get('dayOfWeek') as string) : null,
      day_of_month: formData.get('dayOfMonth') ? parseInt(formData.get('dayOfMonth') as string) : null,
      time_window_days: parseInt(formData.get('timeWindowDays') as string) || 3,
      reminder_days_before: parseInt(formData.get('reminderDaysBefore') as string) || 1,
      notify_inspector: formData.get('notifyInspector') === 'true',
      notify_manager: formData.get('notifyManager') === 'true',
      default_inspector_id: formData.get('inspectorId') as string || null,
    };

    const { error } = await supabase
      .from('scheduled_audits')
      .update(updates)
      .eq('id', id);

    if (error) throw error;

    revalidatePath('/dashboard/settings/scheduled-audits');
    revalidatePath(`/dashboard/settings/scheduled-audits/${id}`);
    return { success: true };
  } catch (error) {
    console.error('Error updating scheduled audit:', error);
    return { success: false, error: 'Failed to update scheduled audit' };
  }
}

// ============================================
// Toggle Scheduled Audit Active Status
// ============================================

export async function toggleScheduledAuditActive(
  id: string,
  isActive: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createServiceClient();

    const { error } = await supabase
      .from('scheduled_audits')
      .update({ is_active: isActive })
      .eq('id', id);

    if (error) throw error;

    revalidatePath('/dashboard/settings/scheduled-audits');
    return { success: true };
  } catch (error) {
    console.error('Error toggling scheduled audit:', error);
    return { success: false, error: 'Failed to update scheduled audit' };
  }
}

// ============================================
// Delete Scheduled Audit
// ============================================

export async function deleteScheduledAudit(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createServiceClient();

    // Delete instances first
    await supabase
      .from('scheduled_audit_instances')
      .delete()
      .eq('scheduled_audit_id', id);

    // Delete schedule
    const { error } = await supabase
      .from('scheduled_audits')
      .delete()
      .eq('id', id);

    if (error) throw error;

    revalidatePath('/dashboard/settings/scheduled-audits');
    return { success: true };
  } catch (error) {
    console.error('Error deleting scheduled audit:', error);
    return { success: false, error: 'Failed to delete scheduled audit' };
  }
}

// ============================================
// Start Scheduled Audit (Create actual audit)
// ============================================

export async function startScheduledAudit(
  instanceId: string
): Promise<{ success: boolean; error?: string; auditId?: string }> {
  try {
    const supabase = createServiceClient();
    const userId = await ensureUserExists();

    // Get instance with scheduled audit details
    const { data: instance } = await supabase
      .from('scheduled_audit_instances')
      .select(`
        *,
        scheduled_audit:scheduled_audits(*)
      `)
      .eq('id', instanceId)
      .single();

    if (!instance) {
      return { success: false, error: 'Instance not found' };
    }

    // Create actual audit
    const { data: audit, error: auditError } = await supabase
      .from('audits')
      .insert([{
        organization_id: instance.scheduled_audit.organization_id,
        location_id: instance.scheduled_audit.location_id,
        template_id: instance.scheduled_audit.template_id,
        inspector_id: instance.scheduled_audit.default_inspector_id || userId,
        audit_date: instance.scheduled_date,
        status: 'in_progress',
        started_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (auditError) throw auditError;

    // Update instance
    const { error: updateError } = await supabase
      .from('scheduled_audit_instances')
      .update({
        audit_id: audit.id,
        status: 'created',
      })
      .eq('id', instanceId);

    if (updateError) throw updateError;

    revalidatePath('/dashboard/audits');
    revalidatePath('/dashboard/settings/scheduled-audits');
    return { success: true, auditId: audit.id };
  } catch (error) {
    console.error('Error starting scheduled audit:', error);
    return { success: false, error: 'Failed to start audit' };
  }
}

// ============================================
// Skip Scheduled Instance
// ============================================

export async function skipScheduledInstance(
  instanceId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createServiceClient();

    const { error } = await supabase
      .from('scheduled_audit_instances')
      .update({ status: 'skipped' })
      .eq('id', instanceId);

    if (error) throw error;

    revalidatePath('/dashboard/settings/scheduled-audits');
    return { success: true };
  } catch (error) {
    console.error('Error skipping instance:', error);
    return { success: false, error: 'Failed to skip instance' };
  }
}
