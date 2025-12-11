'use server';

import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';

import { createServiceClient, isSupabaseConfigured } from '@/libs/supabase/server';

// ============================================
// Types
// ============================================

export type ActionComment = {
  id: string;
  action_id: string;
  user_id: string | null;
  user_name: string | null;
  user_email: string | null;
  user_avatar_url: string | null;
  comment: string;
  comment_type: 'comment' | 'status_change' | 'assignment' | 'system';
  attachments: string[];
  metadata: Record<string, any>;
  is_edited: boolean;
  edited_at: string | null;
  created_at: string;
};

// ============================================
// Helper: Get User Data
// ============================================

async function getUserData(): Promise<{
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
} | null> {
  try {
    if (!isSupabaseConfigured()) return null;
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) return null;
    
    const supabase = createServiceClient();
    const { data } = await supabase
      .from('users')
      .select('id, email, full_name, avatar_url')
      .eq('clerk_user_id', clerkUserId)
      .single();
    
    return data || null;
  } catch {
    return null;
  }
}

// ============================================
// Get Action Comments (Timeline)
// ============================================

export async function getActionComments(
  actionId: string
): Promise<ActionComment[]> {
  try {
    const supabase = createServiceClient();
    
    const { data, error } = await supabase
      .from('action_comments')
      .select('*')
      .eq('action_id', actionId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching comments:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getActionComments:', error);
    return [];
  }
}

// ============================================
// Add Comment
// ============================================

export async function addActionComment(
  actionId: string,
  comment: string,
  attachments: string[] = []
): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    const userData = await getUserData();
    if (!userData) {
      return { success: false, error: 'Not authenticated' };
    }

    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from('action_comments')
      .insert([{
        action_id: actionId,
        user_id: userData.id,
        user_name: userData.full_name,
        user_email: userData.email,
        user_avatar_url: userData.avatar_url,
        comment,
        comment_type: 'comment',
        attachments,
      }])
      .select()
      .single();

    if (error) throw error;

    revalidatePath(`/dashboard/actions/${actionId}`);
    return { success: true, id: data.id };
  } catch (error) {
    console.error('Error adding comment:', error);
    return { success: false, error: 'Failed to add comment' };
  }
}

// ============================================
// Edit Comment
// ============================================

export async function editActionComment(
  commentId: string,
  newComment: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const userData = await getUserData();
    if (!userData) {
      return { success: false, error: 'Not authenticated' };
    }

    const supabase = createServiceClient();

    // Verify ownership
    const { data: existing } = await supabase
      .from('action_comments')
      .select('user_id, action_id')
      .eq('id', commentId)
      .single();

    if (!existing || existing.user_id !== userData.id) {
      return { success: false, error: 'Cannot edit this comment' };
    }

    const { error } = await supabase
      .from('action_comments')
      .update({
        comment: newComment,
        is_edited: true,
        edited_at: new Date().toISOString(),
      })
      .eq('id', commentId);

    if (error) throw error;

    revalidatePath(`/dashboard/actions/${existing.action_id}`);
    return { success: true };
  } catch (error) {
    console.error('Error editing comment:', error);
    return { success: false, error: 'Failed to edit comment' };
  }
}

// ============================================
// Delete Comment
// ============================================

export async function deleteActionComment(
  commentId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const userData = await getUserData();
    if (!userData) {
      return { success: false, error: 'Not authenticated' };
    }

    const supabase = createServiceClient();

    // Get comment to verify ownership and get action_id for revalidation
    const { data: existing } = await supabase
      .from('action_comments')
      .select('user_id, action_id')
      .eq('id', commentId)
      .single();

    if (!existing || existing.user_id !== userData.id) {
      return { success: false, error: 'Cannot delete this comment' };
    }

    const { error } = await supabase
      .from('action_comments')
      .delete()
      .eq('id', commentId);

    if (error) throw error;

    revalidatePath(`/dashboard/actions/${existing.action_id}`);
    return { success: true };
  } catch (error) {
    console.error('Error deleting comment:', error);
    return { success: false, error: 'Failed to delete comment' };
  }
}

// ============================================
// Get Comment Count for Action
// ============================================

export async function getActionCommentCount(
  actionId: string
): Promise<number> {
  try {
    const supabase = createServiceClient();
    
    const { count, error } = await supabase
      .from('action_comments')
      .select('*', { count: 'exact', head: true })
      .eq('action_id', actionId)
      .eq('comment_type', 'comment'); // Only user comments

    if (error) {
      console.error('Error getting comment count:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Error in getActionCommentCount:', error);
    return 0;
  }
}
