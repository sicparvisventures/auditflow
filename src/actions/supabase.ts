'use server';

import { auth, clerkClient } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';

import {
  sendActionCreatedEmail,
  sendAuditCompletedEmail,
} from '@/libs/email';
import { createServiceClient, isSupabaseConfigured } from '@/libs/supabase/server';

// ============================================
// Types
// ============================================

export type LocationManager = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
};

export type Location = {
  id: string;
  organization_id: string;
  name: string;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  country: string;
  phone: string | null;
  email: string | null;
  manager_id: string | null;
  group_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  // QR Code fields
  qr_code_token: string | null;
  qr_code_enabled: boolean;
  qr_code_created_at: string | null;
  // Joined data
  manager?: LocationManager | null;
};

export type AuditTemplate = {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  requires_photos: boolean;
  pass_threshold: number;
  created_at: string;
  updated_at: string;
};

export type Audit = {
  id: string;
  organization_id: string;
  location_id: string;
  template_id: string | null;
  inspector_id: string;
  audit_date: string;
  status: 'draft' | 'in_progress' | 'completed' | 'cancelled';
  total_score: number;
  max_score: number;
  pass_percentage: number;
  passed: boolean;
  comments: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  location?: Location;
  template?: AuditTemplate;
};

export type Action = {
  id: string;
  organization_id: string;
  location_id: string;
  audit_id: string | null;
  title: string;
  description: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'verified' | 'rejected';
  urgency: 'low' | 'medium' | 'high' | 'critical';
  assigned_to_id: string | null;
  created_by_id: string | null;
  deadline: string | null;
  photo_urls: string[];
  response_text: string | null;
  response_photos: string[];
  responded_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  location?: Location;
};

// ============================================
// Helper: Get Organization ID from Clerk
// ============================================

export async function getOrganizationId(): Promise<string | null> {
  try {
    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured');
      return null;
    }
    
    const { orgId } = await auth();
    if (!orgId) {
      return null;
    }
    
    const supabase = createServiceClient();
    
    // First try to get existing org
    const { data: existingOrg } = await supabase
      .from('organizations')
      .select('id')
      .eq('clerk_org_id', orgId)
      .single();
    
    if (existingOrg) {
      return existingOrg.id;
    }
    
    // If not exists, create it
    const { data: newOrg, error } = await supabase
      .from('organizations')
      .insert([{ 
        clerk_org_id: orgId, 
        name: 'My Organization',
        slug: orgId 
      }])
      .select('id')
      .single();
    
    if (error) {
      console.error('Failed to create organization:', error);
      return null;
    }
    
    return newOrg?.id || null;
  } catch (error) {
    console.error('Error getting organization ID:', error);
    return null;
  }
}

async function getUserId(): Promise<string | null> {
  try {
    const { userId } = await auth();
    return userId || null;
  } catch {
    return null;
  }
}

// Ensure user exists in Supabase (auto-create if not synced via webhook)
async function ensureUserExists(): Promise<string | null> {
  try {
    const authData = await auth();
    const clerkUserId = authData.userId;
    if (!clerkUserId) return null;
    
    const supabase = createServiceClient();
    
    // Try to get existing user
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, email')
      .eq('clerk_user_id', clerkUserId)
      .single();
    
    // If user exists and has a real email (not placeholder), return the ID
    if (existingUser && !existingUser.email.includes('@placeholder.local')) {
      return existingUser.id;
    }
    
    // Get actual user data from Clerk
    const clerk = await clerkClient();
    const clerkUser = await clerk.users.getUser(clerkUserId);
    
    const userData = {
      clerk_user_id: clerkUserId,
      email: clerkUser.emailAddresses[0]?.emailAddress || `${clerkUserId}@placeholder.local`,
      first_name: clerkUser.firstName || null,
      last_name: clerkUser.lastName || null,
      avatar_url: clerkUser.imageUrl || null,
      role: 'admin' as const,
    };
    
    if (existingUser) {
      // Update existing user with real data from Clerk
      const { error: updateError } = await supabase
        .from('users')
        .update({
          email: userData.email,
          first_name: userData.first_name,
          last_name: userData.last_name,
          avatar_url: userData.avatar_url,
        })
        .eq('id', existingUser.id);
      
      if (updateError) {
        console.error('Failed to update user:', updateError);
      }
      
      return existingUser.id;
    }
    
    // User doesn't exist, create them with real Clerk data
    const { data: newUser, error } = await supabase
      .from('users')
      .insert([userData])
      .select('id')
      .single();
    
    if (error) {
      console.error('Failed to create user:', error);
      return null;
    }
    
    return newUser?.id || null;
  } catch (error) {
    console.error('Error ensuring user exists:', error);
    return null;
  }
}

// ============================================
// USER PERMISSIONS & ROLE-BASED ACCESS
// ============================================

export type UserPermissions = {
  userId: string | null;
  supabaseUserId: string | null;
  clerkRole: string;
  isAdmin: boolean;
  isInspector: boolean;
  isMember: boolean;
  assignedLocationIds: string[];
  canViewAllLocations: boolean;
};

/**
 * Get current user's permissions including their Clerk role and assigned locations
 * - Admin: Can see everything in the organization
 * - Inspector: Can see all locations but focused on audits
 * - Member: Can only see their assigned location(s)
 */
export async function getUserPermissions(): Promise<UserPermissions> {
  const defaultPermissions: UserPermissions = {
    userId: null,
    supabaseUserId: null,
    clerkRole: 'member',
    isAdmin: false,
    isInspector: false,
    isMember: true,
    assignedLocationIds: [],
    canViewAllLocations: false,
  };

  try {
    const authData = await auth();
    const clerkUserId = authData.userId;
    const clerkOrgId = authData.orgId;
    
    if (!clerkUserId || !clerkOrgId) {
      return defaultPermissions;
    }

    // Get user's role from Clerk organization membership
    const clerk = await clerkClient();
    let clerkRole = 'member';
    
    try {
      const memberships = await clerk.organizations.getOrganizationMembershipList({
        organizationId: clerkOrgId,
      });
      
      const userMembership = memberships.data.find(
        m => m.publicUserData?.userId === clerkUserId
      );
      
      if (userMembership) {
        clerkRole = userMembership.role || 'member';
      }
    } catch (e) {
      console.error('Error getting Clerk membership:', e);
    }

    // Determine role flags
    const isAdmin = clerkRole === 'org:admin' || clerkRole === 'admin';
    const isInspector = clerkRole === 'org:inspector' || clerkRole === 'inspector';
    const isMember = !isAdmin && !isInspector;

    // Get Supabase user ID
    const supabase = createServiceClient();
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_user_id', clerkUserId)
      .single();

    const supabaseUserId = user?.id || null;

    // Get assigned locations (locations where this user is the manager)
    let assignedLocationIds: string[] = [];
    
    if (supabaseUserId) {
      const { data: locations } = await supabase
        .from('locations')
        .select('id')
        .eq('manager_id', supabaseUserId);
      
      assignedLocationIds = locations?.map(l => l.id) || [];
    }

    // Admins and inspectors can view all locations
    const canViewAllLocations = isAdmin || isInspector;

    return {
      userId: clerkUserId,
      supabaseUserId,
      clerkRole,
      isAdmin,
      isInspector,
      isMember,
      assignedLocationIds,
      canViewAllLocations,
    };
  } catch (error) {
    console.error('Error getting user permissions:', error);
    return defaultPermissions;
  }
}

