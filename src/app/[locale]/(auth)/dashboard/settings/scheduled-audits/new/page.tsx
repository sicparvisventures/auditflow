'use client';

import { useTransition } from 'react';

import { useRouter } from 'next/navigation';

import { createScheduledAudit } from '@/actions/scheduled-audits';
import { TitleBar } from '@/features/dashboard/TitleBar';

import { ScheduledAuditForm } from '../ScheduledAuditForm';

export default function NewScheduledAuditPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (formData: FormData) => {
    startTransition(async () => {
      const result = await createScheduledAudit(formData);
      if (result.success) {
        router.push('/dashboard/settings/scheduled-audits');
      } else {
        alert(result.error || 'Failed to create schedule');
      }
    });
  };

  return (
    <>
      <TitleBar
        title="New Scheduled Audit"
        description="Create a recurring audit schedule"
      />

      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <ScheduledAuditForm
          onSubmit={handleSubmit}
          isPending={isPending}
        />
      </div>
    </>
  );
}
