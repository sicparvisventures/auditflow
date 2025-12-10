'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { deleteAudit } from '@/actions/supabase';
import { buttonVariants } from '@/components/ui/buttonVariants';

export function DeleteAuditButton({ auditId, locationName }: { auditId: string; locationName: string }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  async function handleDelete() {
    setIsDeleting(true);
    const result = await deleteAudit(auditId);
    
    if (result.success) {
      router.push('/dashboard/audits');
    } else {
      alert(result.error || 'Failed to delete audit');
      setIsDeleting(false);
      setShowConfirm(false);
    }
  }

  if (showConfirm) {
    return (
      <div className="flex flex-col gap-3 rounded-lg border border-destructive/50 bg-destructive/5 p-4">
        <p className="text-sm">
          Delete audit at <strong>{locationName}</strong>? This will also delete all results.
        </p>
        <div className="flex gap-2">
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className={buttonVariants({ variant: 'destructive', size: 'sm' })}
          >
            {isDeleting ? 'Deleting...' : 'Yes, Delete'}
          </button>
          <button
            onClick={() => setShowConfirm(false)}
            disabled={isDeleting}
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      className={buttonVariants({ variant: 'outline', size: 'sm', className: 'text-destructive hover:bg-destructive hover:text-destructive-foreground' })}
    >
      <svg className="mr-2 size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        <line x1="10" y1="11" x2="10" y2="17" />
        <line x1="14" y1="11" x2="14" y2="17" />
      </svg>
      Delete
    </button>
  );
}