/**
 * Filter location IDs based on user permissions
 * Returns null if user can view all, or array of allowed location IDs
 */
async function getAccessibleLocationIds(): Promise<string[] | null> {
  const permissions = await getUserPermissions();
  
  // Admins and inspectors can see all
  if (permissions.canViewAllLocations) {
    return null;
  }
  
  // Members can only see their assigned locations
  return permissions.assignedLocationIds;
}

// ============================================
// LOCATIONS
// ============================================

export type LocationFilters = {
  status?: string;
  search?: string;
  city?: string;
};

export async function getLocations(filters?: LocationFilters): Promise<Location[]> {
  try {
    const orgId = await getOrganizationId();
    if (!orgId) return [];

    const supabase = createServiceClient();
    
    // Get accessible location IDs based on user permissions
    const accessibleLocationIds = await getAccessibleLocationIds();

    let query = supabase
      .from('locations')
      .select(`
        *,
        manager:users!locations_manager_id_fkey(
          id,
          first_name,
          last_name,
          full_name,
          email,
          avatar_url
        )
      `)
      .eq('organization_id', orgId)
      .order('name');

    // Apply role-based location filter (members only see assigned locations)
    if (accessibleLocationIds !== null) {
      if (accessibleLocationIds.length === 0) {
        // User has no assigned locations - return empty
        return [];
      }
      query = query.in('id', accessibleLocationIds);
    }

    // Apply filters
    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    if (filters?.city && filters.city !== 'all') {
      query = query.eq('city', filters.city);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching locations:', error);
      return [];
    }

    let results = data || [];

    // Client-side search filter (also search by manager name)
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      results = results.filter(location =>
        location.name?.toLowerCase().includes(searchLower) ||
        location.address?.toLowerCase().includes(searchLower) ||
        location.city?.toLowerCase().includes(searchLower) ||
        location.manager?.full_name?.toLowerCase().includes(searchLower) ||
        location.manager?.email?.toLowerCase().includes(searchLower)
      );
    }

    return results;
  } catch (error) {
    console.error('Error in getLocations:', error);
    return [];
  }
}

