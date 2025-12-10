-- ============================================
-- AuditFlow Role Mapping and Notifications
-- Version: 1.0.0
-- ============================================

-- ============================================
-- UPDATE CLERK ROLE MAPPING FUNCTION
-- Maps Clerk organization roles to internal user_role enum
-- ============================================

-- Handle membership created from Clerk (updated with new roles)
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
  -- Clerk roles: org:admin, org:inspector, org:member (or just admin, inspector, member)
  v_user_role := CASE 
    WHEN p_role IN ('admin', 'org:admin') THEN 'admin'::user_role
    WHEN p_role IN ('inspector', 'org:inspector') THEN 'inspector'::user_role
    WHEN p_role IN ('member', 'org:member', 'manager') THEN 'manager'::user_role
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
  
  -- Also update the role on the user record for quick lookup
  UPDATE users
  SET role = v_user_role
  WHERE id = v_user_id;
  
  -- Update user's current organization if not set
  UPDATE users
  SET current_organization_id = v_org_id
  WHERE id = v_user_id AND current_organization_id IS NULL;
  
  RETURN v_membership_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Handle membership updated from Clerk (updated with new roles)
CREATE OR REPLACE FUNCTION handle_clerk_organization_membership_updated(
  p_clerk_membership_id TEXT,
  p_role TEXT
)
RETURNS UUID AS $$
DECLARE
  v_membership_id UUID;
  v_user_id UUID;
  v_user_role user_role;
BEGIN
  -- Map Clerk role to our role
  v_user_role := CASE 
    WHEN p_role IN ('admin', 'org:admin') THEN 'admin'::user_role
    WHEN p_role IN ('inspector', 'org:inspector') THEN 'inspector'::user_role
    WHEN p_role IN ('member', 'org:member', 'manager') THEN 'manager'::user_role
    ELSE 'viewer'::user_role
  END;
  
  -- Get the user_id before updating
  SELECT user_id INTO v_user_id
  FROM organization_members
  WHERE clerk_membership_id = p_clerk_membership_id;
  
  UPDATE organization_members
  SET role = v_user_role, updated_at = NOW()
  WHERE clerk_membership_id = p_clerk_membership_id
  RETURNING id INTO v_membership_id;
  
  -- Also update the role on the user record
  IF v_user_id IS NOT NULL THEN
    UPDATE users
    SET role = v_user_role
    WHERE id = v_user_id;
  END IF;
  
  RETURN v_membership_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- EMAIL NOTIFICATION TRACKING TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS email_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Email details
  recipient_email TEXT NOT NULL,
  recipient_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Email type and context
  email_type VARCHAR(50) NOT NULL, -- 'audit_completed', 'action_created', 'action_reminder', 'action_overdue'
  subject TEXT NOT NULL,
  
  -- Related entities
  audit_id UUID REFERENCES audits(id) ON DELETE SET NULL,
  action_id UUID REFERENCES actions(id) ON DELETE SET NULL,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  
  -- Status tracking
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'skipped'
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  
  -- External ID from email provider (Resend)
  external_id TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for email notifications
CREATE INDEX IF NOT EXISTS idx_email_notifications_org_id ON email_notifications(organization_id);
CREATE INDEX IF NOT EXISTS idx_email_notifications_status ON email_notifications(status);
CREATE INDEX IF NOT EXISTS idx_email_notifications_type ON email_notifications(email_type);
CREATE INDEX IF NOT EXISTS idx_email_notifications_created_at ON email_notifications(created_at);

-- ============================================
-- USER NOTIFICATION PREFERENCES
-- ============================================

CREATE TABLE IF NOT EXISTS user_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Email preferences
  email_audit_completed BOOLEAN DEFAULT true,
  email_action_created BOOLEAN DEFAULT true,
  email_action_reminder BOOLEAN DEFAULT true,
  email_action_overdue BOOLEAN DEFAULT true,
  email_weekly_summary BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_user_notification_preferences_updated_at ON user_notification_preferences;
CREATE TRIGGER update_user_notification_preferences_updated_at
  BEFORE UPDATE ON user_notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- HELPER FUNCTION: Get Location Manager Email
-- ============================================

