'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { deleteLocation } from '@/actions/supabase';
import { buttonVariants } from '@/components/ui/buttonVariants';

export function DeleteLocationButton({ locationId, locationName }: { locationId: string; locationName: string }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  async function handleDelete() {
    setIsDeleting(true);
    const result = await deleteLocation(locationId);
    
    if (result.success) {
      router.push('/dashboard/locations');
    } else {
      alert(result.error || 'Failed to delete location');
      setIsDeleting(false);
      setShowConfirm(false);
    }
  }

  if (showConfirm) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm">Delete "{locationName}"?</span>
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
      Delete Location
    </button>
  );
}

