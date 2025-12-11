'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useUserRole } from '@/hooks/useUserRole';

type Props = {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'member';
  fallbackUrl?: string;
};

/**
 * Component to guard routes based on user role
 * - If user doesn't have required role, redirects to fallback URL
 * - Shows loading state while checking role
 */
export function RoleGuard({ children, requiredRole = 'admin', fallbackUrl = '/dashboard/audits' }: Props) {
  const { isAdmin, isMember, isLoading } = useUserRole();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const hasAccess = requiredRole === 'admin' ? isAdmin : (isMember || isAdmin);
    
    if (!hasAccess) {
      router.replace(fallbackUrl);
    }
  }, [isAdmin, isMember, isLoading, requiredRole, fallbackUrl, router]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <svg className="size-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  // Check access
  const hasAccess = requiredRole === 'admin' ? isAdmin : (isMember || isAdmin);
  
  if (!hasAccess) {
    return null; // Will redirect in useEffect
  }

  return <>{children}</>;
}

/**
 * HOC to wrap pages with role guard
 */
export function withRoleGuard<P extends object>(
  Component: React.ComponentType<P>,
  requiredRole: 'admin' | 'member' = 'admin',
  fallbackUrl = '/dashboard/audits'
) {
  return function GuardedComponent(props: P) {
    return (
      <RoleGuard requiredRole={requiredRole} fallbackUrl={fallbackUrl}>
        <Component {...props} />
      </RoleGuard>
    );
  };
}
