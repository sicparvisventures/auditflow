-- ============================================
-- AuditFlow Database Schema
-- Version: 1.0.0
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";

-- ============================================
-- ENUMS
-- ============================================

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'inspector', 'manager', 'viewer');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE audit_status AS ENUM ('draft', 'in_progress', 'completed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE action_status AS ENUM ('pending', 'in_progress', 'completed', 'verified', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE urgency_level AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE checklist_result AS ENUM ('pass', 'fail', 'na');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- ORGANIZATIONS TABLE (synced from Clerk)
-- ============================================

CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_org_id TEXT UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  
  -- Subscription tier
  tier VARCHAR(50) NOT NULL DEFAULT 'starter',
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  
  -- Branding (for white-label support)
  primary_color VARCHAR(7) DEFAULT '#1a9988',
  secondary_color VARCHAR(7) DEFAULT '#34d399',
  accent_color VARCHAR(7) DEFAULT '#10b981',
  logo_url TEXT,
  
  -- Limits based on tier
  max_users INTEGER DEFAULT 3,
  max_locations INTEGER DEFAULT 2,
  max_audits_per_month INTEGER DEFAULT 10,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- USERS TABLE (synced from Clerk)
-- ============================================

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT UNIQUE NOT NULL,
  email CITEXT NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  full_name VARCHAR(255) GENERATED ALWAYS AS (
    COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')
  ) STORED,
  phone VARCHAR(20),
  avatar_url TEXT,
  role user_role NOT NULL DEFAULT 'viewer',
  active BOOLEAN DEFAULT true,
  
  -- Current organization (for quick lookup)
  current_organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ORGANIZATION MEMBERS (synced from Clerk)
-- ============================================

CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_membership_id TEXT UNIQUE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'viewer',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(organization_id, user_id)
);

-- ============================================
-- LOCATIONS (Filialen/Branches)
-- ============================================

CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  name VARCHAR(255) NOT NULL,
  address TEXT,
  city VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(100) DEFAULT 'Netherlands',
  phone VARCHAR(20),
  email CITEXT,
  
  -- Location manager (restaurant manager)
  manager_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  status VARCHAR(50) DEFAULT 'active',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- AUDIT TEMPLATES
-- ============================================

CREATE TABLE IF NOT EXISTS audit_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Template settings
  is_active BOOLEAN DEFAULT true,
  requires_photos BOOLEAN DEFAULT false,
  pass_threshold DECIMAL(5,2) DEFAULT 70.00, -- Percentage needed to pass
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- AUDIT TEMPLATE CATEGORIES
-- ============================================

CREATE TABLE IF NOT EXISTS audit_template_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES audit_templates(id) ON DELETE CASCADE,
  
  name VARCHAR(255) NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  weight DECIMAL(5,2) DEFAULT 1.00, -- Category weight for scoring
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- AUDIT TEMPLATE ITEMS (Checklist Items)
-- ============================================

CREATE TABLE IF NOT EXISTS audit_template_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES audit_template_categories(id) ON DELETE CASCADE,
  
  title VARCHAR(255) NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  weight DECIMAL(5,2) DEFAULT 1.00, -- Item weight for scoring
  
  -- Item settings
  requires_photo BOOLEAN DEFAULT false,
  requires_comment_on_fail BOOLEAN DEFAULT true,
  creates_action_on_fail BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- AUDITS
-- ============================================

CREATE TABLE IF NOT EXISTS audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  template_id UUID REFERENCES audit_templates(id) ON DELETE SET NULL,
  
  -- Inspector who performed the audit
  inspector_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  
  -- Audit details
  audit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status audit_status DEFAULT 'draft',
  
  -- Scoring
  total_score DECIMAL(5,2) DEFAULT 0.00,
  max_score DECIMAL(5,2) DEFAULT 0.00,
  pass_percentage DECIMAL(5,2) DEFAULT 0.00,
  passed BOOLEAN DEFAULT false,
  
  -- Additional info
  comments TEXT,
  
  -- Timestamps
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- AUDIT RESULTS (Checklist Item Results)
-- ============================================

CREATE TABLE IF NOT EXISTS audit_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
  template_item_id UUID REFERENCES audit_template_items(id) ON DELETE SET NULL,
  
  -- Result
  result checklist_result NOT NULL,
  score DECIMAL(5,2) DEFAULT 0.00,
  
  -- Additional info
  comments TEXT,
  photo_urls TEXT[] DEFAULT '{}',
  
  -- If this creates an action
  action_created BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ACTIONS (Corrective Actions / Verbeterpunten)
-- ============================================

CREATE TABLE IF NOT EXISTS actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  
  -- Source audit (if created from audit)
  audit_id UUID REFERENCES audits(id) ON DELETE SET NULL,
  audit_result_id UUID REFERENCES audit_results(id) ON DELETE SET NULL,
  
  -- Action details
  title VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Status and urgency
  status action_status DEFAULT 'pending',
  urgency urgency_level DEFAULT 'medium',
  
  -- Assignment
  assigned_to_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Deadlines
  deadline DATE,
  
  -- Evidence photos (for completion)
  photo_urls TEXT[] DEFAULT '{}',
  
  -- Manager response
  response_text TEXT,
  response_photos TEXT[] DEFAULT '{}',
  responded_at TIMESTAMPTZ,
  
  -- Verification (by inspector/admin)
  verified_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  verification_notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- ============================================