export async function getLocation(id: string): Promise<Location | null> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('locations')
    .select(`
      *,
      manager:users!locations_manager_id_fkey(
        id,
        first_name,
        last_name,
        full_name,
        email,
        avatar_url
      )
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching location:', error);
    return null;
  }

  return data;
}

// ============================================
// GET LOCATION PERFORMANCE STATS
// ============================================

export async function getLocationStats(locationId: string) {
  try {
    const supabase = createServiceClient();
    
    // Get audits for this location
    const { data: audits } = await supabase
      .from('audits')
      .select('id, audit_date, pass_percentage, passed, status')
      .eq('location_id', locationId)
      .eq('status', 'completed')
      .order('audit_date', { ascending: false })
      .limit(12);
    
    // Get actions for this location
    const { data: actions } = await supabase
      .from('actions')
      .select('id, status, deadline')
      .eq('location_id', locationId);
    
    if (!audits || !actions) {
      return null;
    }
    
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0]!;
    
    // Calculate stats
    const totalAudits = audits.length;
    const passedAudits = audits.filter(a => a.passed).length;
    const passRate = totalAudits > 0 ? Math.round((passedAudits / totalAudits) * 100) : 0;
    const avgScore = totalAudits > 0 
      ? Math.round(audits.reduce((sum, a) => sum + (a.pass_percentage || 0), 0) / totalAudits)
      : 0;
    
    const lastAudit = audits[0] || null;
    const openActions = actions.filter(a => ['pending', 'in_progress'].includes(a.status)).length;
    const overdueActions = actions.filter(a => 
      ['pending', 'in_progress'].includes(a.status) && 
      a.deadline && a.deadline < todayStr
    ).length;
    
    // Score trend (compare last 3 vs previous 3)
    const recentScores = audits.slice(0, 3).map(a => a.pass_percentage || 0);
    const olderScores = audits.slice(3, 6).map(a => a.pass_percentage || 0);
    
    const recentAvg = recentScores.length > 0 
      ? recentScores.reduce((a, b) => a + b, 0) / recentScores.length 
      : 0;
    const olderAvg = olderScores.length > 0 
      ? olderScores.reduce((a, b) => a + b, 0) / olderScores.length 
      : 0;
    
    const scoreTrend = olderAvg > 0 ? Math.round(recentAvg - olderAvg) : 0;
    
    // Monthly scores for mini chart (last 6 months)
    const monthlyScores = audits.slice(0, 6).map(a => ({
      date: a.audit_date,
      score: Math.round(a.pass_percentage || 0),
    })).reverse();
    
    return {
      totalAudits,
      passedAudits,
      passRate,
      avgScore,
      scoreTrend,
      lastAuditDate: lastAudit?.audit_date || null,
      lastAuditScore: lastAudit ? Math.round(lastAudit.pass_percentage) : null,
      openActions,
      overdueActions,
      monthlyScores,
    };
  } catch (error) {
    console.error('Error getting location stats:', error);
    return null;
  }
}

export async function createLocation(formData: FormData): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    const orgId = await getOrganizationId();
    if (!orgId) {
      return { success: false, error: 'No organization selected. Please select or create an organization first.' };
    }
    
    const supabase = createServiceClient();

    const locationData = {
      organization_id: orgId,
      name: formData.get('name') as string,
      address: formData.get('address') as string || null,
      city: formData.get('city') as string || null,
      postal_code: formData.get('postalCode') as string || null,
      country: formData.get('country') as string || 'Netherlands',
      phone: formData.get('phone') as string || null,
      email: formData.get('email') as string || null,
      manager_id: formData.get('managerId') as string || null,
      status: 'active',
    };

    const { data, error } = await supabase
      .from('locations')
      .insert([locationData])
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/dashboard/locations');
    return { success: true, id: data.id };
  } catch (error) {
    console.error('Error creating location:', error);
    return { success: false, error: 'Failed to create location' };
  }
}

export async function updateLocation(id: string, formData: FormData): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createServiceClient();

    // Get manager_id and handle empty string as null
    const managerIdValue = formData.get('managerId') as string;
    const managerId = managerIdValue && managerIdValue.trim() !== '' ? managerIdValue : null;

    // Get group_id and handle empty string as null
    const groupIdValue = formData.get('groupId') as string;
    const groupId = groupIdValue && groupIdValue.trim() !== '' ? groupIdValue : null;

    const updates = {
      name: formData.get('name') as string,
      address: formData.get('address') as string || null,
      city: formData.get('city') as string || null,
      postal_code: formData.get('postalCode') as string || null,
      country: formData.get('country') as string || 'Netherlands',
      phone: formData.get('phone') as string || null,
      email: formData.get('email') as string || null,
      manager_id: managerId,
      group_id: groupId,
      status: formData.get('status') as string || 'active',
    };

    const { error } = await supabase
      .from('locations')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('Supabase error updating location:', error);
      throw error;
    }

    revalidatePath('/dashboard/locations');
    revalidatePath(`/dashboard/locations/${id}`);
    revalidatePath('/dashboard/settings/regions');
    return { success: true };
  } catch (error) {
    console.error('Error updating location:', error);
    return { success: false, error: 'Failed to update location' };
  }
}

export async function deleteLocation(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createServiceClient();

    const { error } = await supabase.from('locations').delete().eq('id', id);

    if (error) throw error;

    revalidatePath('/dashboard/locations');
    return { success: true };
  } catch (error) {
    console.error('Error deleting location:', error);
    return { success: false, error: 'Failed to delete location' };
  }
}

// ============================================
// AUDIT TEMPLATES
// ============================================

export async function getAuditTemplates(): Promise<AuditTemplate[]> {
  try {
    const orgId = await getOrganizationId();
    if (!orgId) return [];
    
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from('audit_templates')
      .select('*')
      .eq('organization_id', orgId)
      .order('name');

    if (error) {
      console.error('Error fetching templates:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getAuditTemplates:', error);
    return [];
  }
}

export async function getAuditTemplate(id: string) {
  const supabase = createServiceClient();

  const { data: template, error } = await supabase
    .from('audit_templates')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching template:', error);
    return null;
  }

  // Get categories with items
  const { data: categories } = await supabase
    .from('audit_template_categories')
    .select(`
      *,
      items:audit_template_items(*)
    `)
    .eq('template_id', id)
    .order('sort_order');

  return { ...template, categories: categories || [] };
}

export async function createAuditTemplate(formData: FormData): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    const orgId = await getOrganizationId();
    if (!orgId) {
      return { success: false, error: 'No organization selected' };
    }
    
    const supabase = createServiceClient();

    const templateData = {
      organization_id: orgId,
      name: formData.get('name') as string,
      description: formData.get('description') as string || null,
      pass_threshold: Number(formData.get('passThreshold')) || 70,
      requires_photos: formData.get('requiresPhotos') === 'true',
      is_active: true,
    };

    const { data: template, error } = await supabase
      .from('audit_templates')
      .insert([templateData])
      .select()
      .single();

    if (error) throw error;

    // Parse and create categories/items
    const categoriesJson = formData.get('categories') as string;
    if (categoriesJson) {
      const categories = JSON.parse(categoriesJson);

      for (let i = 0; i < categories.length; i++) {
        const cat = categories[i];
        const { data: category, error: catError } = await supabase
          .from('audit_template_categories')
          .insert([{
            template_id: template.id,
            name: cat.name,
            description: cat.description || null,
            weight: cat.weight || 1,
            sort_order: i,
          }])
          .select()
          .single();

        if (catError) throw catError;

        // Create items for this category
        if (cat.items && cat.items.length > 0) {
          const itemsData = cat.items.map((item: any, idx: number) => ({
            category_id: category.id,
            title: item.title,
            description: item.description || null,
            weight: item.weight || 1,
            requires_photo: item.requiresPhoto || false,
            requires_comment_on_fail: item.requiresCommentOnFail !== false,
            creates_action_on_fail: item.createsAction !== false,
            action_urgency: item.actionUrgency || 'medium',
            action_deadline_days: item.actionDeadlineDays || 7,
            sort_order: idx,
          }));

          const { error: itemsError } = await supabase
            .from('audit_template_items')
            .insert(itemsData);

          if (itemsError) throw itemsError;
        }
      }
    }

    revalidatePath('/dashboard/settings/templates');
    return { success: true, id: template.id };
  } catch (error) {
    console.error('Error creating template:', error);
    return { success: false, error: 'Failed to create template' };
  }
}

export async function updateAuditTemplate(formData: FormData): Promise<{ success: boolean; error?: string }> {
  try {
    const templateId = formData.get('id') as string;
    if (!templateId) {
      return { success: false, error: 'Template ID is required' };
    }

    const supabase = createServiceClient();

    // Update template basic info
    const templateData = {
      name: formData.get('name') as string,
      description: formData.get('description') as string || null,
      pass_threshold: Number(formData.get('passThreshold')) || 70,
      requires_photos: formData.get('requiresPhotos') === 'true',
      updated_at: new Date().toISOString(),
    };

    const { error: templateError } = await supabase
      .from('audit_templates')
      .update(templateData)
      .eq('id', templateId);

    if (templateError) throw templateError;

    // Process categories
    const categoriesJson = formData.get('categories') as string;
    if (categoriesJson) {
      const categories = JSON.parse(categoriesJson);

      for (let i = 0; i < categories.length; i++) {
        const cat = categories[i];

        if (cat.isDeleted && cat.id) {
          // Delete category and its items
          await supabase.from('audit_template_items').delete().eq('category_id', cat.id);
          await supabase.from('audit_template_categories').delete().eq('id', cat.id);
          continue;
        }

        let categoryId = cat.id;

        if (cat.id) {
          // Update existing category
          await supabase
            .from('audit_template_categories')
            .update({
              name: cat.name,
              description: cat.description || null,
              weight: cat.weight || 1,
              sort_order: i,
            })
            .eq('id', cat.id);
        } else {
          // Create new category
          const { data: newCategory, error: catError } = await supabase
            .from('audit_template_categories')
            .insert([{
              template_id: templateId,
              name: cat.name,
              description: cat.description || null,
              weight: cat.weight || 1,
              sort_order: i,
            }])
            .select()
            .single();

          if (catError) throw catError;
          categoryId = newCategory.id;
        }

        // Process items for this category
        if (cat.items && cat.items.length > 0) {
          for (let j = 0; j < cat.items.length; j++) {
            const item = cat.items[j];

            if (item.isDeleted && item.id) {
              // Delete item
              await supabase.from('audit_template_items').delete().eq('id', item.id);
              continue;
            }

            const itemData = {
              title: item.title,
              description: item.description || null,
              weight: item.weight || 1,
              requires_photo: item.requiresPhoto || false,
              requires_comment_on_fail: item.requiresCommentOnFail !== false,
              creates_action_on_fail: item.createsAction !== false,
              action_urgency: item.actionUrgency || 'medium',
              action_deadline_days: item.actionDeadlineDays || 7,
              sort_order: j,
            };

            if (item.id) {
              // Update existing item
              await supabase
                .from('audit_template_items')
                .update(itemData)
                .eq('id', item.id);
            } else {
              // Create new item
              await supabase
                .from('audit_template_items')
                .insert([{ ...itemData, category_id: categoryId }]);
            }
          }
        }
      }
    }

    revalidatePath('/dashboard/settings/templates');
    revalidatePath(`/dashboard/settings/templates/${templateId}`);
    return { success: true };
  } catch (error) {
    console.error('Error updating template:', error);
    return { success: false, error: 'Failed to update template' };
  }
}

export async function deleteAuditTemplate(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createServiceClient();

    // First delete all items in all categories
    const { data: categories } = await supabase
      .from('audit_template_categories')
      .select('id')
      .eq('template_id', id);

    if (categories) {
      for (const cat of categories) {
        await supabase.from('audit_template_items').delete().eq('category_id', cat.id);
      }
    }

    // Delete categories
    await supabase.from('audit_template_categories').delete().eq('template_id', id);

    // Delete template
    const { error } = await supabase.from('audit_templates').delete().eq('id', id);

    if (error) throw error;

    revalidatePath('/dashboard/settings/templates');
    return { success: true };
  } catch (error) {
    console.error('Error deleting template:', error);
    return { success: false, error: 'Failed to delete template' };
  }
}

export async function toggleTemplateActive(id: string, isActive: boolean): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createServiceClient();

    const { error } = await supabase
      .from('audit_templates')
      .update({ is_active: isActive })
      .eq('id', id);

    if (error) throw error;

    revalidatePath('/dashboard/settings/templates');
    revalidatePath(`/dashboard/settings/templates/${id}`);
    return { success: true };
  } catch (error) {
    console.error('Error toggling template:', error);
    return { success: false, error: 'Failed to update template' };
  }
}

// ============================================
// AUDITS
// ============================================

export type AuditFilters = {
  status?: string;
  locationId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  passed?: string;
};

export async function getAudits(filters?: AuditFilters): Promise<Audit[]> {
  try {
    const orgId = await getOrganizationId();
    if (!orgId) return [];

    const supabase = createServiceClient();
    
    // Get accessible location IDs based on user permissions
    const accessibleLocationIds = await getAccessibleLocationIds();

    let query = supabase
      .from('audits')
      .select(`
        *,
        location:locations(id, name, city),
        template:audit_templates(id, name)
      `)
      .eq('organization_id', orgId)
      .order('audit_date', { ascending: false });

    // Apply role-based location filter (members only see their locations' audits)
    if (accessibleLocationIds !== null) {
      if (accessibleLocationIds.length === 0) {
        return [];
      }
      query = query.in('location_id', accessibleLocationIds);
    }

    // Apply filters
    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    if (filters?.locationId && filters.locationId !== 'all') {
      query = query.eq('location_id', filters.locationId);
    }

    if (filters?.dateFrom) {
      query = query.gte('audit_date', filters.dateFrom);
    }

    if (filters?.dateTo) {
      query = query.lte('audit_date', filters.dateTo);
    }

    if (filters?.passed === 'true') {
      query = query.eq('passed', true);
    } else if (filters?.passed === 'false') {
      query = query.eq('passed', false);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching audits:', error);
      return [];
    }

    // Client-side search filter (for location name)
    let results = data || [];
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      results = results.filter(audit => 
        audit.location?.name?.toLowerCase().includes(searchLower) ||
        audit.template?.name?.toLowerCase().includes(searchLower)
      );
    }

    return results;
  } catch (error) {
    console.error('Error in getAudits:', error);
    return [];
  }
}

export async function getAudit(id: string) {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('audits')
    .select(`
      *,
      location:locations(id, name, address, city),
      template:audit_templates(id, name, pass_threshold),
      inspector:users!audits_inspector_id_fkey(id, clerk_user_id, first_name, last_name, full_name, email, avatar_url)
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching audit:', error);
    return null;
  }

  // Get results with template items and photos
  const { data: results, error: resultsError } = await supabase
    .from('audit_results')
    .select(`
      id,
      result,
      score,
      comments,
      photo_urls,
      template_item:audit_template_items(
        id,
        title,
        requires_photo,
        category:audit_template_categories(id, name)
      )
    `)
    .eq('audit_id', id);

  if (resultsError) {
    console.error('Error fetching audit results:', resultsError);
  }

  // Get actions created for this audit
  const { data: auditActions } = await supabase
    .from('actions')
    .select('id, title, status, urgency')
    .eq('audit_id', id);

  return { ...data, results: results || [], actions: auditActions || [] };
}

