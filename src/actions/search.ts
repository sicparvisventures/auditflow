'use server';

import { auth } from '@clerk/nextjs/server';

import { createServiceClient, isSupabaseConfigured } from '@/libs/supabase/server';

type SearchResult = {
  id: string;
  type: 'audit' | 'action' | 'location' | 'template';
  title: string;
  subtitle: string;
  url: string;
  status?: string;
  score?: number;
};

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

export async function globalSearch(query: string): Promise<SearchResult[]> {
  try {
    if (query.length < 2) return [];

    const orgId = await getOrganizationId();
    if (!orgId) return [];

    const supabase = createServiceClient();
    const searchTerm = `%${query.toLowerCase()}%`;
    const results: SearchResult[] = [];

    // Search audits
    const { data: audits } = await supabase
      .from('audits')
      .select(`
        id,
        audit_date,
        status,
        pass_percentage,
        location:locations(name)
      `)
      .eq('organization_id', orgId)
      .or(`status.ilike.${searchTerm}`)
      .limit(5);

    // Also search by location name through a separate query
    const { data: auditsByLocation } = await supabase
      .from('audits')
      .select(`
        id,
        audit_date,
        status,
        pass_percentage,
        location:locations!inner(name)
      `)
      .eq('organization_id', orgId)
      .ilike('locations.name', searchTerm)
      .limit(5);

    const allAudits = [...(audits || []), ...(auditsByLocation || [])];
    const uniqueAudits = allAudits.filter((audit, index, self) =>
      index === self.findIndex(a => a.id === audit.id)
    );

    uniqueAudits.forEach(audit => {
      const locationName = (audit.location as any)?.name || 'Unknown Location';
      results.push({
        id: audit.id,
        type: 'audit',
        title: locationName,
        subtitle: `Audit on ${new Date(audit.audit_date).toLocaleDateString('nl-NL')}`,
        url: `/dashboard/audits/${audit.id}`,
        status: audit.status,
        score: audit.status === 'completed' ? Math.round(audit.pass_percentage) : undefined,
      });
    });

    // Search actions
    const { data: actions } = await supabase
      .from('actions')
      .select(`
        id,
        title,
        status,
        urgency,
        location:locations(name)
      `)
      .eq('organization_id', orgId)
      .or(`title.ilike.${searchTerm},description.ilike.${searchTerm}`)
      .limit(5);

    (actions || []).forEach(action => {
      const locationName = (action.location as any)?.name || 'Unknown';
      results.push({
        id: action.id,
        type: 'action',
        title: action.title,
        subtitle: `${locationName} • ${action.urgency} urgency`,
        url: `/dashboard/actions/${action.id}`,
        status: action.status,
      });
    });

    // Search locations
    const { data: locations } = await supabase
      .from('locations')
      .select('id, name, city, status')
      .eq('organization_id', orgId)
      .or(`name.ilike.${searchTerm},city.ilike.${searchTerm},address.ilike.${searchTerm}`)
      .limit(5);

    (locations || []).forEach(location => {
      results.push({
        id: location.id,
        type: 'location',
        title: location.name,
        subtitle: location.city || 'No city',
        url: `/dashboard/locations/${location.id}`,
        status: location.status,
      });
    });

    // Search templates
    const { data: templates } = await supabase
      .from('audit_templates')
      .select('id, name, description, is_active')
      .eq('organization_id', orgId)
      .or(`name.ilike.${searchTerm},description.ilike.${searchTerm}`)
      .limit(5);

    (templates || []).forEach(template => {
      results.push({
        id: template.id,
        type: 'template',
        title: template.name,
        subtitle: template.description || 'No description',
        url: `/dashboard/settings/templates/${template.id}`,
        status: template.is_active ? 'active' : 'inactive',
      });
    });

    return results;
  } catch (error) {
    console.error('Error in globalSearch:', error);
    return [];
  }
}
