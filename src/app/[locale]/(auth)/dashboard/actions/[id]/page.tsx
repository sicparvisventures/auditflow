import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { getAction } from '@/actions/supabase';
import { TitleBar } from '@/features/dashboard/TitleBar';
import { ActionDetailHints } from '@/features/hints';

import { ActionResponseForm } from './ResponseForm';
import { VerifyActionForm } from './VerifyForm';

type Props = {
  params: { id: string; locale: string };
};

type ActionStatus = 'pending' | 'in_progress' | 'completed' | 'verified' | 'rejected';
type ActionUrgency = 'low' | 'medium' | 'high' | 'critical';

const statusColors: Record<ActionStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/30',
  verified: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30',
};

const statusLabels: Record<ActionStatus, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Awaiting Verification',
  verified: 'Verified',
  rejected: 'Rejected',
};

const urgencyColors: Record<ActionUrgency, string> = {
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

const urgencyLabels: Record<ActionUrgency, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

export default async function ActionDetailPage({ params }: Props) {
  const t = await getTranslations('ActionDetail');
  const action = await getAction(params.id);

  if (!action) {
    notFound();
  }

  const isOverdue = action.deadline && new Date(action.deadline) < new Date() && 
    !['verified', 'completed'].includes(action.status);

  return (
    <>
      <TitleBar
        title={t('title_bar')}
        description={action.location?.name || 'Unknown Location'}
      />

      {/* Contextual Hints */}
      <ActionDetailHints status={action.status} />

      <div className="mx-auto max-w-2xl space-y-6">
        {/* Status Header */}
        <div className="flex flex-wrap items-center gap-3">
          <span className={`rounded-full px-3 py-1 text-sm font-medium ${statusColors[action.status as ActionStatus]}`}>
            {statusLabels[action.status as ActionStatus]}
          </span>
          <span className={`rounded-full px-3 py-1 text-sm font-medium ${urgencyColors[action.urgency as ActionUrgency]}`}>
            {urgencyLabels[action.urgency as ActionUrgency]}
          </span>
          {action.deadline && (
            <span className={`text-sm ${isOverdue ? 'font-medium text-destructive' : 'text-muted-foreground'}`}>
              {isOverdue ? 'Overdue: ' : 'Due: '}
              {new Date(action.deadline).toLocaleDateString('nl-NL')}
            </span>
          )}
        </div>

        {/* Main Content Card */}
        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">{action.title}</h2>
          {action.description && (
            <p className="mb-6 text-muted-foreground">{action.description}</p>
          )}

          {/* Audit Reference */}
          {action.audit && (
            <div className="mb-6 flex items-center gap-4 rounded-lg bg-muted p-4">
              <svg
                className="size-5 text-muted-foreground"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                <rect x="9" y="3" width="6" height="4" rx="2" />
              </svg>
              <div>
                <p className="text-sm font-medium">{t('from_audit')}</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(action.audit.audit_date).toLocaleDateString('nl-NL')}
                </p>
              </div>
              <Link 
                href={`/dashboard/audits/${action.audit_id}`}
                className="ml-auto text-sm text-primary hover:underline"
              >
                View Audit
              </Link>
            </div>
          )}

          {/* Location Info */}
          <div className="flex items-center gap-3 border-t border-border pt-4">
            <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
              <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 21h18" />
                <path d="M5 21V7l8-4v18" />
                <path d="M19 21V11l-6-4" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium">{action.location?.name}</p>
              <p className="text-xs text-muted-foreground">
                {action.location?.address && `${action.location.address}, `}
                {action.location?.city}
              </p>
            </div>
          </div>
        </div>

        {/* Manager Response Section */}
        {action.response_text && (
          <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
            <h3 className="mb-4 font-semibold">{t('manager_response')}</h3>
            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm">{action.response_text}</p>
              {action.responded_at && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Responded: {new Date(action.responded_at).toLocaleString('nl-NL')}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Response Form (for pending/in_progress actions) */}
        {(action.status === 'pending' || action.status === 'in_progress') && (
          <ActionResponseForm actionId={action.id} />
        )}

        {/* Verification Form (for completed actions) */}
        {action.status === 'completed' && (
          <VerifyActionForm actionId={action.id} />
        )}

        {/* Back Button */}
        <Link
          href="/dashboard/actions"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          {t('back_to_actions')}
        </Link>
      </div>
    </>
  );
}