CREATE OR REPLACE FUNCTION get_location_manager_email(p_location_id UUID)
RETURNS TABLE(user_id UUID, email TEXT, first_name TEXT, full_name TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.email::TEXT, u.first_name, u.full_name
  FROM locations l
  JOIN users u ON l.manager_id = u.id
  WHERE l.id = p_location_id
  AND u.active = true;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- HELPER FUNCTION: Get Organization Admins/Inspectors
-- ============================================

CREATE OR REPLACE FUNCTION get_organization_admins_inspectors(p_org_id UUID)
RETURNS TABLE(user_id UUID, email TEXT, first_name TEXT, full_name TEXT, role user_role) AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.email::TEXT, u.first_name, u.full_name, om.role
  FROM organization_members om
  JOIN users u ON om.user_id = u.id
  WHERE om.organization_id = p_org_id
  AND om.role IN ('admin', 'inspector')
  AND u.active = true;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- RLS POLICIES FOR MANAGER ACCESS
-- ============================================

-- Drop existing policies if they exist (to recreate)
DROP POLICY IF EXISTS "managers_view_assigned_locations" ON locations;
DROP POLICY IF EXISTS "managers_view_assigned_audits" ON audits;
DROP POLICY IF EXISTS "managers_view_assigned_actions" ON actions;

-- Managers can view locations they are assigned to
CREATE POLICY "managers_view_assigned_locations" ON locations
  FOR SELECT
  USING (
    -- User is the manager of this location
    manager_id IN (
      SELECT id FROM users WHERE clerk_user_id = auth.uid()::TEXT
    )
    OR
    -- Or user has admin/inspector role in the organization
    EXISTS (
      SELECT 1 FROM organization_members om
      JOIN users u ON om.user_id = u.id
      WHERE u.clerk_user_id = auth.uid()::TEXT
      AND om.organization_id = locations.organization_id
      AND om.role IN ('admin', 'inspector')
    )
  );

-- Managers can view audits for their assigned locations
CREATE POLICY "managers_view_assigned_audits" ON audits
  FOR SELECT
  USING (
    -- Check if user is manager of the audit's location
    EXISTS (
      SELECT 1 FROM locations l
      JOIN users u ON l.manager_id = u.id
      WHERE l.id = audits.location_id
      AND u.clerk_user_id = auth.uid()::TEXT
    )
    OR
    -- Or user has admin/inspector role
    EXISTS (
      SELECT 1 FROM organization_members om
      JOIN users u ON om.user_id = u.id
      WHERE u.clerk_user_id = auth.uid()::TEXT
      AND om.organization_id = audits.organization_id
      AND om.role IN ('admin', 'inspector')
    )
  );

-- Managers can view and update actions for their assigned locations
CREATE POLICY "managers_view_assigned_actions" ON actions
  FOR SELECT
  USING (
    -- Check if user is manager of the action's location
    EXISTS (
      SELECT 1 FROM locations l
      JOIN users u ON l.manager_id = u.id
      WHERE l.id = actions.location_id
      AND u.clerk_user_id = auth.uid()::TEXT
    )
    OR
    -- Or user is assigned to this action
    assigned_to_id IN (
      SELECT id FROM users WHERE clerk_user_id = auth.uid()::TEXT
    )
    OR
    -- Or user has admin/inspector role
    EXISTS (
      SELECT 1 FROM organization_members om
      JOIN users u ON om.user_id = u.id
      WHERE u.clerk_user_id = auth.uid()::TEXT
      AND om.organization_id = actions.organization_id
      AND om.role IN ('admin', 'inspector')
    )
  );

-- Managers can update actions assigned to them (respond to actions)
DROP POLICY IF EXISTS "managers_update_assigned_actions" ON actions;
CREATE POLICY "managers_update_assigned_actions" ON actions
  FOR UPDATE
  USING (
    -- Manager of the location
    EXISTS (
      SELECT 1 FROM locations l
      JOIN users u ON l.manager_id = u.id
      WHERE l.id = actions.location_id
      AND u.clerk_user_id = auth.uid()::TEXT
    )
    OR
    -- Or assigned to this action
    assigned_to_id IN (
      SELECT id FROM users WHERE clerk_user_id = auth.uid()::TEXT
    )
    OR
    -- Or admin/inspector
    EXISTS (
      SELECT 1 FROM organization_members om
      JOIN users u ON om.user_id = u.id
      WHERE u.clerk_user_id = auth.uid()::TEXT
      AND om.organization_id = actions.organization_id
      AND om.role IN ('admin', 'inspector')
    )
  );
