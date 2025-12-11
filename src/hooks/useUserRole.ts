'use client';

import { useOrganization } from '@clerk/nextjs';

export type UserRole = 'admin' | 'member' | 'unknown';

/**
 * Hook to get the current user's role in the active organization
 * Returns 'admin' for org:admin, 'member' for org:member
 */
export function useUserRole(): {
  role: UserRole;
  isAdmin: boolean;
  isMember: boolean;
  isLoading: boolean;
} {
  const { membership, isLoaded } = useOrganization();

  if (!isLoaded) {
    return {
      role: 'unknown',
      isAdmin: false,
      isMember: false,
      isLoading: true,
    };
  }

  // Get the role from membership
  const clerkRole = membership?.role;
  
  // Map Clerk roles to our roles
  const isAdmin = clerkRole === 'org:admin';
  const isMember = clerkRole === 'org:member';
  
  const role: UserRole = isAdmin ? 'admin' : isMember ? 'member' : 'unknown';

  return {
    role,
    isAdmin,
    isMember: isMember || isAdmin, // Admins are also members
    isLoading: false,
  };
}

/**
 * Check if user has access to a specific feature
 */
export function useHasAccess(requiredRole: 'admin' | 'member'): boolean {
  const { isAdmin, isMember, isLoading } = useUserRole();
  
  if (isLoading) return false;
  
  if (requiredRole === 'admin') {
    return isAdmin;
  }
  
  // Members can access member features, admins can access everything
  return isMember || isAdmin;
}
