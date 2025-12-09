'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { deleteAuditTemplate } from '@/actions/supabase';
import { buttonVariants } from '@/components/ui/buttonVariants';

export function DeleteTemplateButton({ templateId, templateName }: { templateId: string; templateName: string }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  async function handleDelete() {
    setIsDeleting(true);
    const result = await deleteAuditTemplate(templateId);
    
    if (result.success) {
      router.push('/dashboard/settings/templates');
    } else {
      alert(result.error || 'Failed to delete template');
      setIsDeleting(false);
      setShowConfirm(false);
    }
  }

  if (showConfirm) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm">Delete "{templateName}"?</span>
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
    );
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      className={buttonVariants({ variant: 'destructive', size: 'sm' })}
    >
      Delete Template
    </button>
  );
}
