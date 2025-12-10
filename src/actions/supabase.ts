'use server';

import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';

import { createServiceClient, isSupabaseConfigured } from '@/libs/supabase/server';

// ============================================
// Types
// ============================================

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
  status: string;
  created_at: string;
  updated_at: string;
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

async function getOrganizationId(): Promise<string | null> {
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
      .select('id')
      .eq('clerk_user_id', clerkUserId)
      .single();
    
    if (existingUser) {
      return existingUser.id;
    }
    
    // User doesn't exist, create them
    // Get user info from Clerk session claims if available
    const { data: newUser, error } = await supabase
      .from('users')
      .insert([{
        clerk_user_id: clerkUserId,
        email: `${clerkUserId}@placeholder.local`, // Will be updated by webhook
        role: 'admin',
      }])
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

    let query = supabase
      .from('locations')
      .select('*')
      .eq('organization_id', orgId)
      .order('name');

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
    
    // Client-side search filter
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      results = results.filter(location => 
        location.name?.toLowerCase().includes(searchLower) ||
        location.address?.toLowerCase().includes(searchLower) ||
        location.city?.toLowerCase().includes(searchLower)
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
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching location:', error);
    return null;
  }

  return data;
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

    const updates = {
      name: formData.get('name') as string,
      address: formData.get('address') as string || null,
      city: formData.get('city') as string || null,
      postal_code: formData.get('postalCode') as string || null,
      country: formData.get('country') as string || 'Netherlands',
      phone: formData.get('phone') as string || null,
      email: formData.get('email') as string || null,
      manager_id: formData.get('managerId') as string || null,
    };

    const { error } = await supabase
      .from('locations')
      .update(updates)
      .eq('id', id);

    if (error) throw error;

    revalidatePath('/dashboard/locations');
    revalidatePath(`/dashboard/locations/${id}`);
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

    let query = supabase
      .from('audits')
      .select(`
        *,
        location:locations(id, name, city),
        template:audit_templates(id, name)
      `)
      .eq('organization_id', orgId)
      .order('audit_date', { ascending: false });

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
      inspector:users!audits_inspector_id_fkey(id, first_name, last_name, email)
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching audit:', error);
    return null;
  }

  // Get results with template items and photos
  const { data: results } = await supabase
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

export async function saveAuditResults(auditId: string, results: any[]): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createServiceClient();

    // Delete existing results for this audit first (simpler than upsert)
    await supabase
      .from('audit_results')
      .delete()
      .eq('audit_id', auditId);

    // Insert all results
    const resultsData = results.map(result => ({
      audit_id: auditId,
      template_item_id: result.templateItemId,
      result: result.result || 'na',
      score: result.result === 'pass' ? 1 : 0,
      comments: result.comments || null,
      photo_urls: result.photoUrls || [],
    }));

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

    // Get the audit details
    const { data: audit } = await supabase
      .from('audits')
      .select('*, location:locations(id, name, manager_id)')
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

      await supabase.from('actions').insert([actionData]);
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

    let query = supabase
      .from('actions')
      .select(`
        *,
        location:locations(id, name)
      `)
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

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

    const [auditsResult, actionsResult, locationsResult] = await Promise.all([
      supabase
        .from('audits')
        .select('passed')
        .eq('organization_id', orgId)
        .eq('status', 'completed'),
      supabase
        .from('actions')
        .select('id')
        .eq('organization_id', orgId)
        .in('status', ['pending', 'in_progress']),
      supabase
        .from('locations')
        .select('id')
        .eq('organization_id', orgId),
    ]);

    const audits = auditsResult.data || [];
    const passedCount = audits.filter(a => a.passed).length;
    const passRate = audits.length > 0 ? Math.round((passedCount / audits.length) * 100) : 0;

    return {
      totalAudits: audits.length,
      passRate,
      openActions: actionsResult.data?.length || 0,
      locationsCount: locationsResult.data?.length || 0,
    };
  } catch (error) {
    console.error('Error in getDashboardStats:', error);
    return {
      totalAudits: 0,
      passRate: 0,
      openActions: 0,
      locationsCount: 0,
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

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return { success: false, error: 'Only image files are allowed' };
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      return { success: false, error: 'File size must be less than 10MB' };
    }

    const supabase = createServiceClient();

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${orgId}/${fileName}`;

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

