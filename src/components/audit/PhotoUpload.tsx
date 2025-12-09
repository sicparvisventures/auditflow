'use client';

import Image from 'next/image';
import { useCallback, useState } from 'react';

import { uploadPhoto, deletePhoto } from '@/actions/supabase';

type PhotoUploadProps = {
  bucket: 'audit-photos' | 'action-photos';
  photos: string[];
  onPhotosChange: (photos: string[]) => void;
  maxPhotos?: number;
  required?: boolean;
};

export function PhotoUpload({
  bucket,
  photos,
  onPhotosChange,
  maxPhotos = 5,
  required = false,
}: PhotoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      setError(null);

      // Check max photos limit
      if (photos.length + files.length > maxPhotos) {
        setError(`Maximum ${maxPhotos} photos allowed`);
        return;
      }

      setIsUploading(true);

      try {
        const newUrls: string[] = [];

        // Upload each file using server action
        for (const file of Array.from(files)) {
          // Validate file type
          if (!file.type.startsWith('image/')) {
            setError('Only image files are allowed');
            continue;
          }

          // Validate file size (10MB max)
          if (file.size > 10 * 1024 * 1024) {
            setError('File size must be less than 10MB');
            continue;
          }

          const formData = new FormData();
          formData.append('file', file);

          const result = await uploadPhoto(formData, bucket);
          
          if (result.success && result.url) {
            newUrls.push(result.url);
          } else {
            setError(result.error || 'Failed to upload photo');
          }
        }

        if (newUrls.length > 0) {
          onPhotosChange([...photos, ...newUrls]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to upload photos');
      } finally {
        setIsUploading(false);
        // Reset input
        e.target.value = '';
      }
    },
    [photos, maxPhotos, bucket, onPhotosChange],
  );

  const handleRemovePhoto = useCallback(
    async (url: string) => {
      try {
        const result = await deletePhoto(url, bucket);
        if (result.success) {
          onPhotosChange(photos.filter(p => p !== url));
        } else {
          setError(result.error || 'Failed to remove photo');
        }
      } catch (err) {
        setError('Failed to remove photo');
      }
    },
    [photos, bucket, onPhotosChange],
  );

  return (
    <div className="space-y-3">
      {/* Photos Grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {photos.map((url, index) => (
            <div key={index} className="group relative aspect-square">
              <Image
                src={url}
                alt={`Photo ${index + 1}`}
                fill
                className="rounded-lg border border-border object-cover"
                unoptimized
              />
              <button
                type="button"
                onClick={() => handleRemovePhoto(url)}
                className="absolute -right-2 -top-2 flex size-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
              >
                <svg
                  className="size-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload Button */}
      {photos.length < maxPhotos && (
        <label
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 transition-colors ${
            isUploading
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary hover:bg-muted'
          }`}
        >
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileChange}
            disabled={isUploading}
            className="sr-only"
            required={required && photos.length === 0}
          />

          {isUploading ? (
            <>
              <svg
                className="size-8 animate-spin text-primary"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              <span className="text-sm text-muted-foreground">Uploading...</span>
            </>
          ) : (
            <>
              <svg
                className="size-8 text-muted-foreground"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <span className="text-sm text-muted-foreground">
                {photos.length === 0 ? 'Add photos' : 'Add more photos'}
              </span>
              <span className="text-xs text-muted-foreground">
                {photos.length}/{maxPhotos} photos
              </span>
            </>
          )}
        </label>
      )}

      {/* Error Message */}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {/* Required Indicator */}
      {required && photos.length === 0 && (
        <p className="text-xs text-muted-foreground">* At least one photo is required</p>
      )}
    </div>
  );
}
