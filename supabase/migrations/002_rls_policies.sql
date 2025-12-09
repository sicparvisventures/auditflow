-- ============================================
-- AuditFlow Row Level Security Policies
-- Version: 1.0.0
-- ============================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_template_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_template_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- ============================================
-- HELPER FUNCTION: Get user's organization IDs
-- ============================================

CREATE OR REPLACE FUNCTION get_user_organization_ids(p_clerk_user_id TEXT)
RETURNS SETOF UUID AS $$
BEGIN
  RETURN QUERY
  SELECT om.organization_id
  FROM organization_members om
  JOIN users u ON om.user_id = u.id
  WHERE u.clerk_user_id = p_clerk_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- HELPER FUNCTION: Check if user is admin in org
-- ============================================

CREATE OR REPLACE FUNCTION is_org_admin(p_clerk_user_id TEXT, p_org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM organization_members om
    JOIN users u ON om.user_id = u.id
    WHERE u.clerk_user_id = p_clerk_user_id
    AND om.organization_id = p_org_id
    AND om.role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ORGANIZATIONS POLICIES
-- ============================================

-- Users can view organizations they belong to
CREATE POLICY "Users can view their organizations"
ON organizations FOR SELECT
USING (
  id IN (SELECT get_user_organization_ids(auth.jwt() ->> 'sub'))
);

-- Only admins can update organization settings
CREATE POLICY "Admins can update their organizations"
ON organizations FOR UPDATE
USING (
  is_org_admin(auth.jwt() ->> 'sub', id)
);

-- ============================================
-- USERS POLICIES
-- ============================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
ON users FOR SELECT
USING (clerk_user_id = auth.jwt() ->> 'sub');

-- Users can view other users in their organizations
CREATE POLICY "Users can view org members"
ON users FOR SELECT
USING (
  id IN (
    SELECT om.user_id
    FROM organization_members om
    WHERE om.organization_id IN (SELECT get_user_organization_ids(auth.jwt() ->> 'sub'))
  )
);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON users FOR UPDATE
USING (clerk_user_id = auth.jwt() ->> 'sub');

-- ============================================
-- ORGANIZATION MEMBERS POLICIES
-- ============================================

-- Users can view members of their organizations
CREATE POLICY "Users can view org members"
ON organization_members FOR SELECT
USING (
  organization_id IN (SELECT get_user_organization_ids(auth.jwt() ->> 'sub'))
);

-- Only admins can manage members
CREATE POLICY "Admins can manage org members"
ON organization_members FOR ALL
USING (
  is_org_admin(auth.jwt() ->> 'sub', organization_id)
);

-- ============================================
-- LOCATIONS POLICIES
-- ============================================

-- Users can view locations in their organizations
CREATE POLICY "Users can view org locations"
ON locations FOR SELECT
USING (
  organization_id IN (SELECT get_user_organization_ids(auth.jwt() ->> 'sub'))
);

-- Admins can manage locations
CREATE POLICY "Admins can manage locations"
ON locations FOR ALL
USING (
  is_org_admin(auth.jwt() ->> 'sub', organization_id)
);

-- ============================================
-- AUDIT TEMPLATES POLICIES
-- ============================================

-- Users can view templates in their organizations
CREATE POLICY "Users can view org templates"
ON audit_templates FOR SELECT
USING (
  organization_id IN (SELECT get_user_organization_ids(auth.jwt() ->> 'sub'))
);

-- Admins can manage templates
CREATE POLICY "Admins can manage templates"
ON audit_templates FOR ALL
USING (
  is_org_admin(auth.jwt() ->> 'sub', organization_id)
);

-- ============================================
-- AUDIT TEMPLATE CATEGORIES POLICIES
-- ============================================

-- Users can view categories for templates in their organizations
CREATE POLICY "Users can view template categories"
ON audit_template_categories FOR SELECT
USING (
  template_id IN (
    SELECT id FROM audit_templates
    WHERE organization_id IN (SELECT get_user_organization_ids(auth.jwt() ->> 'sub'))
  )
);

-- Admins can manage categories
CREATE POLICY "Admins can manage template categories"
ON audit_template_categories FOR ALL
USING (
  template_id IN (
    SELECT id FROM audit_templates
    WHERE is_org_admin(auth.jwt() ->> 'sub', organization_id)
  )
);

-- ============================================
-- AUDIT TEMPLATE ITEMS POLICIES
-- ============================================

-- Users can view items for templates in their organizations
CREATE POLICY "Users can view template items"
ON audit_template_items FOR SELECT
USING (
  category_id IN (
    SELECT atc.id FROM audit_template_categories atc
    JOIN audit_templates at ON atc.template_id = at.id
    WHERE at.organization_id IN (SELECT get_user_organization_ids(auth.jwt() ->> 'sub'))
  )
);

-- Admins can manage items
CREATE POLICY "Admins can manage template items"
ON audit_template_items FOR ALL
USING (
  category_id IN (
    SELECT atc.id FROM audit_template_categories atc
    JOIN audit_templates at ON atc.template_id = at.id
    WHERE is_org_admin(auth.jwt() ->> 'sub', at.organization_id)
  )
);

-- ============================================
-- AUDITS POLICIES
-- ============================================

-- Users can view audits in their organizations
CREATE POLICY "Users can view org audits"
ON audits FOR SELECT
USING (
  organization_id IN (SELECT get_user_organization_ids(auth.jwt() ->> 'sub'))
);

-- Inspectors and admins can create audits
CREATE POLICY "Inspectors can create audits"
ON audits FOR INSERT
WITH CHECK (
  organization_id IN (SELECT get_user_organization_ids(auth.jwt() ->> 'sub'))
  AND EXISTS (
    SELECT 1 FROM organization_members om
    JOIN users u ON om.user_id = u.id
    WHERE u.clerk_user_id = auth.jwt() ->> 'sub'
    AND om.organization_id = organization_id
    AND om.role IN ('admin', 'inspector')
  )
);

-- Inspectors can update their own audits, admins can update any
CREATE POLICY "Inspectors can update own audits"
ON audits FOR UPDATE
USING (
  (
    inspector_id IN (
      SELECT id FROM users WHERE clerk_user_id = auth.jwt() ->> 'sub'
    )
  )
  OR is_org_admin(auth.jwt() ->> 'sub', organization_id)
);

-- Only admins can delete audits
CREATE POLICY "Admins can delete audits"
ON audits FOR DELETE
USING (
  is_org_admin(auth.jwt() ->> 'sub', organization_id)
);

-- ============================================
-- AUDIT RESULTS POLICIES
-- ============================================

-- Users can view results for audits in their organizations
CREATE POLICY "Users can view audit results"
ON audit_results FOR SELECT
USING (
  audit_id IN (
    SELECT id FROM audits
    WHERE organization_id IN (SELECT get_user_organization_ids(auth.jwt() ->> 'sub'))
  )
);

-- Inspectors can manage results for their audits
CREATE POLICY "Inspectors can manage audit results"
ON audit_results FOR ALL
USING (
  audit_id IN (
    SELECT id FROM audits
    WHERE inspector_id IN (
      SELECT id FROM users WHERE clerk_user_id = auth.jwt() ->> 'sub'
    )
    OR is_org_admin(auth.jwt() ->> 'sub', organization_id)
  )
);

-- ============================================
-- ACTIONS POLICIES
-- ============================================

-- Users can view actions in their organizations
CREATE POLICY "Users can view org actions"
ON actions FOR SELECT
USING (
  organization_id IN (SELECT get_user_organization_ids(auth.jwt() ->> 'sub'))
);

-- Inspectors/admins can create actions
CREATE POLICY "Inspectors can create actions"
ON actions FOR INSERT
WITH CHECK (
  organization_id IN (SELECT get_user_organization_ids(auth.jwt() ->> 'sub'))
);

-- Assigned users can update their actions (response)
-- Admins/inspectors can update any action in their org
CREATE POLICY "Users can update assigned actions"
ON actions FOR UPDATE
USING (
  (
    assigned_to_id IN (
      SELECT id FROM users WHERE clerk_user_id = auth.jwt() ->> 'sub'
    )
  )
  OR is_org_admin(auth.jwt() ->> 'sub', organization_id)
  OR EXISTS (
    SELECT 1 FROM organization_members om
    JOIN users u ON om.user_id = u.id
    WHERE u.clerk_user_id = auth.jwt() ->> 'sub'
    AND om.organization_id = organization_id
    AND om.role = 'inspector'
  )
);

-- Only admins can delete actions
CREATE POLICY "Admins can delete actions"
ON actions FOR DELETE
USING (
  is_org_admin(auth.jwt() ->> 'sub', organization_id)
);

-- ============================================
-- REPORTS POLICIES
-- ============================================

-- Users can view reports for audits in their organizations
CREATE POLICY "Users can view org reports"
ON reports FOR SELECT
USING (
  audit_id IN (
    SELECT id FROM audits
    WHERE organization_id IN (SELECT get_user_organization_ids(auth.jwt() ->> 'sub'))
  )
);

-- Inspectors/admins can create reports
CREATE POLICY "Inspectors can create reports"
ON reports FOR INSERT
WITH CHECK (
  audit_id IN (
    SELECT id FROM audits
    WHERE organization_id IN (SELECT get_user_organization_ids(auth.jwt() ->> 'sub'))
  )
);

-- ============================================
-- SERVICE ROLE BYPASS (for webhooks)
-- ============================================

-- These policies allow the service role to bypass RLS
-- Service role is used by Clerk webhooks to sync data

CREATE POLICY "Service role full access to organizations"
ON organizations FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role full access to users"
ON users FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role full access to organization_members"
ON organization_members FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
