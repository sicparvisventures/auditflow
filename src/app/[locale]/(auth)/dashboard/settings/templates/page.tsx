import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { getAuditTemplates } from '@/actions/supabase';
import { buttonVariants } from '@/components/ui/buttonVariants';
import { TitleBar } from '@/features/dashboard/TitleBar';
import { TemplatesPageHints } from '@/features/hints';

export default async function TemplatesPage() {
  const t = await getTranslations('AuditTemplates');
  const templates = await getAuditTemplates();

  return (
    <>
      <TitleBar
        title={t('title')}
        description={t('description')}
      />

      {/* Contextual Hints */}
      <TemplatesPageHints hasTemplates={templates.length > 0} />

      {/* Actions Bar */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-muted-foreground">
          {templates.length} {templates.length === 1 ? 'template' : 'templates'}
        </div>
        <Link
          href="/dashboard/settings/templates/new"
          className={buttonVariants({ size: 'sm' })}
        >
          <svg
            className="mr-2 size-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          {t('new_template')}
        </Link>
      </div>

      {/* Templates Grid */}
      {templates.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map(template => (
            <Link
              key={template.id}
              href={`/dashboard/settings/templates/${template.id}`}
              className="group relative rounded-lg border border-border bg-card p-5 shadow-sm transition-all hover:border-primary hover:shadow-md"
            >
              {/* Status Badge */}
              <span
                className={`absolute right-4 top-4 rounded-full px-2 py-0.5 text-xs font-medium ${
                  template.is_active
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800'
                }`}
              >
                {template.is_active ? 'Active' : 'Inactive'}
              </span>

              {/* Icon */}
              <div className="mb-4 flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <svg
                  className="size-6"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                  <rect x="9" y="3" width="6" height="4" rx="2" />
                  <path d="M9 12l2 2 4-4" />
                </svg>
              </div>

              {/* Content */}
              <h3 className="mb-1 font-semibold group-hover:text-primary">{template.name}</h3>
              {template.description && (
                <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">
                  {template.description}
                </p>
              )}

              {/* Stats */}
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 20V10" />
                    <path d="M18 20V4" />
                    <path d="M6 20v-4" />
                  </svg>
                  {template.pass_threshold}% pass threshold
                </span>
                {template.requires_photos && (
                  <span className="flex items-center gap-1">
                    <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                    Photos required
                  </span>
                )}
              </div>

              {/* Footer */}
              <div className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
                Created {new Date(template.created_at).toLocaleDateString('nl-NL')}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="rounded-lg border border-border bg-card p-12 text-center shadow-sm">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-muted">
            <svg
              className="size-8 text-muted-foreground"
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
          </div>
          <h3 className="mb-2 text-lg font-semibold">No templates yet</h3>
          <p className="mb-6 text-muted-foreground">Create your first audit template to get started</p>
          <Link href="/dashboard/settings/templates/new" className={buttonVariants()}>
            {t('new_template')}
          </Link>
        </div>
      )}
    </>
  );
}

