'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { getAuditTemplate, updateAuditTemplate } from '@/actions/supabase';
import { buttonVariants } from '@/components/ui/buttonVariants';
import { TitleBar } from '@/features/dashboard/TitleBar';

type ChecklistItem = {
  id: string;
  dbId?: string; // Original database ID for existing items
  title: string;
  description: string;
  weight: number;
  requiresPhoto: boolean;
  requiresCommentOnFail: boolean;
  createsAction: boolean;
  actionUrgency: 'low' | 'medium' | 'high' | 'critical';
  actionDeadlineDays: number;
  isNew?: boolean;
  isDeleted?: boolean;
};

type Category = {
  id: string;
  dbId?: string; // Original database ID for existing categories
  name: string;
  description: string;
  weight: number;
  items: ChecklistItem[];
  isNew?: boolean;
  isDeleted?: boolean;
};

const defaultItem: Omit<ChecklistItem, 'id'> = {
  title: '',
  description: '',
  weight: 1,
  requiresPhoto: false,
  requiresCommentOnFail: true,
  createsAction: true,
  actionUrgency: 'medium',
  actionDeadlineDays: 7,
  isNew: true,
};

export default function EditTemplatePage() {
  const t = useTranslations('AuditTemplates');
  const router = useRouter();
  const params = useParams();
  const templateId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [templateData, setTemplateData] = useState({
    name: '',
    description: '',
    passThreshold: 70,
    requiresPhotos: true,
  });

  const [categories, setCategories] = useState<Category[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  // Load template data
  useEffect(() => {
    async function loadTemplate() {
      try {
        const template = await getAuditTemplate(templateId);
        if (!template) {
          setError('Template not found');
          setIsLoading(false);
          return;
        }

        setTemplateData({
          name: template.name || '',
          description: template.description || '',
          passThreshold: template.pass_threshold || 70,
          requiresPhotos: template.requires_photos ?? true,
        });

        // Transform categories and items from DB format
        const loadedCategories: Category[] = (template.categories || []).map((cat: any) => ({
          id: cat.id,
          dbId: cat.id,
          name: cat.name || '',
          description: cat.description || '',
          weight: cat.weight || 1,
          isNew: false,
          items: (cat.items || []).map((item: any) => ({
            id: item.id,
            dbId: item.id,
            title: item.title || '',
            description: item.description || '',
            weight: item.weight || 1,
            requiresPhoto: item.requires_photo ?? false,
            requiresCommentOnFail: item.requires_comment_on_fail ?? true,
            createsAction: item.creates_action_on_fail ?? true,
            actionUrgency: item.action_urgency || 'medium',
            actionDeadlineDays: item.action_deadline_days || 7,
            isNew: false,
          })),
        }));

        setCategories(loadedCategories);
        setExpandedCategories(loadedCategories.map(c => c.id));
        setIsLoading(false);
      } catch (err) {
        console.error('Error loading template:', err);
        setError('Failed to load template');
        setIsLoading(false);
      }
    }

    loadTemplate();
  }, [templateId]);

  const addCategory = () => {
    const newId = `new-${Date.now()}`;
    setCategories([
      ...categories,
      {
        id: newId,
        name: '',
        description: '',
        weight: 1,
        items: [{ id: `${newId}-1`, ...defaultItem }],
        isNew: true,
      },
    ]);
    setExpandedCategories([...expandedCategories, newId]);
  };

  const removeCategory = (categoryId: string) => {
    setCategories(
      categories.map(cat => {
        if (cat.id === categoryId) {
          // Mark as deleted if it exists in DB, otherwise remove from array
          if (cat.dbId) {
            return { ...cat, isDeleted: true };
          }
        }
        return cat;
      }).filter(cat => cat.id !== categoryId || cat.dbId)
    );
  };

  const addItem = (categoryId: string) => {
    setCategories(
      categories.map(cat => {
        if (cat.id === categoryId) {
          const newItemId = `new-${categoryId}-${Date.now()}`;
          return {
            ...cat,
            items: [...cat.items, { id: newItemId, ...defaultItem }],
          };
        }
        return cat;
      }),
    );
  };

  const removeItem = (categoryId: string, itemId: string) => {
    setCategories(
      categories.map(cat => {
        if (cat.id === categoryId) {
          return {
            ...cat,
            items: cat.items.map(item => {
              if (item.id === itemId) {
                // Mark as deleted if it exists in DB
                if (item.dbId) {
                  return { ...item, isDeleted: true };
                }
              }
              return item;
            }).filter(item => item.id !== itemId || item.dbId),
          };
        }
        return cat;
      }),
    );
  };

  const updateCategory = (categoryId: string, field: string, value: string | number) => {
    setCategories(
      categories.map(cat => (cat.id === categoryId ? { ...cat, [field]: value } : cat)),
    );
  };

  const updateItem = (categoryId: string, itemId: string, field: string, value: string | number | boolean) => {
    setCategories(
      categories.map(cat => {
        if (cat.id === categoryId) {
          return {
            ...cat,
            items: cat.items.map(item => (item.id === itemId ? { ...item, [field]: value } : item)),
          };
        }
        return cat;
      }),
    );
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev =>
      prev.includes(categoryId) ? prev.filter(id => id !== categoryId) : [...prev, categoryId],
    );
  };

  const toggleItemSettings = (itemId: string) => {
    setExpandedItems(prev =>
      prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Validate
    if (!templateData.name) {
      setError('Template name is required');
      setIsSubmitting(false);
      return;
    }

    const activeCategories = categories.filter(c => !c.isDeleted && c.name);
    const hasItems = activeCategories.some(c => c.items.some(i => !i.isDeleted && i.title));
    
    if (!hasItems) {
      setError('At least one category with items is required');
      setIsSubmitting(false);
      return;
    }

    const formData = new FormData();
    formData.set('id', templateId);
    formData.set('name', templateData.name);
    formData.set('description', templateData.description);
    formData.set('passThreshold', templateData.passThreshold.toString());
    formData.set('requiresPhotos', templateData.requiresPhotos.toString());
    formData.set('categories', JSON.stringify(
      categories.map(c => ({
        id: c.dbId || null, // null for new categories
        isDeleted: c.isDeleted || false,
        name: c.name,
        description: c.description,
        weight: c.weight,
        items: c.items.map(i => ({
          id: i.dbId || null, // null for new items
          isDeleted: i.isDeleted || false,
          title: i.title,
          description: i.description,
          weight: i.weight,
          requiresPhoto: i.requiresPhoto,
          requiresCommentOnFail: i.requiresCommentOnFail,
          createsAction: i.createsAction,
          actionUrgency: i.actionUrgency,
          actionDeadlineDays: i.actionDeadlineDays,
        })),
      })),
    ));

    const result = await updateAuditTemplate(formData);

    if (result.success) {
      router.push(`/dashboard/settings/templates/${templateId}`);
    } else {
      setError(result.error || 'Failed to update template');
      setIsSubmitting(false);
    }
  };

  // Calculate totals (excluding deleted items)
  const activeCategories = categories.filter(c => !c.isDeleted);
  const totalItems = activeCategories.reduce(
    (acc, cat) => acc + cat.items.filter(i => !i.isDeleted && i.title).length, 
    0
  );
  const maxPossibleScore = activeCategories.reduce((acc, cat) => {
    return acc + cat.items
      .filter(i => !i.isDeleted && i.title)
      .reduce((sum, item) => sum + (cat.weight * item.weight), 0);
  }, 0);

  if (isLoading) {
    return (
      <>
        <TitleBar title="Edit Template" description="Loading..." />
        <div className="mx-auto max-w-3xl">
          <div className="animate-pulse space-y-4">
            <div className="h-48 rounded-lg bg-muted" />
            <div className="h-32 rounded-lg bg-muted" />
            <div className="h-32 rounded-lg bg-muted" />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <TitleBar
        title="Edit Template"
        description={`Editing: ${templateData.name}`}
      />

      <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-6">
        {error && (
          <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Basic Info Card */}
        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <h3 className="mb-4 font-semibold">Template Details</h3>

          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="mb-1 block text-sm font-medium">
                {t('template_name')} *
              </label>
              <input
                type="text"
                id="name"
                required
                value={templateData.name}
                onChange={e => setTemplateData({ ...templateData, name: e.target.value })}
                placeholder="e.g. Food Safety Audit"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label htmlFor="description" className="mb-1 block text-sm font-medium">
                Description
              </label>
              <textarea
                id="description"
                rows={2}
                value={templateData.description}
                onChange={e => setTemplateData({ ...templateData, description: e.target.value })}
                placeholder="Brief description of this audit template..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="passThreshold" className="mb-1 block text-sm font-medium">
                  Pass Threshold (%)
                </label>
                <input
                  type="number"
                  id="passThreshold"
                  min="0"
                  max="100"
                  value={templateData.passThreshold}
                  onChange={e => setTemplateData({ ...templateData, passThreshold: Number(e.target.value) })}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Audits scoring below this percentage will fail
                </p>
              </div>
              <div className="flex items-center gap-3 pt-6">
                <input
                  type="checkbox"
                  id="requiresPhotos"
                  checked={templateData.requiresPhotos}
                  onChange={e => setTemplateData({ ...templateData, requiresPhotos: e.target.checked })}
                  className="size-4 rounded border-input"
                />
                <label htmlFor="requiresPhotos" className="text-sm font-medium">
                  Photos required by default
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">{t('categories')} ({activeCategories.length})</h3>
            <button
              type="button"
              onClick={addCategory}
              className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              {t('add_category')}
            </button>
          </div>

          {categories.filter(c => !c.isDeleted).map((category, catIndex) => (
            <div key={category.id} className="rounded-lg border border-border bg-card shadow-sm">
              {/* Category Header */}
              <div
                className="flex cursor-pointer items-center gap-3 p-4"
                onClick={() => toggleCategory(category.id)}
              >
                <svg
                  className={`size-5 transition-transform ${expandedCategories.includes(category.id) ? 'rotate-90' : ''}`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
                <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                  {catIndex + 1}
                </div>
                <div className="flex-1">
                  <input
                    type="text"
                    required
                    value={category.name}
                    onChange={e => updateCategory(category.id, 'name', e.target.value)}
                    onClick={e => e.stopPropagation()}
                    placeholder="Category name (e.g. Hygiene & Cleanliness)"
                    className="w-full border-0 bg-transparent p-0 text-sm font-medium focus:outline-none focus:ring-0"
                  />
                </div>
                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                  <label className="text-xs text-muted-foreground">Weight:</label>
                  <input
                    type="number"
                    min="0.1"
                    max="10"
                    step="0.1"
                    value={category.weight}
                    onChange={e => updateCategory(category.id, 'weight', Number(e.target.value))}
                    className="w-16 rounded border border-input bg-background px-2 py-1 text-center text-xs"
                  />
                </div>
                <span className="text-sm text-muted-foreground">
                  {category.items.filter(i => !i.isDeleted && i.title).length} items
                </span>
                {activeCategories.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removeCategory(category.id); }}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 6h18" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Category Items */}
              {expandedCategories.includes(category.id) && (
                <div className="border-t border-border p-4">
                  {/* Category description */}
                  <div className="mb-4">
                    <input
                      type="text"
                      value={category.description}
                      onChange={e => updateCategory(category.id, 'description', e.target.value)}
                      placeholder="Category description (optional)..."
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>

                  <div className="space-y-3">
                    {category.items.filter(i => !i.isDeleted).map((item, itemIndex) => (
                      <div key={item.id} className="rounded-lg border border-border bg-muted/50 p-4">
                        <div className="mb-3 flex items-start gap-3">
                          <span className="mt-2 flex size-6 shrink-0 items-center justify-center rounded-full bg-background text-xs font-medium">
                            {itemIndex + 1}
                          </span>
                          <div className="flex-1 space-y-3">
                            {/* Title and weight row */}
                            <div className="flex gap-3">
                              <input
                                type="text"
                                value={item.title}
                                onChange={e => updateItem(category.id, item.id, 'title', e.target.value)}
                                placeholder="Checklist item title..."
                                className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                              />
                              <div className="flex items-center gap-1">
                                <label className="text-xs text-muted-foreground">Pts:</label>
                                <input
                                  type="number"
                                  min="1"
                                  max="10"
                                  value={item.weight}
                                  onChange={e => updateItem(category.id, item.id, 'weight', Number(e.target.value))}
                                  className="w-14 rounded border border-input bg-background px-2 py-2 text-center text-sm"
                                />
                              </div>
                            </div>

                            {/* Quick settings row */}
                            <div className="flex flex-wrap items-center gap-4">
                              <label className="flex items-center gap-2 text-sm">
                                <input
                                  type="checkbox"
                                  checked={item.requiresPhoto}
                                  onChange={e => updateItem(category.id, item.id, 'requiresPhoto', e.target.checked)}
                                  className="size-4 rounded border-input"
                                />
                                Photo required
                              </label>
                              <label className="flex items-center gap-2 text-sm">
                                <input
                                  type="checkbox"
                                  checked={item.createsAction}
                                  onChange={e => updateItem(category.id, item.id, 'createsAction', e.target.checked)}
                                  className="size-4 rounded border-input"
                                />
                                Action on fail
                              </label>
                              <button
                                type="button"
                                onClick={() => toggleItemSettings(item.id)}
                                className="text-xs text-primary hover:underline"
                              >
                                {expandedItems.includes(item.id) ? 'Hide settings' : 'More settings'}
                              </button>
                            </div>

                            {/* Expanded settings */}
                            {expandedItems.includes(item.id) && (
                              <div className="space-y-3 rounded-lg border border-border bg-background p-3">
                                {/* Description */}
                                <div>
                                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                                    Item Description / Instructions
                                  </label>
                                  <textarea
                                    rows={2}
                                    value={item.description}
                                    onChange={e => updateItem(category.id, item.id, 'description', e.target.value)}
                                    placeholder="Instructions or details for the inspector..."
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                  />
                                </div>

                                {/* Action settings */}
                                {item.createsAction && (
                                  <div className="grid gap-3 sm:grid-cols-2">
                                    <div>
                                      <label className="mb-1 block text-xs font-medium text-muted-foreground">
                                        Action Urgency
                                      </label>
                                      <select
                                        value={item.actionUrgency}
                                        onChange={e => updateItem(category.id, item.id, 'actionUrgency', e.target.value)}
                                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                      >
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                        <option value="critical">Critical</option>
                                      </select>
                                    </div>
                                    <div>
                                      <label className="mb-1 block text-xs font-medium text-muted-foreground">
                                        Deadline (days)
                                      </label>
                                      <input
                                        type="number"
                                        min="1"
                                        max="90"
                                        value={item.actionDeadlineDays}
                                        onChange={e => updateItem(category.id, item.id, 'actionDeadlineDays', Number(e.target.value))}
                                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                      />
                                    </div>
                                  </div>
                                )}

                                {/* Comment requirement */}
                                <label className="flex items-center gap-2 text-sm">
                                  <input
                                    type="checkbox"
                                    checked={item.requiresCommentOnFail}
                                    onChange={e => updateItem(category.id, item.id, 'requiresCommentOnFail', e.target.checked)}
                                    className="size-4 rounded border-input"
                                  />
                                  Require comment when failed
                                </label>
                              </div>
                            )}
                          </div>
                          {category.items.filter(i => !i.isDeleted).length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeItem(category.id, item.id)}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => addItem(category.id)}
                    className="mt-3 flex w-full items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border py-3 text-sm text-muted-foreground hover:border-primary hover:text-foreground"
                  >
                    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    {t('add_item')}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
          <h4 className="mb-2 text-sm font-medium">Template Summary</h4>
          <div className="grid gap-2 text-sm sm:grid-cols-3">
            <div>
              <span className="text-muted-foreground">Categories:</span>{' '}
              <span className="font-medium">{activeCategories.filter(c => c.name).length}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Total Items:</span>{' '}
              <span className="font-medium">{totalItems}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Max Score:</span>{' '}
              <span className="font-medium">{maxPossibleScore.toFixed(1)} pts</span>
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Pass threshold: {templateData.passThreshold}% ({Math.round(maxPossibleScore * templateData.passThreshold / 100)} pts required to pass)
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Link
            href={`/dashboard/settings/templates/${templateId}`}
            className={buttonVariants({ variant: 'outline', className: 'flex-1' })}
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting || !templateData.name}
            className={buttonVariants({ className: 'flex-1 disabled:opacity-50' })}
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </>
  );
}
