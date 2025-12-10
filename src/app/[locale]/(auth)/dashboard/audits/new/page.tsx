'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { createAudit, getAuditTemplate, getAuditTemplates, getLocations, saveAuditResults, completeAudit, uploadPhoto, deletePhoto } from '@/actions/supabase';
import { buttonVariants } from '@/components/ui/buttonVariants';
import { TitleBar } from '@/features/dashboard/TitleBar';
import { NewAuditPageHints } from '@/features/hints';

type AuditResult = {
  [itemId: string]: {
    result: 'pass' | 'fail' | 'na' | null;
    comments: string;
    photoUrls: string[];
  };
};

export default function NewAuditPage() {
  const t = useTranslations('NewAudit');
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedLocationId = searchParams.get('locationId');

  const [step, setStep] = useState<'select' | 'audit' | 'review'>('select');
  const [locations, setLocations] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState(preselectedLocationId || '');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [templateData, setTemplateData] = useState<any>(null);
  const [auditId, setAuditId] = useState<string | null>(null);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [results, setResults] = useState<AuditResult>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch locations and templates on mount
  useEffect(() => {
    async function fetchData() {
      const [locs, tmpls] = await Promise.all([getLocations(), getAuditTemplates()]);
      setLocations(locs);
      setTemplates(tmpls);
      setIsLoading(false);
    }
    fetchData();
  }, []);

  // Flatten all items for navigation
  const allItems = templateData?.categories?.flatMap((cat: any) =>
    cat.items?.map((item: any) => ({ ...item, category: cat.name })) || []
  ) || [];
  const currentItem = allItems[currentItemIndex];
  const totalItems = allItems.length;

  const [error, setError] = useState<string | null>(null);

  const handleStartAudit = async () => {
    if (!selectedLocation || !selectedTemplate) return;

    setIsSaving(true);
    setError(null);

    // Create the audit in the database
    const formData = new FormData();
    formData.set('locationId', selectedLocation);
    formData.set('templateId', selectedTemplate);

    const result = await createAudit(formData);

    if (result.success && result.id) {
      setAuditId(result.id);

      // Fetch the template with categories and items
      const template = await getAuditTemplate(selectedTemplate);
      
      if (!template || !template.categories || template.categories.length === 0) {
        setError('Template has no checklist items. Please add items to the template first.');
        setIsSaving(false);
        return;
      }
      
      setTemplateData(template);
      setStep('audit');
    } else {
      setError(result.error || 'Failed to create audit');
    }

    setIsSaving(false);
  };

  const handleResultChange = (result: 'pass' | 'fail' | 'na') => {
    if (!currentItem) return;
    
    setResults(prev => ({
      ...prev,
      [currentItem.id]: {
        ...prev[currentItem.id],
        result,
        comments: prev[currentItem.id]?.comments || '',
        photoUrls: prev[currentItem.id]?.photoUrls || [],
      },
    }));
  };

  const handleNext = async () => {
    if (currentItemIndex < totalItems - 1) {
      setCurrentItemIndex(prev => prev + 1);
    } else {
      // Save all results and go to review
      if (auditId) {
        setIsSaving(true);
        const resultsArray = Object.entries(results).map(([itemId, data]) => ({
          templateItemId: itemId,
          result: data.result,
          score: data.result === 'pass' ? 1 : 0,
          comments: data.comments,
          photoUrls: data.photoUrls,
        }));
        await saveAuditResults(auditId, resultsArray);
        setIsSaving(false);
      }
      setStep('review');
    }
  };

  const handlePrevious = () => {
    if (currentItemIndex > 0) {
      setCurrentItemIndex(prev => prev - 1);
    }
  };

  const handleComplete = async () => {
    if (!auditId) return;

    setIsSaving(true);
    const result = await completeAudit(auditId);
    
    if (result.success) {
      router.push(`/dashboard/audits/${auditId}`);
    } else {
      setError(result.error || 'Failed to complete audit');
      setIsSaving(false);
    }
  };

  const progress = totalItems > 0 ? ((currentItemIndex + 1) / totalItems) * 100 : 0;

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Selection Step
  if (step === 'select') {
    return (
      <>
        <TitleBar
          title={t('title_bar')}
          description={t('title_bar_description')}
        />

        {/* Contextual Hints */}
        <NewAuditPageHints step="select" />

        <div className="mx-auto max-w-md space-y-6">
          {error && (
            <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </div>
          )}
          {/* Location Selection */}
          <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
            <label className="mb-2 block text-sm font-medium">
              {t('select_location')} *
            </label>
            {locations.length > 0 ? (
              <select
                value={selectedLocation}
                onChange={e => setSelectedLocation(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-3 text-base"
              >
                <option value="">Select a location...</option>
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} {loc.city && `(${loc.city})`}
                  </option>
                ))}
              </select>
            ) : (
              <div className="text-center">
                <p className="mb-3 text-sm text-muted-foreground">No locations yet</p>
                <Link href="/dashboard/locations/new" className={buttonVariants({ size: 'sm' })}>
                  Add Location
                </Link>
              </div>
            )}
          </div>

          {/* Template Selection */}
          <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
            <label className="mb-2 block text-sm font-medium">
              {t('select_template')} *
            </label>
            {templates.length > 0 ? (
              <select
                value={selectedTemplate}
                onChange={e => setSelectedTemplate(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-3 text-base"
              >
                <option value="">Select a template...</option>
                {templates.filter(t => t.is_active).map(tmpl => (
                  <option key={tmpl.id} value={tmpl.id}>
                    {tmpl.name}
                  </option>
                ))}
              </select>
            ) : (
              <div className="text-center">
                <p className="mb-3 text-sm text-muted-foreground">No templates yet</p>
                <Link href="/dashboard/settings/templates/new" className={buttonVariants({ size: 'sm' })}>
                  Create Template
                </Link>
              </div>
            )}
          </div>

          {/* Start Button */}
          <button
            type="button"
            onClick={handleStartAudit}
            disabled={!selectedLocation || !selectedTemplate || isSaving}
            className={buttonVariants({
              size: 'lg',
              className: 'w-full disabled:opacity-50',
            })}
          >
            {isSaving ? 'Starting...' : t('start_audit')}
          </button>

          <Link
            href="/dashboard/audits"
            className="block text-center text-sm text-muted-foreground hover:text-foreground"
          >
            Cancel
          </Link>
        </div>
      </>
    );
  }

  // Audit Step
  if (step === 'audit' && currentItem) {
    return (
      <div className="flex min-h-[calc(100vh-200px)] flex-col">
        {/* Contextual Hints */}
        <NewAuditPageHints step="audit" />

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium">{currentItem.category}</span>
            <span className="text-muted-foreground">
              {currentItemIndex + 1} / {totalItems}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Current Item Card */}
        <div className="flex-1 rounded-lg border border-border bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-start justify-between gap-4">
            <h2 className="text-xl font-semibold">{currentItem.title}</h2>
            <span className="shrink-0 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
              {currentItem.weight || 1} pts
            </span>
          </div>
          
          {/* Item description/instructions */}
          {currentItem.description && (
            <div className="mb-4 rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
              <span className="font-medium">Instructions:</span> {currentItem.description}
            </div>
          )}

          {/* Info badges */}
          <div className="mb-4 flex flex-wrap gap-2">
            {currentItem.requires_photo && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30">
                Photo required
              </span>
            )}
            {currentItem.creates_action_on_fail && (
              <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-1 text-xs font-medium text-orange-700 dark:bg-orange-900/30">
                Creates action if failed
              </span>
            )}
          </div>

          {/* Result Buttons */}
          <div className="mb-6 grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => handleResultChange('pass')}
              className={`flex flex-col items-center justify-center rounded-lg border-2 p-4 transition-colors ${
                results[currentItem.id]?.result === 'pass'
                  ? 'border-green-500 bg-green-50 text-green-700 dark:bg-green-950'
                  : 'border-border hover:border-green-300'
              }`}
            >
              <svg className="mb-1 size-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span className="text-sm font-medium">{t('item_pass')}</span>
            </button>
            <button
              type="button"
              onClick={() => handleResultChange('fail')}
              className={`flex flex-col items-center justify-center rounded-lg border-2 p-4 transition-colors ${
                results[currentItem.id]?.result === 'fail'
                  ? 'border-red-500 bg-red-50 text-red-700 dark:bg-red-950'
                  : 'border-border hover:border-red-300'
              }`}
            >
              <svg className="mb-1 size-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              <span className="text-sm font-medium">{t('item_fail')}</span>
            </button>
            <button
              type="button"
              onClick={() => handleResultChange('na')}
              className={`flex flex-col items-center justify-center rounded-lg border-2 p-4 transition-colors ${
                results[currentItem.id]?.result === 'na'
                  ? 'border-gray-500 bg-gray-50 text-gray-700 dark:bg-gray-900'
                  : 'border-border hover:border-gray-300'
              }`}
            >
              <svg className="mb-1 size-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span className="text-sm font-medium">{t('item_na')}</span>
            </button>
          </div>

          {/* Comment Field */}
          <textarea
            placeholder={t('add_comment')}
            rows={3}
            className="mb-4 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground"
            value={results[currentItem.id]?.comments || ''}
            onChange={e =>
              setResults(prev => ({
                ...prev,
                [currentItem.id]: {
                  ...prev[currentItem.id],
                  result: prev[currentItem.id]?.result || null,
                  comments: e.target.value,
                  photoUrls: prev[currentItem.id]?.photoUrls || [],
                },
              }))
            }
          />

          {/* Photo Upload - Always available */}
          <div className="mt-4">
            <label className="mb-2 block text-sm font-medium">
              Photo Evidence {currentItem.requires_photo && <span className="text-destructive">*</span>}
              {!currentItem.requires_photo && <span className="text-muted-foreground"> (optional)</span>}
            </label>
            <PhotoUploadInline
              photos={results[currentItem.id]?.photoUrls || []}
              itemId={currentItem.id}
              auditId={auditId || undefined}
              maxPhotos={5}
              onPhotosChange={(photos) =>
                setResults(prev => ({
                  ...prev,
                  [currentItem.id]: {
                    ...prev[currentItem.id],
                    result: prev[currentItem.id]?.result || null,
                    comments: prev[currentItem.id]?.comments || '',
                    photoUrls: photos,
                  },
                }))
              }
            />
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={handlePrevious}
            disabled={currentItemIndex === 0}
            className={buttonVariants({
              variant: 'outline',
              size: 'lg',
              className: 'flex-1 disabled:opacity-50',
            })}
          >
            {t('previous_item')}
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={!results[currentItem.id]?.result || isSaving}
            className={buttonVariants({
              size: 'lg',
              className: 'flex-1 disabled:opacity-50',
            })}
          >
            {isSaving ? 'Saving...' : currentItemIndex === totalItems - 1 ? t('complete_audit') : t('next_item')}
          </button>
        </div>
      </div>
    );
  }

  // Review Step
  return (
    <>
      <TitleBar
        title="Review Audit"
        description="Review your audit results before submitting"
      />

      {/* Contextual Hints */}
      <NewAuditPageHints step="review" />

      <div className="space-y-4">
        {/* Score Summary Card */}
        {(() => {
          // Calculate weighted score
          let totalScore = 0;
          let maxScore = 0;
          let passedItems = 0;
          let failedItems = 0;
          let naItems = 0;
          let actionsToCreate = 0;

          templateData?.categories?.forEach((category: any) => {
            const catWeight = category.weight || 1;
            category.items?.forEach((item: any) => {
              const itemWeight = item.weight || 1;
              const combinedWeight = catWeight * itemWeight;
              const result = results[item.id]?.result;
              
              if (result === 'pass') {
                passedItems++;
                totalScore += combinedWeight;
                maxScore += combinedWeight;
              } else if (result === 'fail') {
                failedItems++;
                maxScore += combinedWeight;
                if (item.creates_action_on_fail) actionsToCreate++;
              } else {
                naItems++;
              }
            });
          });

          const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
          const passThreshold = templateData?.pass_threshold || 70;
          const willPass = percentage >= passThreshold;

          return (
            <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
              <h3 className="mb-4 font-semibold">Audit Summary</h3>
              
              {/* Score Display */}
              <div className="mb-6 flex items-center justify-center">
                <div className="relative">
                  <svg className="size-28" viewBox="0 0 36 36">
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="hsl(var(--muted))"
                      strokeWidth="3"
                    />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke={willPass ? 'hsl(142, 76%, 36%)' : 'hsl(0, 84%, 60%)'}
                      strokeWidth="3"
                      strokeDasharray={`${percentage}, 100`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold">{percentage}%</span>
                    <span className={`text-xs font-medium ${willPass ? 'text-green-600' : 'text-red-600'}`}>
                      {willPass ? 'PASS' : 'FAIL'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-4 gap-3 text-center">
                <div className="rounded-lg bg-green-50 p-3 dark:bg-green-900/20">
                  <div className="text-xl font-bold text-green-600">{passedItems}</div>
                  <div className="text-xs text-muted-foreground">Passed</div>
                </div>
                <div className="rounded-lg bg-red-50 p-3 dark:bg-red-900/20">
                  <div className="text-xl font-bold text-red-600">{failedItems}</div>
                  <div className="text-xs text-muted-foreground">Failed</div>
                </div>
                <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                  <div className="text-xl font-bold text-gray-600">{naItems}</div>
                  <div className="text-xs text-muted-foreground">N/A</div>
                </div>
                <div className="rounded-lg bg-orange-50 p-3 dark:bg-orange-900/20">
                  <div className="text-xl font-bold text-orange-600">{actionsToCreate}</div>
                  <div className="text-xs text-muted-foreground">Actions</div>
                </div>
              </div>

              {/* Score Details */}
              <div className="mt-4 flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Score: {totalScore.toFixed(1)} / {maxScore.toFixed(1)} pts
                </span>
                <span className="text-muted-foreground">
                  Pass threshold: {passThreshold}%
                </span>
              </div>
            </div>
          );
        })()}

        {/* Items List by Category */}
        {templateData?.categories?.map((category: any) => (
          <div key={category.id} className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="font-medium">{category.name}</h4>
              <span className="text-xs text-muted-foreground">Weight: {category.weight || 1}x</span>
            </div>
            <div className="space-y-2">
              {category.items?.map((item: any) => (
                <div key={item.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex-1">{item.title}</span>
                  <span className="text-xs text-muted-foreground">{item.weight || 1}pts</span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium ${
                      results[item.id]?.result === 'pass'
                        ? 'bg-green-100 text-green-700'
                        : results[item.id]?.result === 'fail'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {results[item.id]?.result?.toUpperCase() || 'N/A'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Submit Button */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setStep('audit')}
            className={buttonVariants({ variant: 'outline', size: 'lg', className: 'flex-1' })}
          >
            Back to Edit
          </button>
          <button
            type="button"
            onClick={handleComplete}
            disabled={isSaving}
            className={buttonVariants({ size: 'lg', className: 'flex-1' })}
          >
            {isSaving ? 'Completing...' : 'Complete Audit'}
          </button>
        </div>
      </div>
    </>
  );
}

// Inline Photo Upload Component for Audit Items
function PhotoUploadInline({ 
  photos, 
  onPhotosChange,
  itemId,
  auditId,
  maxPhotos = 5,
}: { 
  photos: string[]; 
  onPhotosChange: (photos: string[]) => void;
  itemId: string;
  auditId?: string;
  maxPhotos?: number;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadError(null);
    const newUrls: string[] = [];

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) {
        setUploadError('Only image files are allowed');
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        setUploadError('File size must be less than 10MB');
        continue;
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('itemId', itemId);
      if (auditId) {
        formData.append('auditId', auditId);
      }

      const result = await uploadPhoto(formData, 'audit-photos');
      if (result.success && result.url) {
        newUrls.push(result.url);
      } else if (result.error) {
        setUploadError(result.error);
      }
    }

    if (newUrls.length > 0) {
      onPhotosChange([...photos, ...newUrls]);
    }
    
    setIsUploading(false);
    e.target.value = '';
  };

  const handleRemove = async (url: string) => {
    await deletePhoto(url, 'audit-photos');
    onPhotosChange(photos.filter(p => p !== url));
  };

  return (
    <div className="space-y-2">
      {uploadError && (
        <p className="text-xs text-destructive">{uploadError}</p>
      )}
      {photos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {photos.map((url, i) => (
            <div key={i} className="group relative size-20">
              <img src={url} alt="" className="size-20 rounded-lg object-cover" />
              <button
                type="button"
                onClick={() => handleRemove(url)}
                className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-destructive text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      {photos.length < maxPhotos && (
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border p-3 text-sm hover:border-primary">
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileChange}
            disabled={isUploading}
            className="sr-only"
          />
          {isUploading ? 'Uploading...' : `Add photo (${photos.length}/${maxPhotos})`}
        </label>
      )}
    </div>
  );
}
