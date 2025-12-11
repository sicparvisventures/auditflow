'use server';

import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';

import { createServiceClient, isSupabaseConfigured } from '@/libs/supabase/server';

// ============================================
// Types
// ============================================

export type LocationGroup = {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  manager_id: string | null;
  created_at: string;
  updated_at: string;
  // Computed
  location_count?: number;
  manager?: {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  } | null;
};

export type LocationGroupPerformance = {
  group_id: string;
  group_name: string;
  organization_id: string;
  location_count: number;
  total_audits: number;
  completed_audits: number;
  avg_score: number;
  passed_audits: number;
  failed_audits: number;
  open_actions: number;
  overdue_actions: number;
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
// Get Location Groups
// ============================================

export async function getLocationGroups(): Promise<LocationGroup[]> {
  try {
    const orgId = await getOrganizationId();
    if (!orgId) return [];

    const supabase = createServiceClient();
    
    const { data, error } = await supabase
      .from('location_groups')
      .select(`
        *,
        manager:users!location_groups_manager_id_fkey(
          id,
          full_name,
          email,
          avatar_url
        ),
        locations(id)
      `)
      .eq('organization_id', orgId)
      .order('name');

    if (error) {
      console.error('Error fetching location groups:', error);
      return [];
    }

    return (data || []).map(group => ({
      ...group,
      location_count: group.locations?.length || 0,
      locations: undefined,
    }));
  } catch (error) {
    console.error('Error in getLocationGroups:', error);
    return [];
  }
}

// ============================================
// Get Location Group by ID
// ============================================

export async function getLocationGroup(groupId: string): Promise<LocationGroup | null> {
  try {
    const orgId = await getOrganizationId();
    if (!orgId) return null;

    const supabase = createServiceClient();
    
    const { data, error } = await supabase
      .from('location_groups')
      .select(`
        *,
        manager:users!location_groups_manager_id_fkey(
          id,
          full_name,
          email,
          avatar_url
        ),
        locations(id)
      `)
      .eq('id', groupId)
      .eq('organization_id', orgId)
      .single();

    if (error) {
      console.error('Error fetching location group:', error);
      return null;
    }

    return {
      ...data,
      location_count: data.locations?.length || 0,
      locations: undefined,
    };
  } catch (error) {
    console.error('Error in getLocationGroup:', error);
    return null;
  }
}

// ============================================
// Create Location Group
// ============================================

export async function createLocationGroup(input: {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  manager_id?: string;
}): Promise<{ success: boolean; groupId?: string; error?: string }> {
  try {
    const orgId = await getOrganizationId();
    if (!orgId) {
      return { success: false, error: 'Not authenticated' };
    }

    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from('location_groups')
      .insert({
        organization_id: orgId,
        name: input.name,
        description: input.description || null,
        color: input.color || '#1a9988',
        icon: input.icon || 'building',
        manager_id: input.manager_id || null,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error creating location group:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/dashboard/settings/regions');
    revalidatePath('/dashboard/locations');
    
    return { success: true, groupId: data.id };
  } catch (error) {
    console.error('Error in createLocationGroup:', error);
    return { success: false, error: 'Failed to create location group' };
  }
}

// ============================================
// Update Location Group
// ============================================

export async function updateLocationGroup(
  groupId: string,
  input: {
    name?: string;
    description?: string;
    color?: string;
    icon?: string;
    manager_id?: string | null;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const orgId = await getOrganizationId();
    if (!orgId) {
      return { success: false, error: 'Not authenticated' };
    }

    const supabase = createServiceClient();

    const { error } = await supabase
      .from('location_groups')
      .update({
        name: input.name,
        description: input.description,
        color: input.color,
        icon: input.icon,
        manager_id: input.manager_id,
      })
      .eq('id', groupId)
      .eq('organization_id', orgId);

    if (error) {
      console.error('Error updating location group:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/dashboard/settings/regions');
    revalidatePath('/dashboard/locations');
    
    return { success: true };
  } catch (error) {
    console.error('Error in updateLocationGroup:', error);
    return { success: false, error: 'Failed to update location group' };
  }
}

// ============================================
// Delete Location Group
// ============================================

export async function deleteLocationGroup(groupId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const orgId = await getOrganizationId();
    if (!orgId) {
      return { success: false, error: 'Not authenticated' };
    }

    const supabase = createServiceClient();

    // First, unassign all locations from this group
    await supabase
      .from('locations')
      .update({ group_id: null })
      .eq('group_id', groupId);

    // Then delete the group
    const { error } = await supabase
      .from('location_groups')
      .delete()
      .eq('id', groupId)
      .eq('organization_id', orgId);

    if (error) {
      console.error('Error deleting location group:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/dashboard/settings/regions');
    revalidatePath('/dashboard/locations');
    
    return { success: true };
  } catch (error) {
    console.error('Error in deleteLocationGroup:', error);
    return { success: false, error: 'Failed to delete location group' };
  }
}

// ============================================
// Assign Location to Group
// ============================================

export async function assignLocationToGroup(
  locationId: string,
  groupId: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const orgId = await getOrganizationId();
    if (!orgId) {
      return { success: false, error: 'Not authenticated' };
    }

    const supabase = createServiceClient();

    const { error } = await supabase
      .from('locations')
      .update({ group_id: groupId })
      .eq('id', locationId)
      .eq('organization_id', orgId);

    if (error) {
      console.error('Error assigning location to group:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/dashboard/settings/regions');
    revalidatePath('/dashboard/locations');
    revalidatePath(`/dashboard/locations/${locationId}`);
    
    return { success: true };
  } catch (error) {
    console.error('Error in assignLocationToGroup:', error);
    return { success: false, error: 'Failed to assign location to group' };
  }
}

// ============================================
// Get Group Performance
// ============================================

export async function getGroupPerformance(): Promise<LocationGroupPerformance[]> {
  try {
    const orgId = await getOrganizationId();
    if (!orgId) return [];

    const supabase = createServiceClient();
    
    const { data, error } = await supabase
      .from('location_group_performance')
      .select('*')
      .eq('organization_id', orgId);

    if (error) {
      console.error('Error fetching group performance:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getGroupPerformance:', error);
    return [];
  }
}