-- REPORTS
-- ============================================

CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
  
  -- Report details
  report_type VARCHAR(50) DEFAULT 'pdf',
  file_url TEXT,
  
  -- Email sending
  sent_to_emails TEXT[] DEFAULT '{}',
  sent_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Users
CREATE INDEX IF NOT EXISTS idx_users_clerk_user_id ON users(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_current_org ON users(current_organization_id);

-- Organizations
CREATE INDEX IF NOT EXISTS idx_organizations_clerk_org_id ON organizations(clerk_org_id);
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);

-- Organization Members
CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON organization_members(user_id);

-- Locations
CREATE INDEX IF NOT EXISTS idx_locations_org_id ON locations(organization_id);
CREATE INDEX IF NOT EXISTS idx_locations_manager_id ON locations(manager_id);

-- Audit Templates
CREATE INDEX IF NOT EXISTS idx_audit_templates_org_id ON audit_templates(organization_id);

-- Audits
CREATE INDEX IF NOT EXISTS idx_audits_org_id ON audits(organization_id);
CREATE INDEX IF NOT EXISTS idx_audits_location_id ON audits(location_id);
CREATE INDEX IF NOT EXISTS idx_audits_inspector_id ON audits(inspector_id);
CREATE INDEX IF NOT EXISTS idx_audits_status ON audits(status);
CREATE INDEX IF NOT EXISTS idx_audits_date ON audits(audit_date);

-- Audit Results
CREATE INDEX IF NOT EXISTS idx_audit_results_audit_id ON audit_results(audit_id);

-- Actions
CREATE INDEX IF NOT EXISTS idx_actions_org_id ON actions(organization_id);
CREATE INDEX IF NOT EXISTS idx_actions_location_id ON actions(location_id);
CREATE INDEX IF NOT EXISTS idx_actions_audit_id ON actions(audit_id);
CREATE INDEX IF NOT EXISTS idx_actions_assigned_to ON actions(assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_actions_status ON actions(status);
CREATE INDEX IF NOT EXISTS idx_actions_deadline ON actions(deadline);

-- ============================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
DO $$ 
DECLARE
  t text;
BEGIN
  FOR t IN 
    SELECT table_name 
    FROM information_schema.columns 
    WHERE column_name = 'updated_at' 
    AND table_schema = 'public'
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS update_%I_updated_at ON %I;
      CREATE TRIGGER update_%I_updated_at
        BEFORE UPDATE ON %I
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    ', t, t, t, t);
  END LOOP;
END $$;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Calculate audit score
CREATE OR REPLACE FUNCTION calculate_audit_score(p_audit_id UUID)
RETURNS TABLE(total_score DECIMAL, max_score DECIMAL, pass_percentage DECIMAL, passed BOOLEAN) AS $$
DECLARE
  v_total_score DECIMAL := 0;
  v_max_score DECIMAL := 0;
  v_pass_percentage DECIMAL := 0;
  v_pass_threshold DECIMAL := 70.00;
  v_passed BOOLEAN := false;
BEGIN
  -- Get pass threshold from template
  SELECT COALESCE(at.pass_threshold, 70.00)
  INTO v_pass_threshold
  FROM audits a
  LEFT JOIN audit_templates at ON a.template_id = at.id
  WHERE a.id = p_audit_id;

  -- Calculate scores from results
  SELECT 
    COALESCE(SUM(CASE WHEN ar.result = 'pass' THEN ati.weight ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN ar.result != 'na' THEN ati.weight ELSE 0 END), 0)
  INTO v_total_score, v_max_score
  FROM audit_results ar
  LEFT JOIN audit_template_items ati ON ar.template_item_id = ati.id
  WHERE ar.audit_id = p_audit_id;

  -- Calculate percentage
  IF v_max_score > 0 THEN
    v_pass_percentage := (v_total_score / v_max_score) * 100;
  END IF;

  -- Check if passed
  v_passed := v_pass_percentage >= v_pass_threshold;

  RETURN QUERY SELECT v_total_score, v_max_score, v_pass_percentage, v_passed;
END;
$$ LANGUAGE plpgsql;

-- Update audit scores after result changes
CREATE OR REPLACE FUNCTION update_audit_scores()
RETURNS TRIGGER AS $$
DECLARE
  v_score_result RECORD;
BEGIN
  SELECT * INTO v_score_result FROM calculate_audit_score(
    CASE WHEN TG_OP = 'DELETE' THEN OLD.audit_id ELSE NEW.audit_id END
  );

  UPDATE audits
  SET 
    total_score = v_score_result.total_score,
    max_score = v_score_result.max_score,
    pass_percentage = v_score_result.pass_percentage,
    passed = v_score_result.passed
  WHERE id = CASE WHEN TG_OP = 'DELETE' THEN OLD.audit_id ELSE NEW.audit_id END;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for automatic score updates
DROP TRIGGER IF EXISTS trigger_update_audit_scores ON audit_results;
CREATE TRIGGER trigger_update_audit_scores
  AFTER INSERT OR UPDATE OR DELETE ON audit_results
  FOR EACH ROW
  EXECUTE FUNCTION update_audit_scores();

-- ============================================
-- INITIAL DATA: Default Audit Template
-- ============================================

-- This will be created per organization during onboarding
