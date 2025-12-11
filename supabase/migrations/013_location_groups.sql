-- ============================================
-- Migration: Location Groups / Regions
-- Feature: Group locations by region for better organization
-- ============================================

-- ============================================
-- HELPER FUNCTION: Get current user's organization IDs (no parameter version)
-- This wraps the existing function to work with RLS policies
-- ============================================

CREATE OR REPLACE FUNCTION get_user_organization_ids()
RETURNS SETOF UUID AS $$
BEGIN
  -- For service role or when auth.jwt() is available
  IF auth.jwt() IS NOT NULL AND auth.jwt() ->> 'sub' IS NOT NULL THEN
    RETURN QUERY
    SELECT om.organization_id
    FROM organization_members om
    JOIN users u ON om.user_id = u.id
    WHERE u.clerk_user_id = auth.jwt() ->> 'sub';
  ELSE
    -- Return empty set if no auth context (service role handles this)
    RETURN;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- LOCATION GROUPS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS location_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  name VARCHAR(255) NOT NULL,
  description TEXT,
  color VARCHAR(7) DEFAULT '#1a9988', -- For visual distinction
  icon VARCHAR(50) DEFAULT 'building', -- Icon identifier
  
  -- Group manager (regional manager)
  manager_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add group reference to locations
ALTER TABLE locations 
ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES location_groups(id) ON DELETE SET NULL;

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_location_groups_org_id ON location_groups(organization_id);
CREATE INDEX IF NOT EXISTS idx_locations_group_id ON locations(group_id);

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE location_groups ENABLE ROW LEVEL SECURITY;

-- Policy: Organization members can view their location groups
DROP POLICY IF EXISTS "location_groups_select" ON location_groups;
CREATE POLICY "location_groups_select" ON location_groups
  FOR SELECT
  USING (
    organization_id IN (
      SELECT get_user_organization_ids()
    )
  );

-- Policy: Admins can insert location groups
DROP POLICY IF EXISTS "location_groups_insert" ON location_groups;
CREATE POLICY "location_groups_insert" ON location_groups
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT get_user_organization_ids()
    )
  );

-- Policy: Admins can update location groups
DROP POLICY IF EXISTS "location_groups_update" ON location_groups;
CREATE POLICY "location_groups_update" ON location_groups
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT get_user_organization_ids()
    )
  );

-- Policy: Admins can delete location groups
DROP POLICY IF EXISTS "location_groups_delete" ON location_groups;
CREATE POLICY "location_groups_delete" ON location_groups
  FOR DELETE
  USING (
    organization_id IN (
      SELECT get_user_organization_ids()
    )
  );

-- Service role bypass (for server actions)
DROP POLICY IF EXISTS "service_role_location_groups" ON location_groups;
CREATE POLICY "service_role_location_groups" ON location_groups
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================

DROP TRIGGER IF EXISTS update_location_groups_updated_at ON location_groups;
CREATE TRIGGER update_location_groups_updated_at
  BEFORE UPDATE ON location_groups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VIEW: Group Performance Summary
-- ============================================

CREATE OR REPLACE VIEW location_group_performance AS
SELECT 
  lg.id AS group_id,
  lg.name AS group_name,
  lg.organization_id,
  COUNT(DISTINCT l.id) AS location_count,
  COUNT(DISTINCT a.id) AS total_audits,
  COUNT(DISTINCT CASE WHEN a.status = 'completed' THEN a.id END) AS completed_audits,
  COALESCE(AVG(CASE WHEN a.status = 'completed' THEN a.pass_percentage END), 0) AS avg_score,
  COUNT(DISTINCT CASE WHEN a.status = 'completed' AND a.passed THEN a.id END) AS passed_audits,
  COUNT(DISTINCT CASE WHEN a.status = 'completed' AND NOT a.passed THEN a.id END) AS failed_audits,
  COUNT(DISTINCT CASE WHEN act.status IN ('pending', 'in_progress') THEN act.id END) AS open_actions,
  COUNT(DISTINCT CASE WHEN act.deadline < CURRENT_DATE AND act.status NOT IN ('completed', 'verified') THEN act.id END) AS overdue_actions
FROM location_groups lg
LEFT JOIN locations l ON l.group_id = lg.id AND l.status = 'active'
LEFT JOIN audits a ON a.location_id = l.id
LEFT JOIN actions act ON act.location_id = l.id
GROUP BY lg.id, lg.name, lg.organization_id;


