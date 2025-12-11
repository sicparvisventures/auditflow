'use server';

import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';

import { createServiceClient, isSupabaseConfigured } from '@/libs/supabase/server';

// ============================================
// Types
// ============================================

export type Notification = {
  id: string;
  organization_id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  entity_type: string | null;
  entity_id: string | null;
  action_url: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
};

export type NotificationFilters = {
  isRead?: boolean;
  type?: string;
  priority?: string;
};

// ============================================
// Helper: Get User ID from Supabase
// ============================================

async function getSupabaseUserId(): Promise<string | null> {
  try {
    if (!isSupabaseConfigured()) return null;
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
// Get Notifications
// ============================================

export async function getNotifications(
  filters?: NotificationFilters,
  limit: number = 20
): Promise<Notification[]> {
  try {
    const userId = await getSupabaseUserId();
    if (!userId) return [];

    const supabase = createServiceClient();
    
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    // Apply filters
    if (filters?.isRead !== undefined) {
      query = query.eq('is_read', filters.isRead);
    }

    if (filters?.type && filters.type !== 'all') {
      query = query.eq('type', filters.type);
    }

    if (filters?.priority && filters.priority !== 'all') {
      query = query.eq('priority', filters.priority);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getNotifications:', error);
    return [];
  }
}

// ============================================
// Get Unread Count
// ============================================

export async function getUnreadNotificationCount(): Promise<number> {
  try {
    const userId = await getSupabaseUserId();
    if (!userId) return 0;

    const supabase = createServiceClient();
    
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Error in getUnreadNotificationCount:', error);
    return 0;
  }
}

// ============================================
// Mark Notification as Read
// ============================================

export async function markNotificationRead(
  notificationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await getSupabaseUserId();
    if (!userId) return { success: false, error: 'Not authenticated' };

    const supabase = createServiceClient();

    const { error } = await supabase
      .from('notifications')
      .update({ 
        is_read: true, 
        read_at: new Date().toISOString() 
      })
      .eq('id', notificationId)
      .eq('user_id', userId);

    if (error) throw error;

    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    console.error('Error marking notification read:', error);
    return { success: false, error: 'Failed to update notification' };
  }
}

// ============================================
// Mark All Notifications as Read
// ============================================

export async function markAllNotificationsRead(): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const userId = await getSupabaseUserId();
    if (!userId) return { success: false, count: 0, error: 'Not authenticated' };

    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from('notifications')
      .update({ 
        is_read: true, 
        read_at: new Date().toISOString() 
      })
      .eq('user_id', userId)
      .eq('is_read', false)
      .select();

    if (error) throw error;

    revalidatePath('/dashboard');
    return { success: true, count: data?.length || 0 };
  } catch (error) {
    console.error('Error marking all notifications read:', error);
    return { success: false, count: 0, error: 'Failed to update notifications' };
  }
}

// ============================================
// Delete Notification
// ============================================

export async function deleteNotification(
  notificationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await getSupabaseUserId();
    if (!userId) return { success: false, error: 'Not authenticated' };

    const supabase = createServiceClient();

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', userId);

    if (error) throw error;

    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    console.error('Error deleting notification:', error);
    return { success: false, error: 'Failed to delete notification' };
  }
}

// ============================================
// Create Notification (Internal use)
// ============================================

export async function createNotification(
  recipientUserId: string,
  type: string,
  title: string,
  message: string,
  entityType?: string,
  entityId?: string,
  actionUrl?: string,
  priority: 'low' | 'normal' | 'high' | 'urgent' = 'normal'
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const orgId = await getOrganizationId();
    if (!orgId) return { success: false, error: 'No organization' };

    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from('notifications')
      .insert([{
        organization_id: orgId,
        user_id: recipientUserId,
        type,
        title,
        message,
        entity_type: entityType || null,
        entity_id: entityId || null,
        action_url: actionUrl || null,
        priority,
      }])
      .select()
      .single();

    if (error) throw error;

    return { success: true, id: data.id };
  } catch (error) {
    console.error('Error creating notification:', error);
    return { success: false, error: 'Failed to create notification' };
  }
}

// ============================================
// Send Notification to Multiple Users
// ============================================

export async function sendNotificationToUsers(
  userIds: string[],
  type: string,
  title: string,
  message: string,
  entityType?: string,
  entityId?: string,
  actionUrl?: string,
  priority: 'low' | 'normal' | 'high' | 'urgent' = 'normal'
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const orgId = await getOrganizationId();
    if (!orgId) return { success: false, count: 0, error: 'No organization' };

    const supabase = createServiceClient();

    const notifications = userIds.map(userId => ({
      organization_id: orgId,
      user_id: userId,
      type,
      title,
      message,
      entity_type: entityType || null,
      entity_id: entityId || null,
      action_url: actionUrl || null,
      priority,
    }));

    const { data, error } = await supabase
      .from('notifications')
      .insert(notifications)
      .select();

    if (error) throw error;

    return { success: true, count: data?.length || 0 };
  } catch (error) {
    console.error('Error sending notifications:', error);
    return { success: false, count: 0, error: 'Failed to send notifications' };
  }
}
