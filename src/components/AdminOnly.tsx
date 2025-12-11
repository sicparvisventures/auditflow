'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useUserRole } from '@/hooks/useUserRole';

type Props = {
  children: React.ReactNode;
  fallbackUrl?: string;
};

/**
 * Wrapper component that only renders children for admin users
 * Redirects members to the audits page
 */
export function AdminOnly({ children, fallbackUrl = '/dashboard/audits' }: Props) {
  const { isAdmin, isLoading } = useUserRole();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      router.replace(fallbackUrl);
    }
  }, [isAdmin, isLoading, fallbackUrl, router]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <svg className="size-8 animate-spin text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          <span className="text-sm text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  // Don't render for non-admins
  if (!isAdmin) {
    return null;
  }

  return <>{children}</>;
}