export async function createAudit(formData: FormData): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    const orgId = await getOrganizationId();
    if (!orgId) {
      return { success: false, error: 'No organization selected' };
    }
    
    const supabase = createServiceClient();

    // Ensure user exists in Supabase (auto-create if needed)
    const inspectorId = await ensureUserExists();
    if (!inspectorId) {
      return { success: false, error: 'Failed to identify inspector. Please try again.' };
    }

    const auditData = {
      organization_id: orgId,
      location_id: formData.get('locationId') as string,
      template_id: formData.get('templateId') as string || null,
      inspector_id: inspectorId,
      audit_date: new Date().toISOString().split('T')[0],
      status: 'in_progress' as const,
      started_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('audits')
      .insert([auditData])
      .select()
      .single();

    if (error) {
      console.error('Error creating audit:', error);
      throw error;
    }

    revalidatePath('/dashboard/audits');
    return { success: true, id: data.id };
  } catch (error) {
    console.error('Error creating audit:', error);
    return { success: false, error: 'Failed to create audit' };
  }
}

// Clone an existing audit (start a new audit at the same location with same template)
export async function cloneAudit(auditId: string): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    const orgId = await getOrganizationId();
    if (!orgId) {
      return { success: false, error: 'No organization selected' };
    }
    
    const supabase = createServiceClient();

    // Get the original audit
    const { data: originalAudit, error: fetchError } = await supabase
      .from('audits')
      .select('*')
      .eq('id', auditId)
      .eq('organization_id', orgId)
      .single();

    if (fetchError || !originalAudit) {
      return { success: false, error: 'Original audit not found' };
    }

    // Ensure user exists in Supabase
    const inspectorId = await ensureUserExists();
    if (!inspectorId) {
      return { success: false, error: 'Failed to identify inspector' };
    }

    // Create new audit with same location and template
    const auditData = {
      organization_id: orgId,
      location_id: originalAudit.location_id,
      template_id: originalAudit.template_id,
      inspector_id: inspectorId,
      audit_date: new Date().toISOString().split('T')[0],
      status: 'in_progress' as const,
      started_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('audits')
      .insert([auditData])
      .select()
      .single();

    if (error) {
      console.error('Error cloning audit:', error);
      throw error;
    }

    revalidatePath('/dashboard/audits');
    return { success: true, id: data.id };
  } catch (error) {
    console.error('Error cloning audit:', error);
    return { success: false, error: 'Failed to clone audit' };
  }
}

export async function saveAuditResults(auditId: string, results: any[]): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createServiceClient();

    // Delete existing results for this audit first (simpler than upsert)
    await supabase
      .from('audit_results')
      .delete()
      .eq('audit_id', auditId);

    // Insert all results
    const resultsData = results.map(result => {
      // Ensure photo_urls is always an array
      const photoUrls = Array.isArray(result.photoUrls) ? result.photoUrls : [];
      
      return {
        audit_id: auditId,
        template_item_id: result.templateItemId,
        result: result.result || 'na',
        score: result.result === 'pass' ? 1 : 0,
        comments: result.comments || null,
        photo_urls: photoUrls,
      };
    });

    if (resultsData.length > 0) {
      const { error } = await supabase
        .from('audit_results')
        .insert(resultsData);

      if (error) {
        console.error('Error inserting audit results:', error);
        throw error;
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error saving audit results:', error);
    return { success: false, error: 'Failed to save results' };
  }
}

