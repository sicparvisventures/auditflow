-- ============================================
-- AuditFlow Organization Lookup Functions
-- Version: 1.0.0
-- These functions help lookup organization IDs from Clerk IDs
-- ============================================

-- Function to get internal org ID from Clerk org ID
CREATE OR REPLACE FUNCTION get_org_id_from_clerk(p_clerk_org_id TEXT)
RETURNS UUID AS $$
DECLARE
  v_org_id UUID;
BEGIN
  SELECT id INTO v_org_id
  FROM organizations
  WHERE clerk_org_id = p_clerk_org_id;
  
  RETURN v_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get internal user ID from Clerk user ID
CREATE OR REPLACE FUNCTION get_user_id_from_clerk(p_clerk_user_id TEXT)
RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id
  FROM users
  WHERE clerk_user_id = p_clerk_user_id;
  
  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create or update organization (called from webhook or on first login)
CREATE OR REPLACE FUNCTION ensure_organization_exists(
  p_clerk_org_id TEXT,
  p_name TEXT DEFAULT 'My Organization',
  p_slug TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_org_id UUID;
BEGIN
  -- Try to get existing org
  SELECT id INTO v_org_id
  FROM organizations
  WHERE clerk_org_id = p_clerk_org_id;
  
  -- If not exists, create it
  IF v_org_id IS NULL THEN
    INSERT INTO organizations (clerk_org_id, name, slug)
    VALUES (
      p_clerk_org_id, 
      p_name, 
      COALESCE(p_slug, p_clerk_org_id)
    )
    RETURNING id INTO v_org_id;
    
    -- Also create default audit template
    PERFORM create_default_audit_template(v_org_id);
  END IF;
  
  RETURN v_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create or update user (called from webhook or on first login)
CREATE OR REPLACE FUNCTION ensure_user_exists(
  p_clerk_user_id TEXT,
  p_email TEXT,
  p_first_name TEXT DEFAULT NULL,
  p_last_name TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Try to get existing user
  SELECT id INTO v_user_id
  FROM users
  WHERE clerk_user_id = p_clerk_user_id;
  
  -- If not exists, create it
  IF v_user_id IS NULL THEN
    INSERT INTO users (clerk_user_id, email, first_name, last_name, role)
    VALUES (p_clerk_user_id, p_email, p_first_name, p_last_name, 'admin')
    RETURNING id INTO v_user_id;
  ELSE
    -- Update existing user
    UPDATE users
    SET 
      email = COALESCE(p_email, email),
      first_name = COALESCE(p_first_name, first_name),
      last_name = COALESCE(p_last_name, last_name),
      updated_at = NOW()
    WHERE id = v_user_id;
  END IF;
  
  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure user is member of organization
CREATE OR REPLACE FUNCTION ensure_org_membership(
  p_clerk_org_id TEXT,
  p_clerk_user_id TEXT,
  p_role TEXT DEFAULT 'admin'
)
RETURNS UUID AS $$
DECLARE
  v_org_id UUID;
  v_user_id UUID;
  v_membership_id UUID;
  v_user_role user_role;
BEGIN
  -- Get internal IDs
  v_org_id := get_org_id_from_clerk(p_clerk_org_id);
  v_user_id := get_user_id_from_clerk(p_clerk_user_id);
  
  IF v_org_id IS NULL OR v_user_id IS NULL THEN
    RAISE EXCEPTION 'Organization or user not found';
  END IF;
  
  -- Map role
  v_user_role := CASE p_role
    WHEN 'admin' THEN 'admin'::user_role
    WHEN 'org:admin' THEN 'admin'::user_role
    WHEN 'inspector' THEN 'inspector'::user_role
    WHEN 'manager' THEN 'manager'::user_role
    ELSE 'viewer'::user_role
  END;
  
  -- Create or update membership
  INSERT INTO organization_members (organization_id, user_id, role)
  VALUES (v_org_id, v_user_id, v_user_role)
  ON CONFLICT (organization_id, user_id) DO UPDATE
  SET role = v_user_role, updated_at = NOW()
  RETURNING id INTO v_membership_id;
  
  -- Update user's current organization
  UPDATE users SET current_organization_id = v_org_id WHERE id = v_user_id;
  
  RETURN v_membership_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Views for easier querying
-- ============================================

-- Locations with audit stats
CREATE OR REPLACE VIEW locations_with_stats AS
SELECT 
  l.*,
  COUNT(DISTINCT a.id) AS total_audits,
  COUNT(DISTINCT CASE WHEN a.status = 'completed' AND a.passed THEN a.id END) AS passed_audits,
  COUNT(DISTINCT CASE WHEN ac.status IN ('pending', 'in_progress') THEN ac.id END) AS open_actions,
  MAX(a.audit_date) AS last_audit_date
FROM locations l
LEFT JOIN audits a ON l.id = a.location_id
LEFT JOIN actions ac ON l.id = ac.location_id
GROUP BY l.id;

-- Audits with location and template names
CREATE OR REPLACE VIEW audits_with_details AS
SELECT 
  a.*,
  l.name AS location_name,
  l.city AS location_city,
  t.name AS template_name,
  u.first_name || ' ' || u.last_name AS inspector_name
FROM audits a
LEFT JOIN locations l ON a.location_id = l.id
LEFT JOIN audit_templates t ON a.template_id = t.id
LEFT JOIN users u ON a.inspector_id = u.id;

-- Actions with location names
CREATE OR REPLACE VIEW actions_with_details AS
SELECT 
  ac.*,
  l.name AS location_name,
  a.audit_date,
  assigned.first_name || ' ' || assigned.last_name AS assigned_to_name,
  creator.first_name || ' ' || creator.last_name AS created_by_name
FROM actions ac
LEFT JOIN locations l ON ac.location_id = l.id
LEFT JOIN audits a ON ac.audit_id = a.id
LEFT JOIN users assigned ON ac.assigned_to_id = assigned.id
LEFT JOIN users creator ON ac.created_by_id = creator.id;

