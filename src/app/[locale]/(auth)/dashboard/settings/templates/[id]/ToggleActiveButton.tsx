'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { toggleTemplateActive } from '@/actions/supabase';
import { buttonVariants } from '@/components/ui/buttonVariants';

export function ToggleActiveButton({ templateId, isActive }: { templateId: string; isActive: boolean }) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);

  async function handleToggle() {
    setIsUpdating(true);
    const result = await toggleTemplateActive(templateId, !isActive);
    
    if (result.success) {
      router.refresh();
    } else {
      alert(result.error || 'Failed to update template');
    }
    
    setIsUpdating(false);
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isUpdating}
      className={buttonVariants({ variant: 'outline', size: 'sm' })}
    >
      {isUpdating ? 'Updating...' : isActive ? 'Deactivate' : 'Activate'}
    </button>
  );
}