export async function completeAudit(auditId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createServiceClient();

    // Get the audit details with location and manager info
    const { data: audit } = await supabase
      .from('audits')
      .select(`
        *, 
        location:locations(id, name, manager_id, email),
        inspector:users!audits_inspector_id_fkey(id, first_name, last_name, full_name, email)
      `)
      .eq('id', auditId)
      .single();

    if (!audit) {
      return { success: false, error: 'Audit not found' };
    }

    // Get template for pass threshold
    const { data: template } = await supabase
      .from('audit_templates')
      .select('pass_threshold')
      .eq('id', audit.template_id)
      .single();
    
    const passThreshold = template?.pass_threshold || 70;

    // Get all results with template items including weights and action settings
    const { data: results } = await supabase
      .from('audit_results')
      .select(`
        *,
        template_item:audit_template_items(
          id, 
          title,
          description,
          weight,
          creates_action_on_fail,
          action_urgency,
          action_deadline_days,
          category:audit_template_categories(id, name, weight)
        )
      `)
      .eq('audit_id', auditId);

    // Calculate weighted scores
    const allResults = results || [];
    let totalScore = 0;
    let maxScore = 0;

    allResults.forEach(result => {
      const itemWeight = result.template_item?.weight || 1;
      const categoryWeight = result.template_item?.category?.weight || 1;
      const combinedWeight = itemWeight * categoryWeight;

      if (result.result !== 'na') {
        maxScore += combinedWeight;
        if (result.result === 'pass') {
          totalScore += combinedWeight;
        }
      }
    });

    const passPercentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
    const passed = passPercentage >= passThreshold;

    // Update audit with calculated scores
    const { error: updateError } = await supabase
      .from('audits')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        total_score: totalScore,
        max_score: maxScore,
        pass_percentage: passPercentage,
        passed,
      })
      .eq('id', auditId);

    if (updateError) throw updateError;

    // Create actions for failed items
    const failedItems = allResults.filter(r => 
      r.result === 'fail' && 
      r.template_item?.creates_action_on_fail !== false
    );

    const inspectorId = await ensureUserExists();

    // Get location manager for email notifications
    let managerUser = null;
    if (audit.location?.manager_id) {
      const { data: manager } = await supabase
        .from('users')
        .select('id, email, first_name, last_name, full_name')
        .eq('id', audit.location.manager_id)
        .single();
      managerUser = manager;
    }

    for (const failedItem of failedItems) {
      // Get deadline days from template or default to 7
      const deadlineDays = failedItem.template_item?.action_deadline_days || 7;
      const deadlineDate = new Date(Date.now() + deadlineDays * 24 * 60 * 60 * 1000);
      
      // Get urgency from template or default to medium
      const urgency = failedItem.template_item?.action_urgency || 'medium';
      
      // Build description with context
      const itemDescription = failedItem.template_item?.description || '';
      const category = failedItem.template_item?.category?.name || '';
      const auditDate = new Date(audit.audit_date).toLocaleDateString('nl-NL');
      
      let description = `Failed during audit on ${auditDate}`;
      if (category) description = `[${category}] ${description}`;
      if (failedItem.comments) description += `\n\nInspector note: ${failedItem.comments}`;
      if (itemDescription) description += `\n\nChecklist requirement: ${itemDescription}`;

      const actionData = {
        organization_id: audit.organization_id,
        location_id: audit.location_id,
        audit_id: auditId,
        audit_result_id: failedItem.id,
        title: failedItem.template_item?.title || 'Failed audit item',
        description,
        status: 'pending',
        urgency,
        assigned_to_id: audit.location?.manager_id || null,
        created_by_id: inspectorId,
        deadline: deadlineDate.toISOString().split('T')[0],
      };

      const { data: newAction } = await supabase
        .from('actions')
        .insert([actionData])
        .select()
        .single();

      // Send email notification for each action created
      if (newAction && managerUser?.email) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        await sendActionCreatedEmail(
          { 
            email: managerUser.email, 
            name: managerUser.full_name || managerUser.first_name || 'Manager' 
          },
          {
            actionId: newAction.id,
            actionTitle: newAction.title,
            locationName: audit.location?.name || 'Unknown Location',
            urgency: newAction.urgency,
            deadline: newAction.deadline 
              ? new Date(newAction.deadline).toLocaleDateString('nl-NL')
              : null,
            description: newAction.description,
            createdBy: audit.inspector?.full_name || 'Inspector',
            dashboardUrl: `${appUrl}/dashboard/actions/${newAction.id}`,
          }
        );
      }
    }

    // Send audit completed email to location manager
    if (managerUser?.email) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      await sendAuditCompletedEmail(
        { 
          email: managerUser.email, 
          name: managerUser.full_name || managerUser.first_name || 'Manager' 
        },
        {
          auditId,
          locationName: audit.location?.name || 'Unknown Location',
          auditDate: new Date(audit.audit_date).toLocaleDateString('nl-NL'),
          passPercentage,
          passed,
          totalActions: failedItems.length,
          inspectorName: audit.inspector?.full_name || 'Inspector',
          dashboardUrl: `${appUrl}/dashboard/audits/${auditId}`,
        }
      );
    }

    revalidatePath('/dashboard/audits');
    revalidatePath('/dashboard/actions');
    revalidatePath(`/dashboard/audits/${auditId}`);
    return { success: true };
  } catch (error) {
    console.error('Error completing audit:', error);
    return { success: false, error: 'Failed to complete audit' };
  }
}

export async function deleteAudit(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createServiceClient();

    // First delete related audit results
    await supabase.from('audit_results').delete().eq('audit_id', id);
    
    // Delete related actions (optional - you might want to keep them)
    // await supabase.from('actions').delete().eq('audit_id', id);

    // Delete the audit
    const { error } = await supabase.from('audits').delete().eq('id', id);

    if (error) throw error;

    revalidatePath('/dashboard/audits');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    console.error('Error deleting audit:', error);
    return { success: false, error: 'Failed to delete audit' };
  }
}

// ============================================
// ACTIONS
// ============================================

export type ActionFilters = {
  status?: string;
  urgency?: string;
  locationId?: string;
  search?: string;
  overdue?: string;
};

export async function getActions(filters?: ActionFilters): Promise<Action[]> {
  try {
    const orgId = await getOrganizationId();
    if (!orgId) return [];

    const supabase = createServiceClient();
    
    // Get accessible location IDs based on user permissions
    const accessibleLocationIds = await getAccessibleLocationIds();

    let query = supabase
      .from('actions')
      .select(`
        *,
        location:locations(id, name)
      `)
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    // Apply role-based location filter (members only see their locations' actions)
    if (accessibleLocationIds !== null) {
      if (accessibleLocationIds.length === 0) {
        return [];
      }
      query = query.in('location_id', accessibleLocationIds);
    }

    // Apply filters
    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    if (filters?.urgency && filters.urgency !== 'all') {
      query = query.eq('urgency', filters.urgency);
    }

    if (filters?.locationId && filters.locationId !== 'all') {
      query = query.eq('location_id', filters.locationId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching actions:', error);
      return [];
    }

    let results = data || [];

    // Client-side filters
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      results = results.filter(action =>
        action.title?.toLowerCase().includes(searchLower) ||
        action.description?.toLowerCase().includes(searchLower) ||
        action.location?.name?.toLowerCase().includes(searchLower)
      );
    }

    // Filter overdue actions
    if (filters?.overdue === 'true') {
      const now = new Date();
      results = results.filter(action => 
        action.deadline && new Date(action.deadline) < now && 
        !['completed', 'verified'].includes(action.status)
      );
    }

    return results;
  } catch (error) {
    console.error('Error in getActions:', error);
    return [];
  }
}

