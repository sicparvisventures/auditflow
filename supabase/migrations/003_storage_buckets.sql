-- ============================================
-- AuditFlow Storage Buckets Setup
-- Version: 1.0.0
-- ============================================

-- Create storage buckets for photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('audit-photos', 'audit-photos', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']),
  ('action-photos', 'action-photos', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']),
  ('organization-assets', 'organization-assets', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================
-- STORAGE POLICIES: audit-photos
-- ============================================

-- Anyone can view audit photos (public bucket)
CREATE POLICY "Public can view audit photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'audit-photos');

-- Authenticated users can upload audit photos to their organization's folder
CREATE POLICY "Users can upload audit photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'audit-photos'
  -- Folder structure: {organization_id}/{audit_id}/{filename}
);

-- Users can update their own uploads
CREATE POLICY "Users can update own audit photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'audit-photos' AND auth.uid()::text = owner_id::text);

-- Users can delete their own uploads or admins can delete
CREATE POLICY "Users can delete audit photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'audit-photos');

-- ============================================
-- STORAGE POLICIES: action-photos
-- ============================================

-- Anyone can view action photos (public bucket)
CREATE POLICY "Public can view action photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'action-photos');

-- Authenticated users can upload action photos
CREATE POLICY "Users can upload action photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'action-photos'
  -- Folder structure: {organization_id}/{action_id}/{filename}
);

-- Users can update their own uploads
CREATE POLICY "Users can update own action photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'action-photos' AND auth.uid()::text = owner_id::text);

-- Users can delete their own uploads
CREATE POLICY "Users can delete action photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'action-photos');

-- ============================================
-- STORAGE POLICIES: organization-assets
-- ============================================

-- Anyone can view organization assets (logos, etc.)
CREATE POLICY "Public can view organization assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'organization-assets');

-- Only organization admins can upload assets
CREATE POLICY "Admins can upload organization assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'organization-assets'
);

-- Admins can update organization assets
CREATE POLICY "Admins can update organization assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'organization-assets');

-- Admins can delete organization assets
CREATE POLICY "Admins can delete organization assets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'organization-assets');
