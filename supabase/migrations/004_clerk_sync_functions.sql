-- ============================================
-- AuditFlow Clerk Sync Functions
-- Version: 1.0.0
-- These functions are called by the Clerk webhook handler
-- ============================================

-- ============================================
-- USER SYNC FUNCTIONS
-- ============================================

-- Handle user created from Clerk
CREATE OR REPLACE FUNCTION handle_clerk_user_created(
  p_clerk_user_id TEXT,
  p_email TEXT,
  p_first_name TEXT DEFAULT NULL,
  p_last_name TEXT DEFAULT NULL,
  p_image_url TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
BEGIN
  INSERT INTO users (clerk_user_id, email, first_name, last_name, avatar_url)
  VALUES (p_clerk_user_id, p_email, p_first_name, p_last_name, p_image_url)
  ON CONFLICT (clerk_user_id) DO UPDATE
  SET
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    avatar_url = EXCLUDED.avatar_url,
    updated_at = NOW()
  RETURNING id INTO v_user_id;
  
  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Handle user updated from Clerk
CREATE OR REPLACE FUNCTION handle_clerk_user_updated(
  p_clerk_user_id TEXT,
  p_email TEXT,
  p_first_name TEXT DEFAULT NULL,
  p_last_name TEXT DEFAULT NULL,
  p_image_url TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
BEGIN
  UPDATE users
  SET
    email = COALESCE(p_email, email),
    first_name = COALESCE(p_first_name, first_name),
    last_name = COALESCE(p_last_name, last_name),
    avatar_url = COALESCE(p_image_url, avatar_url),
    updated_at = NOW()
  WHERE clerk_user_id = p_clerk_user_id
  RETURNING id INTO v_user_id;
  
  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Handle user deleted from Clerk
CREATE OR REPLACE FUNCTION handle_clerk_user_deleted(
  p_clerk_user_id TEXT
)
RETURNS VOID AS $$
BEGIN
  -- Soft delete: just mark as inactive
  UPDATE users
  SET active = false, updated_at = NOW()
  WHERE clerk_user_id = p_clerk_user_id;
  
  -- Also remove from all organization memberships
  DELETE FROM organization_members
  WHERE user_id IN (SELECT id FROM users WHERE clerk_user_id = p_clerk_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ORGANIZATION SYNC FUNCTIONS
-- ============================================

-- Handle organization created from Clerk
CREATE OR REPLACE FUNCTION handle_clerk_organization_created(
  p_clerk_org_id TEXT,
  p_name TEXT,
  p_slug TEXT,
  p_created_by_clerk_user_id TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_org_id UUID;
  v_user_id UUID;
BEGIN
  -- Create the organization
  INSERT INTO organizations (clerk_org_id, name, slug)
  VALUES (p_clerk_org_id, p_name, p_slug)
  ON CONFLICT (clerk_org_id) DO UPDATE
  SET
    name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    updated_at = NOW()
  RETURNING id INTO v_org_id;
  
  -- If we know who created it, make them an admin
  IF p_created_by_clerk_user_id IS NOT NULL THEN
    SELECT id INTO v_user_id FROM users WHERE clerk_user_id = p_created_by_clerk_user_id;
    
    IF v_user_id IS NOT NULL THEN
      INSERT INTO organization_members (organization_id, user_id, role)
      VALUES (v_org_id, v_user_id, 'admin')
      ON CONFLICT (organization_id, user_id) DO UPDATE
      SET role = 'admin', updated_at = NOW();
      
      -- Set as user's current organization
      UPDATE users SET current_organization_id = v_org_id WHERE id = v_user_id;
    END IF;
  END IF;
  
  -- Create a default audit template for the organization
  PERFORM create_default_audit_template(v_org_id);
  
  RETURN v_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Handle organization updated from Clerk
CREATE OR REPLACE FUNCTION handle_clerk_organization_updated(
  p_clerk_org_id TEXT,
  p_name TEXT,
  p_slug TEXT
)
RETURNS UUID AS $$
DECLARE
  v_org_id UUID;
BEGIN
  UPDATE organizations
  SET
    name = COALESCE(p_name, name),
    slug = COALESCE(p_slug, slug),
    updated_at = NOW()
  WHERE clerk_org_id = p_clerk_org_id
  RETURNING id INTO v_org_id;
  
  RETURN v_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Handle organization deleted from Clerk
CREATE OR REPLACE FUNCTION handle_clerk_organization_deleted(
  p_clerk_org_id TEXT
)
RETURNS VOID AS $$
BEGIN
  -- Cascade delete will handle related records
  DELETE FROM organizations WHERE clerk_org_id = p_clerk_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ORGANIZATION MEMBERSHIP SYNC FUNCTIONS
-- ============================================

-- Handle membership created from Clerk
CREATE OR REPLACE FUNCTION handle_clerk_organization_membership_created(
  p_clerk_membership_id TEXT,
  p_clerk_org_id TEXT,
  p_clerk_user_id TEXT,
  p_role TEXT DEFAULT 'member'
)
RETURNS UUID AS $$
DECLARE
  v_org_id UUID;
  v_user_id UUID;
  v_membership_id UUID;
  v_user_role user_role;
BEGIN
  -- Get organization and user IDs
  SELECT id INTO v_org_id FROM organizations WHERE clerk_org_id = p_clerk_org_id;
  SELECT id INTO v_user_id FROM users WHERE clerk_user_id = p_clerk_user_id;
  
  IF v_org_id IS NULL OR v_user_id IS NULL THEN
    RAISE EXCEPTION 'Organization or user not found';
  END IF;
  
  -- Map Clerk role to our role
  v_user_role := CASE p_role
    WHEN 'admin' THEN 'admin'::user_role
    WHEN 'org:admin' THEN 'admin'::user_role
    ELSE 'viewer'::user_role
  END;
  
  -- Create or update membership
  INSERT INTO organization_members (clerk_membership_id, organization_id, user_id, role)
  VALUES (p_clerk_membership_id, v_org_id, v_user_id, v_user_role)
  ON CONFLICT (organization_id, user_id) DO UPDATE
  SET
    clerk_membership_id = EXCLUDED.clerk_membership_id,
    role = EXCLUDED.role,
    updated_at = NOW()
  RETURNING id INTO v_membership_id;
  
  -- Update user's current organization if not set
  UPDATE users
  SET current_organization_id = v_org_id
  WHERE id = v_user_id AND current_organization_id IS NULL;
  
  RETURN v_membership_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Handle membership updated from Clerk
CREATE OR REPLACE FUNCTION handle_clerk_organization_membership_updated(
  p_clerk_membership_id TEXT,
  p_role TEXT
)
RETURNS UUID AS $$
DECLARE
  v_membership_id UUID;
  v_user_role user_role;
BEGIN
  -- Map Clerk role to our role
  v_user_role := CASE p_role
    WHEN 'admin' THEN 'admin'::user_role
    WHEN 'org:admin' THEN 'admin'::user_role
    ELSE 'viewer'::user_role
  END;
  
  UPDATE organization_members
  SET role = v_user_role, updated_at = NOW()
  WHERE clerk_membership_id = p_clerk_membership_id
  RETURNING id INTO v_membership_id;
  
  RETURN v_membership_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Handle membership deleted from Clerk
CREATE OR REPLACE FUNCTION handle_clerk_organization_membership_deleted(
  p_clerk_membership_id TEXT
)
RETURNS VOID AS $$
DECLARE
  v_user_id UUID;
  v_org_id UUID;
BEGIN
  -- Get user and org before deleting
  SELECT user_id, organization_id INTO v_user_id, v_org_id
  FROM organization_members
  WHERE clerk_membership_id = p_clerk_membership_id;
  
  -- Delete the membership
  DELETE FROM organization_members WHERE clerk_membership_id = p_clerk_membership_id;
  
  -- If user's current org was this one, clear it or set to another org
  IF v_user_id IS NOT NULL THEN
    UPDATE users
    SET current_organization_id = (
      SELECT organization_id FROM organization_members
      WHERE user_id = v_user_id
      LIMIT 1
    )
    WHERE id = v_user_id AND current_organization_id = v_org_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- HELPER: Create Default Audit Template
-- ============================================

CREATE OR REPLACE FUNCTION create_default_audit_template(p_org_id UUID)
RETURNS UUID AS $$
DECLARE
  v_template_id UUID;
  v_category_id UUID;
BEGIN
  -- Create default template
  INSERT INTO audit_templates (organization_id, name, description, requires_photos, pass_threshold)
  VALUES (p_org_id, 'General Inspection', 'Default audit template for general inspections', true, 70.00)
  RETURNING id INTO v_template_id;
  
  -- Create Hygiene category
  INSERT INTO audit_template_categories (template_id, name, sort_order, weight)
  VALUES (v_template_id, 'Hygiene & Cleanliness', 1, 1.5)
  RETURNING id INTO v_category_id;
  
  -- Add hygiene items
  INSERT INTO audit_template_items (category_id, title, sort_order, requires_photo, creates_action_on_fail)
  VALUES
    (v_category_id, 'Kitchen surfaces are clean', 1, true, true),
    (v_category_id, 'Floors are clean and dry', 2, true, true),
    (v_category_id, 'Equipment is properly sanitized', 3, true, true),
    (v_category_id, 'Waste bins are emptied regularly', 4, false, true);
  
  -- Create Food Safety category
  INSERT INTO audit_template_categories (template_id, name, sort_order, weight)
  VALUES (v_template_id, 'Food Safety', 2, 2.0)
  RETURNING id INTO v_category_id;
  
  -- Add food safety items
  INSERT INTO audit_template_items (category_id, title, sort_order, requires_photo, creates_action_on_fail)
  VALUES
    (v_category_id, 'Food stored at correct temperatures', 1, true, true),
    (v_category_id, 'FIFO rotation is followed', 2, false, true),
    (v_category_id, 'Food is properly labeled and dated', 3, true, true),
    (v_category_id, 'Cross-contamination prevention measures in place', 4, false, true);
  
  -- Create Staff category
  INSERT INTO audit_template_categories (template_id, name, sort_order, weight)
  VALUES (v_template_id, 'Staff & Equipment', 3, 1.0)
  RETURNING id INTO v_category_id;
  
  -- Add staff items
  INSERT INTO audit_template_items (category_id, title, sort_order, requires_photo, creates_action_on_fail)
  VALUES
    (v_category_id, 'Staff wearing proper uniforms', 1, false, true),
    (v_category_id, 'Handwashing facilities available and stocked', 2, true, true),
    (v_category_id, 'Equipment in good working condition', 3, true, true);
  
  RETURN v_template_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