export async function getAction(id: string) {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('actions')
    .select(`
      *,
      location:locations(id, name, address, city),
      audit:audits(id, audit_date, pass_percentage, passed, location:locations(name)),
      audit_result:audit_results(
        id,
        result,
        comments,
        photo_urls,
        template_item:audit_template_items(
          title,
          description,
          weight,
          category:audit_template_categories(name)
        )
      )
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching action:', error);
    return null;
  }

  return data;
}

// ============================================
// GET MY ASSIGNED ACTIONS
// ============================================

export async function getMyActions(limit: number = 10): Promise<Action[]> {
  try {
    const orgId = await getOrganizationId();
    if (!orgId) return [];

    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) return [];

    const supabase = createServiceClient();

    // Get the user's Supabase ID
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_user_id', clerkUserId)
      .single();

    if (!userData) return [];

    const { data, error } = await supabase
      .from('actions')
      .select(`
        *,
        location:locations(id, name, city)
      `)
      .eq('organization_id', orgId)
      .eq('assigned_to_id', userData.id)
      .in('status', ['pending', 'in_progress'])
      .order('deadline', { ascending: true, nullsFirst: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching my actions:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getMyActions:', error);
    return [];
  }
}

export async function createAction(formData: FormData): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    const orgId = await getOrganizationId();
    if (!orgId) {
      return { success: false, error: 'No organization selected' };
    }
    
    const userId = await getUserId();
    const supabase = createServiceClient();

    // Get user's internal ID
    let userData = null;
    if (userId) {
      const { data } = await supabase
        .from('users')
        .select('id')
        .eq('clerk_user_id', userId)
        .single();
      userData = data;
    }

    const actionData = {
      organization_id: orgId,
      location_id: formData.get('locationId') as string,
      audit_id: formData.get('auditId') as string || null,
      title: formData.get('title') as string,
      description: formData.get('description') as string || null,
      urgency: formData.get('urgency') as string || 'medium',
      deadline: formData.get('deadline') as string || null,
      assigned_to_id: formData.get('assignedToId') as string || null,
      created_by_id: userData?.id || null,
      status: 'pending' as const,
    };

    const { data, error } = await supabase
      .from('actions')
      .insert([actionData])
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/dashboard/actions');
    return { success: true, id: data.id };
  } catch (error) {
    console.error('Error creating action:', error);
    return { success: false, error: 'Failed to create action' };
  }
}

export async function submitActionResponse(id: string, formData: FormData): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createServiceClient();

    const responsePhotosJson = formData.get('responsePhotos') as string;
    const responsePhotos = responsePhotosJson ? JSON.parse(responsePhotosJson) : [];

    const { error } = await supabase
      .from('actions')
      .update({
        status: 'completed',
        response_text: formData.get('responseText') as string,
        response_photos: responsePhotos,
        responded_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;

    revalidatePath('/dashboard/actions');
    revalidatePath(`/dashboard/actions/${id}`);
    return { success: true };
  } catch (error) {
    console.error('Error submitting response:', error);
    return { success: false, error: 'Failed to submit response' };
  }
}

export async function verifyAction(id: string, approved: boolean, notes?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await getUserId();
    const supabase = createServiceClient();

    // Get user's internal ID
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_user_id', userId)
      .single();

    const { error } = await supabase
      .from('actions')
      .update({
        status: approved ? 'verified' : 'rejected',
        verified_by_id: userData?.id,
        verified_at: new Date().toISOString(),
        verification_notes: notes || null,
      })
      .eq('id', id);

    if (error) throw error;

    revalidatePath('/dashboard/actions');
    revalidatePath(`/dashboard/actions/${id}`);
    return { success: true };
  } catch (error) {
    console.error('Error verifying action:', error);
    return { success: false, error: 'Failed to verify action' };
  }
}

export async function deleteAction(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createServiceClient();

    const { error } = await supabase.from('actions').delete().eq('id', id);

    if (error) throw error;

    revalidatePath('/dashboard/actions');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    console.error('Error deleting action:', error);
    return { success: false, error: 'Failed to delete action' };
  }
}

// ============================================
// DASHBOARD STATS
// ============================================

export async function getDashboardStats() {
  try {
    const orgId = await getOrganizationId();
    if (!orgId) {
      return {
        totalAudits: 0,
        passRate: 0,
        openActions: 0,
        locationsCount: 0,
      };
    }

    const supabase = createServiceClient();
    
    // Get accessible location IDs based on user permissions
    const accessibleLocationIds = await getAccessibleLocationIds();

    // Build queries with location filtering
    let auditsQuery = supabase
      .from('audits')
      .select('passed, location_id')
      .eq('organization_id', orgId)
      .eq('status', 'completed');
    
    let actionsQuery = supabase
      .from('actions')
      .select('id, location_id')
      .eq('organization_id', orgId)
      .in('status', ['pending', 'in_progress']);
    
    let locationsQuery = supabase
      .from('locations')
      .select('id')
      .eq('organization_id', orgId);

    // Apply role-based location filter if user is not admin/inspector
    if (accessibleLocationIds !== null) {
      if (accessibleLocationIds.length === 0) {
        return {
          totalAudits: 0,
          passRate: 0,
          openActions: 0,
          locationsCount: 0,
        };
      }
      auditsQuery = auditsQuery.in('location_id', accessibleLocationIds);
      actionsQuery = actionsQuery.in('location_id', accessibleLocationIds);
      locationsQuery = locationsQuery.in('id', accessibleLocationIds);
    }

    // Also get overdue actions and this month's audits
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const weekFromNowStr = weekFromNow.toISOString().split('T')[0];
    
    // First day of current month
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const firstDayStr = firstDayOfMonth.toISOString().split('T')[0];
    
    // First day of last month
    const firstDayLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastDayLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
    const firstDayLastMonthStr = firstDayLastMonth.toISOString().split('T')[0];
    const lastDayLastMonthStr = lastDayLastMonth.toISOString().split('T')[0];

    // Overdue actions query
    let overdueQuery = supabase
      .from('actions')
      .select('id, location_id')
      .eq('organization_id', orgId)
      .in('status', ['pending', 'in_progress'])
      .lt('deadline', todayStr);
    
    // Actions due this week
    let dueSoonQuery = supabase
      .from('actions')
      .select('id, location_id')
      .eq('organization_id', orgId)
      .in('status', ['pending', 'in_progress'])
      .gte('deadline', todayStr)
      .lte('deadline', weekFromNowStr);
    
    // This month's completed audits
    let thisMonthQuery = supabase
      .from('audits')
      .select('pass_percentage, location_id')
      .eq('organization_id', orgId)
      .eq('status', 'completed')
      .gte('audit_date', firstDayStr);
    
    // Last month's completed audits (for comparison)
    let lastMonthQuery = supabase
      .from('audits')
      .select('pass_percentage, location_id')
      .eq('organization_id', orgId)
      .eq('status', 'completed')
      .gte('audit_date', firstDayLastMonthStr)
      .lte('audit_date', lastDayLastMonthStr);

    // Apply role-based location filter if user is not admin/inspector
    if (accessibleLocationIds !== null) {
      if (accessibleLocationIds.length === 0) {
        return {
          totalAudits: 0,
          passRate: 0,
          openActions: 0,
          locationsCount: 0,
          overdueActions: 0,
          actionsDueSoon: 0,
          auditsThisMonth: 0,
          avgScoreThisMonth: 0,
          avgScoreLastMonth: 0,
          scoreTrend: 0,
        };
      }
      auditsQuery = auditsQuery.in('location_id', accessibleLocationIds);
      actionsQuery = actionsQuery.in('location_id', accessibleLocationIds);
      locationsQuery = locationsQuery.in('id', accessibleLocationIds);
      overdueQuery = overdueQuery.in('location_id', accessibleLocationIds);
      dueSoonQuery = dueSoonQuery.in('location_id', accessibleLocationIds);
      thisMonthQuery = thisMonthQuery.in('location_id', accessibleLocationIds);
      lastMonthQuery = lastMonthQuery.in('location_id', accessibleLocationIds);
    }

    const [
      auditsResult, 
      actionsResult, 
      locationsResult,
      overdueResult,
      dueSoonResult,
      thisMonthResult,
      lastMonthResult,
    ] = await Promise.all([
      auditsQuery,
      actionsQuery,
      locationsQuery,
      overdueQuery,
      dueSoonQuery,
      thisMonthQuery,
      lastMonthQuery,
    ]);

    const audits = auditsResult.data || [];
    const passedCount = audits.filter(a => a.passed).length;
    const passRate = audits.length > 0 ? Math.round((passedCount / audits.length) * 100) : 0;

    // Calculate average scores
    const thisMonthAudits = thisMonthResult.data || [];
    const lastMonthAudits = lastMonthResult.data || [];
    
    const avgScoreThisMonth = thisMonthAudits.length > 0 
      ? Math.round(thisMonthAudits.reduce((sum, a) => sum + (a.pass_percentage || 0), 0) / thisMonthAudits.length)
      : 0;
    
    const avgScoreLastMonth = lastMonthAudits.length > 0
      ? Math.round(lastMonthAudits.reduce((sum, a) => sum + (a.pass_percentage || 0), 0) / lastMonthAudits.length)
      : 0;
    
    const scoreTrend = avgScoreLastMonth > 0 ? avgScoreThisMonth - avgScoreLastMonth : 0;

    return {
      totalAudits: audits.length,
      passRate,
      openActions: actionsResult.data?.length || 0,
      locationsCount: locationsResult.data?.length || 0,
      overdueActions: overdueResult.data?.length || 0,
      actionsDueSoon: dueSoonResult.data?.length || 0,
      auditsThisMonth: thisMonthAudits.length,
      avgScoreThisMonth,
      avgScoreLastMonth,
      scoreTrend,
    };
  } catch (error) {
    console.error('Error in getDashboardStats:', error);
    return {
      totalAudits: 0,
      passRate: 0,
      openActions: 0,
      locationsCount: 0,
      overdueActions: 0,
      actionsDueSoon: 0,
      auditsThisMonth: 0,
      avgScoreThisMonth: 0,
      avgScoreLastMonth: 0,
      scoreTrend: 0,
    };
  }
}

// ============================================
// TEAM MEMBERS (from Clerk sync)
// ============================================

export async function getTeamMembers() {
  try {
    const orgId = await getOrganizationId();
    if (!orgId) return [];
    
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from('organization_members')
      .select(`
        *,
        user:users(id, clerk_user_id, email, first_name, last_name, avatar_url)
      `)
      .eq('organization_id', orgId);

    if (error) {
      console.error('Error fetching team members:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getTeamMembers:', error);
    return [];
  }
}

// ============================================
// ORGANIZATION MEMBERS (from Clerk)
// ============================================

export type OrganizationMember = {
  id: string;
  clerkUserId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string;
  imageUrl: string | null;
  role: string;
  // Internal Supabase user data if synced
  supabaseUserId?: string;
};

/**
 * Get organization members directly from Clerk
 * This ensures we get the latest members even if webhook sync is delayed
 * Also creates Supabase users for any Clerk users that don't exist yet
 */
export async function getOrganizationMembers(): Promise<OrganizationMember[]> {
  try {
    const { orgId } = await auth();
    if (!orgId) return [];

    const clerk = await clerkClient();
    const memberships = await clerk.organizations.getOrganizationMembershipList({
      organizationId: orgId,
      limit: 100,
    });

    const supabase = createServiceClient();
    
    // Get Supabase user IDs for these Clerk users
    const clerkUserIds = memberships.data
      .map(m => m.publicUserData?.userId)
      .filter((id): id is string => Boolean(id));
    
    const { data: supabaseUsers } = await supabase
      .from('users')
      .select('id, clerk_user_id')
      .in('clerk_user_id', clerkUserIds);

    const supabaseUserMap = new Map(
      supabaseUsers?.map(u => [u.clerk_user_id, u.id]) || []
    );

    // Find Clerk users that don't have a Supabase user yet and create them
    const missingClerkUserIds = clerkUserIds.filter(id => !supabaseUserMap.has(id));
    
    if (missingClerkUserIds.length > 0) {
      // Create missing users in Supabase
      for (const membership of memberships.data) {
        const userData = membership.publicUserData;
        const clerkUserId = userData?.userId;
        
        if (clerkUserId && missingClerkUserIds.includes(clerkUserId)) {
          const { data: newUser } = await supabase
            .from('users')
            .insert({
              clerk_user_id: clerkUserId,
              email: userData?.identifier || `${clerkUserId}@placeholder.local`,
              first_name: userData?.firstName || null,
              last_name: userData?.lastName || null,
              avatar_url: userData?.imageUrl || null,
              role: 'viewer', // Default role, will be updated by webhook
            })
            .select('id')
            .single();
          
          if (newUser) {
            supabaseUserMap.set(clerkUserId, newUser.id);
          }
        }
      }
    }

    return memberships.data.map((membership) => {
      const userData = membership.publicUserData;
      const firstName = userData?.firstName || '';
      const lastName = userData?.lastName || '';
      const clerkUserId = userData?.userId || '';
      
      return {
        id: membership.id,
        clerkUserId,
        email: userData?.identifier || '',
        firstName: firstName || null,
        lastName: lastName || null,
        fullName: `${firstName} ${lastName}`.trim() || userData?.identifier || 'Unknown',
        imageUrl: userData?.imageUrl || null,
        role: membership.role,
        supabaseUserId: supabaseUserMap.get(clerkUserId),
      };
    });
  } catch (error) {
    console.error('Error fetching organization members:', error);
    return [];
  }
}

/**
 * Get organization members who can be assigned as location managers
 * (members with 'org:member' or 'member' role)
 */
export async function getLocationManagerCandidates(): Promise<OrganizationMember[]> {
  const members = await getOrganizationMembers();
  
  // Members with 'org:member' role are the ones who should manage locations
  // But also include all members since any member could potentially be a manager
  return members.filter(m => 
    m.role === 'org:member' || 
    m.role === 'member' || 
    m.role === 'org:admin' || 
    m.role === 'admin'
  );
}

// ============================================
// PHOTO UPLOAD
// ============================================

export async function uploadPhoto(
  formData: FormData,
  bucket: 'audit-photos' | 'action-photos' = 'audit-photos'
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const orgId = await getOrganizationId();
    if (!orgId) {
      return { success: false, error: 'No organization selected' };
    }

    const file = formData.get('file') as File;
    if (!file) {
      return { success: false, error: 'No file provided' };
    }

    // Get optional context for organized storage
    const itemId = formData.get('itemId') as string;
    const auditId = formData.get('auditId') as string;
    const actionId = formData.get('actionId') as string;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return { success: false, error: 'Only image files are allowed' };
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      return { success: false, error: 'File size must be less than 10MB' };
    }

    const supabase = createServiceClient();

    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 9);
    const fileName = `${timestamp}-${randomId}.${fileExt}`;
    
    // Build organized file path based on context
    // Structure: {orgId}/{auditId|actionId}/{itemId}/{filename}
    let filePath: string;
    
    if (bucket === 'audit-photos' && auditId && itemId) {
      // Audit photos: organized by audit and checklist item
      filePath = `${orgId}/audits/${auditId}/items/${itemId}/${fileName}`;
    } else if (bucket === 'action-photos' && actionId) {
      // Action photos: organized by action
      filePath = `${orgId}/actions/${actionId}/${fileName}`;
    } else {
      // Fallback: just org folder
      filePath = `${orgId}/${fileName}`;
    }

    // Convert File to Buffer for server-side upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return { success: false, error: 'Failed to upload file' };
    }

    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(filePath);

    return { success: true, url: publicUrl };
  } catch (error) {
    console.error('Error uploading photo:', error);
    return { success: false, error: 'Failed to upload photo' };
  }
}

export async function deletePhoto(
  url: string,
  bucket: 'audit-photos' | 'action-photos' = 'audit-photos'
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createServiceClient();
    
    // Extract path from URL
    const path = url.split(`${bucket}/`)[1];
    if (!path) {
      return { success: false, error: 'Invalid photo URL' };
    }

    const { error } = await supabase.storage.from(bucket).remove([path]);

    if (error) {
      console.error('Delete error:', error);
      return { success: false, error: 'Failed to delete file' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting photo:', error);
    return { success: false, error: 'Failed to delete photo' };
  }
}

// ============================================
// PHOTO STATISTICS
// ============================================

export async function getPhotoStats(locationId?: string): Promise<{ 
  totalPhotos: number;
  auditsWithPhotos: number;
  photosByLocation: { locationId: string; locationName: string; photoCount: number }[];
}> {
  try {
    const orgId = await getOrganizationId();
    if (!orgId) {
      return { totalPhotos: 0, auditsWithPhotos: 0, photosByLocation: [] };
    }

    const supabase = createServiceClient();
    
    // Get all audit results with photos
    let query = supabase
      .from('audit_results')
      .select(`
        photo_urls,
        audit:audits!inner(
          id,
          organization_id,
          location_id,
          location:locations(name)
        )
      `)
      .eq('audit.organization_id', orgId);

    if (locationId) {
      query = query.eq('audit.location_id', locationId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching photo stats:', error);
      return { totalPhotos: 0, auditsWithPhotos: 0, photosByLocation: [] };
    }

    // Count photos
    let totalPhotos = 0;
    const auditIds = new Set<string>();
    const locationPhotoCounts: Record<string, { name: string; count: number }> = {};

    (data || []).forEach((result: any) => {
      const photos = result.photo_urls || [];
      if (photos.length > 0) {
        totalPhotos += photos.length;
        auditIds.add(result.audit?.id);
        
        const locId = result.audit?.location_id;
        const locName = result.audit?.location?.name || 'Unknown';
        if (locId) {
          if (!locationPhotoCounts[locId]) {
            locationPhotoCounts[locId] = { name: locName, count: 0 };
          }
          locationPhotoCounts[locId].count += photos.length;
        }
      }
    });

    const photosByLocation = Object.entries(locationPhotoCounts).map(([id, data]) => ({
      locationId: id,
      locationName: data.name,
      photoCount: data.count,
    })).sort((a, b) => b.photoCount - a.photoCount);

    return {
      totalPhotos,
      auditsWithPhotos: auditIds.size,
      photosByLocation,
    };
  } catch (error) {
    console.error('Error in getPhotoStats:', error);
    return { totalPhotos: 0, auditsWithPhotos: 0, photosByLocation: [] };
  }
}

// ============================================
// SYNC PLACEHOLDER USERS
// ============================================

/**
 * Sync all users with placeholder emails to get their real data from Clerk
 * Call this function to fix existing users with placeholder data
 */
export async function syncPlaceholderUsers(): Promise<{ success: boolean; synced: number; error?: string }> {
  try {
    const supabase = createServiceClient();
    const clerk = await clerkClient();
    
    // Find all users with placeholder emails
    const { data: placeholderUsers, error: fetchError } = await supabase
      .from('users')
      .select('id, clerk_user_id, email')
      .like('email', '%@placeholder.local');
    
    if (fetchError) {
      console.error('Error fetching placeholder users:', fetchError);
      return { success: false, synced: 0, error: 'Failed to fetch users' };
    }
    
    if (!placeholderUsers || placeholderUsers.length === 0) {
      return { success: true, synced: 0 };
    }
    
    let syncedCount = 0;
    
    for (const user of placeholderUsers) {
      try {
        // Get real user data from Clerk
        const clerkUser = await clerk.users.getUser(user.clerk_user_id);
        
        if (clerkUser) {
          const { error: updateError } = await supabase
            .from('users')
            .update({
              email: clerkUser.emailAddresses[0]?.emailAddress || user.email,
              first_name: clerkUser.firstName || null,
              last_name: clerkUser.lastName || null,
              avatar_url: clerkUser.imageUrl || null,
            })
            .eq('id', user.id);
          
          if (!updateError) {
            syncedCount++;
            console.log(`Synced user ${user.clerk_user_id}: ${clerkUser.emailAddresses[0]?.emailAddress}`);
          } else {
            console.error(`Failed to update user ${user.id}:`, updateError);
          }
        }
      } catch (clerkError) {
        console.error(`Failed to fetch Clerk user ${user.clerk_user_id}:`, clerkError);
      }
    }
    
    return { success: true, synced: syncedCount };
  } catch (error) {
    console.error('Error syncing placeholder users:', error);
    return { success: false, synced: 0, error: 'Failed to sync users' };
  }
}

