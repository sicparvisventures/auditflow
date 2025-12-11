import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { getAction, getUserPermissions } from '@/actions/supabase';
import { getActionComments } from '@/actions/comments';
import { ActionTimeline } from '@/features/actions';
import { TitleBar } from '@/features/dashboard/TitleBar';
import { ActionDetailHints } from '@/features/hints';

import { ActionResponseForm } from './ResponseForm';
import { DeleteActionButton } from './DeleteActionButton';
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
  const [action, comments, permissions] = await Promise.all([
    getAction(params.id),
    getActionComments(params.id),
    getUserPermissions(),
  ]);

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

          {/* Audit Context */}
          {action.audit && (
            <div className="mb-6 rounded-lg border border-border bg-muted/50">
              {/* Audit Header */}
              <div className="flex items-center gap-4 border-b border-border p-4">
                <svg
                  className="size-5 text-muted-foreground"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                  <rect x="9" y="3" width="6" height="4" rx="2" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-medium">{t('from_audit')}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(action.audit.audit_date).toLocaleDateString('nl-NL', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </p>
                </div>
                <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                  action.audit.passed
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {Math.round(action.audit.pass_percentage)}%
                </span>
                <Link 
                  href={`/dashboard/audits/${action.audit_id}`}
                  className="text-sm text-primary hover:underline"
                >
                  View Audit →
                </Link>
              </div>
              
              {/* Failed Item Details */}
              {action.audit_result && (
                <div className="p-4">
                  <div className="mb-2 flex items-start gap-2">
                    <span className="mt-0.5 flex size-5 items-center justify-center rounded-full bg-red-100 text-red-600">
                      <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {action.audit_result.template_item?.title}
                      </p>
                      {action.audit_result.template_item?.category?.name && (
                        <p className="text-xs text-muted-foreground">
                          Category: {action.audit_result.template_item.category.name}
                        </p>
                      )}
                    </div>
                    {action.audit_result.template_item?.weight && (
                      <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        {action.audit_result.template_item.weight} pts
                      </span>
                    )}
                  </div>
                  
                  {/* Inspector comment */}
                  {action.audit_result.comments && (
                    <div className="mt-3 rounded bg-yellow-50 p-3 text-sm dark:bg-yellow-900/20">
                      <p className="mb-1 text-xs font-medium text-yellow-700 dark:text-yellow-500">Inspector Note:</p>
                      <p className="text-yellow-800 dark:text-yellow-200">{action.audit_result.comments}</p>
                    </div>
                  )}
                  
                  {/* Evidence photos from audit */}
                  {action.audit_result.photo_urls && action.audit_result.photo_urls.length > 0 && (
                    <div className="mt-3">
                      <p className="mb-2 text-xs font-medium text-muted-foreground">Evidence Photos:</p>
                      <div className="flex flex-wrap gap-2">
                        {action.audit_result.photo_urls.map((url: string, idx: number) => (
                          <a
                            key={idx}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block size-16 overflow-hidden rounded-lg border border-border"
                          >
                            <img src={url} alt={`Evidence ${idx + 1}`} className="size-full object-cover" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
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
              
              {/* Response Photos */}
              {action.response_photos && action.response_photos.length > 0 && (
                <div className="mt-4">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">Proof Photos</p>
                  <div className="flex flex-wrap gap-2">
                    {action.response_photos.map((url: string, index: number) => (
                      <a
                        key={index}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group relative block size-20 overflow-hidden rounded-lg border border-border"
                      >
                        <img
                          src={url}
                          alt={`Response photo ${index + 1}`}
                          className="size-full object-cover transition-transform group-hover:scale-110"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/40">
                          <svg className="size-5 text-white opacity-0 transition-opacity group-hover:opacity-100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                          </svg>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
              
              {action.responded_at && (
                <p className="mt-3 text-xs text-muted-foreground">
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

        {/* Comments / Timeline */}
        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <ActionTimeline
            actionId={action.id}
            comments={comments}
            currentUserId={permissions.supabaseUserId || undefined}
          />
        </div>

        {/* Danger Zone */}
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-destructive">Danger Zone</h3>
              <p className="text-sm text-muted-foreground">Permanently delete this action</p>
            </div>
            <DeleteActionButton actionId={action.id} actionTitle={action.title} />
          </div>
        </div>

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

