-- ============================================
-- Migration: Risk Assessment & Priority Matrix
-- Feature: Risk levels for audit items and actions
-- ============================================

-- ============================================
-- ENUMS
-- ============================================

DO $$ BEGIN
  CREATE TYPE risk_level AS ENUM ('critical', 'high', 'medium', 'low', 'info');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE risk_category AS ENUM ('safety', 'compliance', 'quality', 'operational', 'financial', 'reputational');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- ADD RISK FIELDS TO TEMPLATE ITEMS
-- ============================================

ALTER TABLE audit_template_items 
ADD COLUMN IF NOT EXISTS risk_level risk_level DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS risk_category risk_category DEFAULT 'quality',
ADD COLUMN IF NOT EXISTS is_critical BOOLEAN DEFAULT false, -- Critical items fail entire audit
ADD COLUMN IF NOT EXISTS auto_action_urgency urgency_level DEFAULT 'medium'; -- When action is created

-- ============================================
-- ADD RISK SCORING TO AUDITS
-- ============================================

ALTER TABLE audits
ADD COLUMN IF NOT EXISTS risk_score DECIMAL(5,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS critical_failures INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS high_risk_failures INTEGER DEFAULT 0;

-- ============================================
-- RISK ASSESSMENT TABLE (per audit)
-- ============================================

CREATE TABLE IF NOT EXISTS audit_risk_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
  
  -- Overall risk assessment
  overall_risk_level risk_level NOT NULL DEFAULT 'medium',
  risk_score DECIMAL(5,2) DEFAULT 0.00, -- 0-100
  
  -- Risk breakdown by category
  safety_score DECIMAL(5,2) DEFAULT 100.00,
  compliance_score DECIMAL(5,2) DEFAULT 100.00,
  quality_score DECIMAL(5,2) DEFAULT 100.00,
  operational_score DECIMAL(5,2) DEFAULT 100.00,
  
  -- Flags
  has_critical_failures BOOLEAN DEFAULT false,
  requires_immediate_action BOOLEAN DEFAULT false,
  
  -- Notes
  assessor_notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- RISK MATRIX CONFIGURATION
-- ============================================

CREATE TABLE IF NOT EXISTS risk_matrix_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  risk_level risk_level NOT NULL,
  risk_category risk_category NOT NULL,
  
  -- Configuration
  weight DECIMAL(5,2) DEFAULT 1.00,
  color VARCHAR(7) DEFAULT '#f59e0b',
  description TEXT,
  
  -- Auto-action settings
  auto_create_action BOOLEAN DEFAULT true,
  default_urgency urgency_level DEFAULT 'medium',
  default_deadline_days INTEGER DEFAULT 7, -- Days from audit date
  
  -- Escalation
  escalate_to_manager BOOLEAN DEFAULT false,
  escalate_to_admin BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(organization_id, risk_level, risk_category)
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_audit_risk_assessments_audit_id ON audit_risk_assessments(audit_id);
CREATE INDEX IF NOT EXISTS idx_risk_matrix_config_org_id ON risk_matrix_config(organization_id);
CREATE INDEX IF NOT EXISTS idx_template_items_risk_level ON audit_template_items(risk_level);

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE audit_risk_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_matrix_config ENABLE ROW LEVEL SECURITY;

-- Risk assessments policies
DROP POLICY IF EXISTS "risk_assessments_select" ON audit_risk_assessments;
CREATE POLICY "risk_assessments_select" ON audit_risk_assessments
  FOR SELECT
  USING (
    audit_id IN (
      SELECT id FROM audits WHERE organization_id IN (SELECT get_user_organization_ids())
    )
  );

DROP POLICY IF EXISTS "risk_assessments_insert" ON audit_risk_assessments;
CREATE POLICY "risk_assessments_insert" ON audit_risk_assessments
  FOR INSERT
  WITH CHECK (
    audit_id IN (
      SELECT id FROM audits WHERE organization_id IN (SELECT get_user_organization_ids())
    )
  );

DROP POLICY IF EXISTS "risk_assessments_update" ON audit_risk_assessments;
CREATE POLICY "risk_assessments_update" ON audit_risk_assessments
  FOR UPDATE
  USING (
    audit_id IN (
      SELECT id FROM audits WHERE organization_id IN (SELECT get_user_organization_ids())
    )
  );

-- Risk matrix config policies
DROP POLICY IF EXISTS "risk_matrix_select" ON risk_matrix_config;
CREATE POLICY "risk_matrix_select" ON risk_matrix_config
  FOR SELECT
  USING (organization_id IN (SELECT get_user_organization_ids()));

DROP POLICY IF EXISTS "risk_matrix_insert" ON risk_matrix_config;
CREATE POLICY "risk_matrix_insert" ON risk_matrix_config
  FOR INSERT
  WITH CHECK (organization_id IN (SELECT get_user_organization_ids()));

DROP POLICY IF EXISTS "risk_matrix_update" ON risk_matrix_config;
CREATE POLICY "risk_matrix_update" ON risk_matrix_config
  FOR UPDATE
  USING (organization_id IN (SELECT get_user_organization_ids()));

-- Service role bypass (for server actions)
DROP POLICY IF EXISTS "service_role_risk_assessments" ON audit_risk_assessments;
CREATE POLICY "service_role_risk_assessments" ON audit_risk_assessments
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_risk_matrix" ON risk_matrix_config;
CREATE POLICY "service_role_risk_matrix" ON risk_matrix_config
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- FUNCTION: Calculate Risk Score for Audit
-- ============================================

CREATE OR REPLACE FUNCTION calculate_audit_risk_score(p_audit_id UUID)
RETURNS TABLE(
  overall_risk risk_level,
  risk_score DECIMAL,
  critical_count INTEGER,
  high_count INTEGER,
  safety_score DECIMAL,
  compliance_score DECIMAL,
  quality_score DECIMAL,
  operational_score DECIMAL
) AS $$
DECLARE
  v_critical_count INTEGER := 0;
  v_high_count INTEGER := 0;
  v_risk_score DECIMAL := 0;
  v_overall_risk risk_level := 'low';
  v_safety DECIMAL := 100;
  v_compliance DECIMAL := 100;
  v_quality DECIMAL := 100;
  v_operational DECIMAL := 100;
BEGIN
  -- Count failures by risk level
  SELECT 
    COUNT(CASE WHEN ati.risk_level = 'critical' AND ar.result = 'fail' THEN 1 END),
    COUNT(CASE WHEN ati.risk_level = 'high' AND ar.result = 'fail' THEN 1 END)
  INTO v_critical_count, v_high_count
  FROM audit_results ar
  JOIN audit_template_items ati ON ar.template_item_id = ati.id
  WHERE ar.audit_id = p_audit_id;

  -- Calculate category scores
  SELECT 
    COALESCE(100 - (COUNT(CASE WHEN ati.risk_category = 'safety' AND ar.result = 'fail' THEN 1 END)::DECIMAL / 
      NULLIF(COUNT(CASE WHEN ati.risk_category = 'safety' AND ar.result != 'na' THEN 1 END), 0) * 100), 100),
    COALESCE(100 - (COUNT(CASE WHEN ati.risk_category = 'compliance' AND ar.result = 'fail' THEN 1 END)::DECIMAL / 
      NULLIF(COUNT(CASE WHEN ati.risk_category = 'compliance' AND ar.result != 'na' THEN 1 END), 0) * 100), 100),
    COALESCE(100 - (COUNT(CASE WHEN ati.risk_category = 'quality' AND ar.result = 'fail' THEN 1 END)::DECIMAL / 
      NULLIF(COUNT(CASE WHEN ati.risk_category = 'quality' AND ar.result != 'na' THEN 1 END), 0) * 100), 100),
    COALESCE(100 - (COUNT(CASE WHEN ati.risk_category = 'operational' AND ar.result = 'fail' THEN 1 END)::DECIMAL / 
      NULLIF(COUNT(CASE WHEN ati.risk_category = 'operational' AND ar.result != 'na' THEN 1 END), 0) * 100), 100)
  INTO v_safety, v_compliance, v_quality, v_operational
  FROM audit_results ar
  JOIN audit_template_items ati ON ar.template_item_id = ati.id
  WHERE ar.audit_id = p_audit_id;

  -- Calculate overall risk score (weighted average with emphasis on critical categories)
  v_risk_score := (v_safety * 1.5 + v_compliance * 1.3 + v_quality * 1.0 + v_operational * 0.8) / 4.6;

  -- Determine overall risk level
  IF v_critical_count > 0 THEN
    v_overall_risk := 'critical';
  ELSIF v_high_count > 2 OR v_risk_score < 50 THEN
    v_overall_risk := 'high';
  ELSIF v_high_count > 0 OR v_risk_score < 70 THEN
    v_overall_risk := 'medium';
  ELSIF v_risk_score < 90 THEN
    v_overall_risk := 'low';
  ELSE
    v_overall_risk := 'info';
  END IF;

  RETURN QUERY SELECT v_overall_risk, v_risk_score, v_critical_count, v_high_count, 
    v_safety, v_compliance, v_quality, v_operational;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGER: Auto-create risk assessment on audit completion
-- ============================================

CREATE OR REPLACE FUNCTION create_risk_assessment_on_completion()
RETURNS TRIGGER AS $$
DECLARE
  v_risk_result RECORD;
BEGIN
  -- Only run when audit is completed
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    SELECT * INTO v_risk_result FROM calculate_audit_risk_score(NEW.id);
    
    -- Update audit with risk data
    NEW.risk_score := v_risk_result.risk_score;
    NEW.critical_failures := v_risk_result.critical_count;
    NEW.high_risk_failures := v_risk_result.high_count;
    
    -- Create or update risk assessment
    INSERT INTO audit_risk_assessments (
      audit_id,
      overall_risk_level,
      risk_score,
      safety_score,
      compliance_score,
      quality_score,
      operational_score,
      has_critical_failures,
      requires_immediate_action
    ) VALUES (
      NEW.id,
      v_risk_result.overall_risk,
      v_risk_result.risk_score,
      v_risk_result.safety_score,
      v_risk_result.compliance_score,
      v_risk_result.quality_score,
      v_risk_result.operational_score,
      v_risk_result.critical_count > 0,
      v_risk_result.overall_risk IN ('critical', 'high')
    )
    ON CONFLICT (audit_id) DO UPDATE SET
      overall_risk_level = EXCLUDED.overall_risk_level,
      risk_score = EXCLUDED.risk_score,
      safety_score = EXCLUDED.safety_score,
      compliance_score = EXCLUDED.compliance_score,
      quality_score = EXCLUDED.quality_score,
      operational_score = EXCLUDED.operational_score,
      has_critical_failures = EXCLUDED.has_critical_failures,
      requires_immediate_action = EXCLUDED.requires_immediate_action,
      updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add unique constraint for risk assessments
ALTER TABLE audit_risk_assessments 
DROP CONSTRAINT IF EXISTS audit_risk_assessments_audit_id_key;
ALTER TABLE audit_risk_assessments 
ADD CONSTRAINT audit_risk_assessments_audit_id_key UNIQUE (audit_id);

DROP TRIGGER IF EXISTS trigger_create_risk_assessment ON audits;
CREATE TRIGGER trigger_create_risk_assessment
  BEFORE UPDATE ON audits
  FOR EACH ROW
  EXECUTE FUNCTION create_risk_assessment_on_completion();

-- ============================================
-- VIEW: Risk Dashboard Summary
-- ============================================

CREATE OR REPLACE VIEW risk_dashboard_summary AS
SELECT 
  a.organization_id,
  COUNT(CASE WHEN ara.overall_risk_level = 'critical' THEN 1 END) AS critical_risk_audits,
  COUNT(CASE WHEN ara.overall_risk_level = 'high' THEN 1 END) AS high_risk_audits,
  COUNT(CASE WHEN ara.overall_risk_level = 'medium' THEN 1 END) AS medium_risk_audits,
  COUNT(CASE WHEN ara.overall_risk_level = 'low' THEN 1 END) AS low_risk_audits,
  COALESCE(AVG(ara.risk_score), 100) AS avg_risk_score,
  COALESCE(AVG(ara.safety_score), 100) AS avg_safety_score,
  COALESCE(AVG(ara.compliance_score), 100) AS avg_compliance_score,
  SUM(CASE WHEN ara.has_critical_failures THEN 1 ELSE 0 END) AS audits_with_critical_failures,
  SUM(CASE WHEN ara.requires_immediate_action THEN 1 ELSE 0 END) AS audits_requiring_action
FROM audits a
LEFT JOIN audit_risk_assessments ara ON a.id = ara.audit_id
WHERE a.status = 'completed'
  AND a.audit_date >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY a.organization_id;


