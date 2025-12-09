'use client';

import { useOrganization, useUser } from '@clerk/nextjs';
import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/libs/supabase/client';

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
};

// ============================================
// Hook: useLocations
// ============================================

export function useLocations() {
  const { organization } = useOrganization();
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLocations = useCallback(async () => {
    if (!organization?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: supabaseError } = await supabase
        .from('locations')
        .select('*')
        .eq('organization_id', organization.id)
        .order('name');

      if (supabaseError) throw supabaseError;
      setLocations(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch locations');
    } finally {
      setIsLoading(false);
    }
  }, [organization?.id]);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const createLocation = async (locationData: Omit<Location, 'id' | 'created_at' | 'updated_at'>) => {
    if (!organization?.id) throw new Error('No organization');

    const { data, error: supabaseError } = await supabase
      .from('locations')
      .insert([{ ...locationData, organization_id: organization.id }])
      .select()
      .single();

    if (supabaseError) throw supabaseError;
    setLocations(prev => [...prev, data]);
    return data;
  };

  const updateLocation = async (id: string, updates: Partial<Location>) => {
    const { data, error: supabaseError } = await supabase
      .from('locations')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (supabaseError) throw supabaseError;
    setLocations(prev => prev.map(loc => (loc.id === id ? data : loc)));
    return data;
  };

  const deleteLocation = async (id: string) => {
    const { error: supabaseError } = await supabase.from('locations').delete().eq('id', id);

    if (supabaseError) throw supabaseError;
    setLocations(prev => prev.filter(loc => loc.id !== id));
  };

  return {
    locations,
    isLoading,
    error,
    refetch: fetchLocations,
    createLocation,
    updateLocation,
    deleteLocation,
  };
}

// ============================================
// Hook: useAuditTemplates
// ============================================

export function useAuditTemplates() {
  const { organization } = useOrganization();
  const [templates, setTemplates] = useState<AuditTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    if (!organization?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: supabaseError } = await supabase
        .from('audit_templates')
        .select('*')
        .eq('organization_id', organization.id)
        .order('name');

      if (supabaseError) throw supabaseError;
      setTemplates(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch templates');
    } finally {
      setIsLoading(false);
    }
  }, [organization?.id]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  return {
    templates,
    isLoading,
    error,
    refetch: fetchTemplates,
  };
}

// ============================================
// Hook: useAudits
// ============================================

export function useAudits(locationId?: string) {
  const { organization } = useOrganization();
  const [audits, setAudits] = useState<Audit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAudits = useCallback(async () => {
    if (!organization?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('audits')
        .select('*')
        .eq('organization_id', organization.id)
        .order('audit_date', { ascending: false });

      if (locationId) {
        query = query.eq('location_id', locationId);
      }

      const { data, error: supabaseError } = await query;

      if (supabaseError) throw supabaseError;
      setAudits(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch audits');
    } finally {
      setIsLoading(false);
    }
  }, [organization?.id, locationId]);

  useEffect(() => {
    fetchAudits();
  }, [fetchAudits]);

  return {
    audits,
    isLoading,
    error,
    refetch: fetchAudits,
  };
}

// ============================================
// Hook: useActions
// ============================================

export function useActions(status?: Action['status']) {
  const { organization } = useOrganization();
  const [actions, setActions] = useState<Action[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActions = useCallback(async () => {
    if (!organization?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('actions')
        .select('*')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error: supabaseError } = await query;

      if (supabaseError) throw supabaseError;
      setActions(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch actions');
    } finally {
      setIsLoading(false);
    }
  }, [organization?.id, status]);

  useEffect(() => {
    fetchActions();
  }, [fetchActions]);

  const updateAction = async (id: string, updates: Partial<Action>) => {
    const { data, error: supabaseError } = await supabase
      .from('actions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (supabaseError) throw supabaseError;
    setActions(prev => prev.map(action => (action.id === id ? data : action)));
    return data;
  };

  return {
    actions,
    isLoading,
    error,
    refetch: fetchActions,
    updateAction,
  };
}

// ============================================
// Hook: useDashboardStats
// ============================================

export function useDashboardStats() {
  const { organization } = useOrganization();
  const [stats, setStats] = useState({
    totalAudits: 0,
    passRate: 0,
    openActions: 0,
    locationsCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!organization?.id) return;

    setIsLoading(true);

    try {
      // Fetch all stats in parallel
      const [auditsResult, actionsResult, locationsResult] = await Promise.all([
        supabase
          .from('audits')
          .select('passed')
          .eq('organization_id', organization.id)
          .eq('status', 'completed'),
        supabase
          .from('actions')
          .select('id')
          .eq('organization_id', organization.id)
          .in('status', ['pending', 'in_progress']),
        supabase
          .from('locations')
          .select('id')
          .eq('organization_id', organization.id),
      ]);

      const audits = auditsResult.data || [];
      const passedCount = audits.filter(a => a.passed).length;
      const passRate = audits.length > 0 ? Math.round((passedCount / audits.length) * 100) : 0;

      setStats({
        totalAudits: audits.length,
        passRate,
        openActions: actionsResult.data?.length || 0,
        locationsCount: locationsResult.data?.length || 0,
      });
    } catch (err) {
      console.error('Failed to fetch dashboard stats:', err);
    } finally {
      setIsLoading(false);
    }
  }, [organization?.id]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, isLoading, refetch: fetchStats };
}

// ============================================
// Hook: usePhotoUpload
// ============================================

export function usePhotoUpload(bucket: 'audit-photos' | 'action-photos') {
  const { organization } = useOrganization();
  const { user } = useUser();
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const uploadPhoto = async (file: File, path?: string): Promise<string> => {
    if (!organization?.id || !user?.id) {
      throw new Error('User or organization not available');
    }

    setIsUploading(true);
    setProgress(0);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = path || `${organization.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(filePath);

      setProgress(100);
      return publicUrl;
    } finally {
      setIsUploading(false);
    }
  };

  const deletePhoto = async (url: string) => {
    const path = url.split(`${bucket}/`)[1];
    if (!path) return;

    await supabase.storage.from(bucket).remove([path]);
  };

  return {
    uploadPhoto,
    deletePhoto,
    isUploading,
    progress,
  };
}

