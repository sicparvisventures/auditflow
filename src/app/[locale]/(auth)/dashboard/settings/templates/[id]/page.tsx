import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getAuditTemplate } from '@/actions/supabase';
import { buttonVariants } from '@/components/ui/buttonVariants';
import { TitleBar } from '@/features/dashboard/TitleBar';
import { TemplateDetailHints } from '@/features/hints';

import { DeleteTemplateButton } from './DeleteButton';
import { ToggleActiveButton } from './ToggleActiveButton';

type Props = {
  params: { id: string; locale: string };
};

export default async function TemplateDetailPage({ params }: Props) {
  const template = await getAuditTemplate(params.id);

  if (!template) {
    notFound();
  }

  const totalItems = template.categories?.reduce(
    (acc: number, cat: any) => acc + (cat.items?.length || 0),
    0
  ) || 0;

  return (
    <>
      <TitleBar
        title={template.name}
        description={template.description || 'Audit template'}
      />

      {/* Contextual Hints */}
      <TemplateDetailHints />

      <div className="mx-auto max-w-3xl space-y-6">
        {/* Status & Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span
              className={`rounded-full px-3 py-1 text-sm font-medium ${
                template.is_active
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-800'
              }`}
            >
              {template.is_active ? 'Active' : 'Inactive'}
            </span>
            <span className="text-sm text-muted-foreground">
              {template.categories?.length || 0} categories • {totalItems} items
            </span>
          </div>
          <div className="flex gap-2">
            <ToggleActiveButton templateId={template.id} isActive={template.is_active} />
            <Link
              href={`/dashboard/settings/templates/${template.id}/edit`}
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              <svg className="mr-2 size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Edit
            </Link>
          </div>
        </div>

        {/* Template Info Card */}
        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <h3 className="mb-4 font-semibold">Template Settings</h3>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-muted-foreground">Pass Threshold</dt>
              <dd className="text-lg font-medium">{template.pass_threshold}%</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Photos Required</dt>
              <dd className="text-lg font-medium">{template.requires_photos ? 'Yes' : 'No'}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Created</dt>
              <dd className="font-medium">
                {new Date(template.created_at).toLocaleDateString('nl-NL')}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Last Updated</dt>
              <dd className="font-medium">
                {new Date(template.updated_at).toLocaleDateString('nl-NL')}
              </dd>
            </div>
          </dl>
        </div>

        {/* Categories & Items */}
        <div className="space-y-4">
          <h3 className="font-semibold">Checklist Items</h3>
          
          {template.categories?.length > 0 ? (
            template.categories.map((category: any, catIndex: number) => (
              <div key={category.id} className="rounded-lg border border-border bg-card shadow-sm">
                {/* Category Header */}
                <div className="flex items-center gap-3 border-b border-border p-4">
                  <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                    {catIndex + 1}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">{category.name}</h4>
                    {category.description && (
                      <p className="text-sm text-muted-foreground">{category.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {category.items?.length || 0} items • Weight: {category.weight || 1}x
                    </p>
                  </div>
                </div>

                {/* Items List */}
                <div className="divide-y divide-border">
                  {category.items?.map((item: any, itemIndex: number) => (
                    <div key={item.id} className="flex items-start gap-3 p-4">
                      <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs">
                        {itemIndex + 1}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium">{item.title}</p>
                          <span className="shrink-0 rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                            {item.weight || 1} pts
                          </span>
                        </div>
                        {item.description && (
                          <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                        )}
                        <div className="mt-2 flex flex-wrap gap-2">
                          {item.requires_photo && (
                            <span className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-900/30">
                              Photo required
                            </span>
                          )}
                          {item.creates_action_on_fail && (
                            <span className="rounded bg-orange-100 px-2 py-0.5 text-xs text-orange-700 dark:bg-orange-900/30">
                              Action: {item.action_urgency || 'medium'} • {item.action_deadline_days || 7}d
                            </span>
                          )}
                          {item.requires_comment_on_fail && (
                            <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700 dark:bg-gray-800">
                              Comment on fail
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-lg border border-border bg-muted/50 p-8 text-center">
              <p className="text-muted-foreground">No checklist items defined</p>
            </div>
          )}
        </div>

        {/* Danger Zone */}
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-6">
          <h3 className="mb-2 font-semibold text-destructive">Danger Zone</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Deleting this template will not affect existing audits that used it.
          </p>
          <DeleteTemplateButton templateId={template.id} templateName={template.name} />
        </div>

        {/* Back Link */}
        <Link
          href="/dashboard/settings/templates"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to Templates
        </Link>
      </div>
    </>
  );
}
