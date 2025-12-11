-- ============================================
-- Migration: Digital Signatures
-- Feature: Sign-off on audits for compliance
-- ============================================

-- ============================================
-- ENUMS
-- ============================================

DO $$ BEGIN
  CREATE TYPE signature_type AS ENUM ('inspector', 'manager', 'witness', 'approval');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE signature_status AS ENUM ('pending', 'signed', 'declined', 'expired');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- AUDIT SIGNATURES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS audit_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
  
  -- Signer info
  signer_id UUID REFERENCES users(id) ON DELETE SET NULL,
  signer_name VARCHAR(255) NOT NULL, -- Stored for historical record
  signer_email VARCHAR(255),
  signer_role VARCHAR(100),
  
  -- Signature details
  signature_type signature_type NOT NULL DEFAULT 'inspector',
  status signature_status DEFAULT 'pending',
  
  -- Signature data
  signature_data TEXT, -- Base64 encoded signature image
  signature_hash VARCHAR(64), -- SHA-256 hash for verification
  
  -- Consent & compliance
  consent_text TEXT DEFAULT 'I confirm that the information in this audit is accurate and complete to the best of my knowledge.',
  ip_address INET,
  user_agent TEXT,
  
  -- Timestamps
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  signed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  
  -- Notes
  decline_reason TEXT,
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ACTION SIGNATURES TABLE (for completion sign-off)
-- ============================================

CREATE TABLE IF NOT EXISTS action_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id UUID NOT NULL REFERENCES actions(id) ON DELETE CASCADE,
  
  -- Signer info
  signer_id UUID REFERENCES users(id) ON DELETE SET NULL,
  signer_name VARCHAR(255) NOT NULL,
  signer_email VARCHAR(255),
  
  -- Signature details
  signature_type signature_type NOT NULL DEFAULT 'manager',
  status signature_status DEFAULT 'pending',
  
  -- Signature data
  signature_data TEXT,
  signature_hash VARCHAR(64),
  
  -- Consent
  consent_text TEXT DEFAULT 'I confirm that this corrective action has been completed as described.',
  ip_address INET,
  user_agent TEXT,
  
  -- Timestamps
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  signed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  
  decline_reason TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SIGNATURE REQUIREMENTS CONFIG
-- ============================================

CREATE TABLE IF NOT EXISTS signature_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- What requires signatures
  require_inspector_signature BOOLEAN DEFAULT true,
  require_manager_signature BOOLEAN DEFAULT false,
  require_witness_signature BOOLEAN DEFAULT false,
  
  -- When to require
  require_on_failed_audits BOOLEAN DEFAULT true,
  require_on_critical_findings BOOLEAN DEFAULT true,
  require_on_action_completion BOOLEAN DEFAULT false,
  
  -- Settings
  signature_expiry_days INTEGER DEFAULT 7,
  allow_digital_signature BOOLEAN DEFAULT true,
  allow_typed_signature BOOLEAN DEFAULT true,
  
  -- Compliance
  retention_days INTEGER DEFAULT 2555, -- ~7 years for compliance
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ADD SIGNATURE STATUS TO AUDITS
-- ============================================

ALTER TABLE audits
ADD COLUMN IF NOT EXISTS requires_signature BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS signature_status signature_status DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS all_signatures_complete BOOLEAN DEFAULT false;

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_audit_signatures_audit_id ON audit_signatures(audit_id);
CREATE INDEX IF NOT EXISTS idx_audit_signatures_signer_id ON audit_signatures(signer_id);
CREATE INDEX IF NOT EXISTS idx_audit_signatures_status ON audit_signatures(status);
CREATE INDEX IF NOT EXISTS idx_action_signatures_action_id ON action_signatures(action_id);
CREATE INDEX IF NOT EXISTS idx_signature_requirements_org_id ON signature_requirements(organization_id);

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE audit_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE signature_requirements ENABLE ROW LEVEL SECURITY;

-- Audit signatures policies
DROP POLICY IF EXISTS "audit_signatures_select" ON audit_signatures;
CREATE POLICY "audit_signatures_select" ON audit_signatures
  FOR SELECT
  USING (
    audit_id IN (
      SELECT id FROM audits WHERE organization_id IN (SELECT get_user_organization_ids())
    )
  );

DROP POLICY IF EXISTS "audit_signatures_insert" ON audit_signatures;
CREATE POLICY "audit_signatures_insert" ON audit_signatures
  FOR INSERT
  WITH CHECK (
    audit_id IN (
      SELECT id FROM audits WHERE organization_id IN (SELECT get_user_organization_ids())
    )
  );

DROP POLICY IF EXISTS "audit_signatures_update" ON audit_signatures;
CREATE POLICY "audit_signatures_update" ON audit_signatures
  FOR UPDATE
  USING (
    audit_id IN (
      SELECT id FROM audits WHERE organization_id IN (SELECT get_user_organization_ids())
    )
  );

-- Action signatures policies
DROP POLICY IF EXISTS "action_signatures_select" ON action_signatures;
CREATE POLICY "action_signatures_select" ON action_signatures
  FOR SELECT
  USING (
    action_id IN (
      SELECT id FROM actions WHERE organization_id IN (SELECT get_user_organization_ids())
    )
  );

DROP POLICY IF EXISTS "action_signatures_insert" ON action_signatures;
CREATE POLICY "action_signatures_insert" ON action_signatures
  FOR INSERT
  WITH CHECK (
    action_id IN (
      SELECT id FROM actions WHERE organization_id IN (SELECT get_user_organization_ids())
    )
  );

DROP POLICY IF EXISTS "action_signatures_update" ON action_signatures;
CREATE POLICY "action_signatures_update" ON action_signatures
  FOR UPDATE
  USING (
    action_id IN (
      SELECT id FROM actions WHERE organization_id IN (SELECT get_user_organization_ids())
    )
  );

-- Signature requirements policies
DROP POLICY IF EXISTS "signature_requirements_select" ON signature_requirements;
CREATE POLICY "signature_requirements_select" ON signature_requirements
  FOR SELECT
  USING (organization_id IN (SELECT get_user_organization_ids()));

DROP POLICY IF EXISTS "signature_requirements_insert" ON signature_requirements;
CREATE POLICY "signature_requirements_insert" ON signature_requirements
  FOR INSERT
  WITH CHECK (organization_id IN (SELECT get_user_organization_ids()));

DROP POLICY IF EXISTS "signature_requirements_update" ON signature_requirements;
CREATE POLICY "signature_requirements_update" ON signature_requirements
  FOR UPDATE
  USING (organization_id IN (SELECT get_user_organization_ids()));

-- Service role bypass (for server actions)
DROP POLICY IF EXISTS "service_role_audit_signatures" ON audit_signatures;
CREATE POLICY "service_role_audit_signatures" ON audit_signatures
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_action_signatures" ON action_signatures;
CREATE POLICY "service_role_action_signatures" ON action_signatures
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_signature_requirements" ON signature_requirements;
CREATE POLICY "service_role_signature_requirements" ON signature_requirements
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- FUNCTION: Generate Signature Hash
-- ============================================

CREATE OR REPLACE FUNCTION generate_signature_hash(
  p_audit_id UUID,
  p_signer_id UUID,
  p_signature_data TEXT,
  p_timestamp TIMESTAMPTZ
)
RETURNS VARCHAR AS $$
BEGIN
  RETURN encode(
    sha256(
      (COALESCE(p_audit_id::TEXT, '') || 
       COALESCE(p_signer_id::TEXT, '') || 
       COALESCE(LEFT(p_signature_data, 100), '') || 
       COALESCE(p_timestamp::TEXT, ''))::bytea
    ),
    'hex'
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNCTION: Sign Audit
-- ============================================

CREATE OR REPLACE FUNCTION sign_audit(
  p_audit_id UUID,
  p_signer_id UUID,
  p_signature_type signature_type,
  p_signature_data TEXT,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_signature_id UUID;
  v_signer RECORD;
  v_hash VARCHAR;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  -- Get signer details
  SELECT id, full_name, email, role INTO v_signer
  FROM users WHERE id = p_signer_id;
  
  IF v_signer.id IS NULL THEN
    RAISE EXCEPTION 'Signer not found';
  END IF;
  
  -- Generate hash
  v_hash := generate_signature_hash(p_audit_id, p_signer_id, p_signature_data, v_now);
  
  -- Create signature record
  INSERT INTO audit_signatures (
    audit_id,
    signer_id,
    signer_name,
    signer_email,
    signer_role,
    signature_type,
    status,
    signature_data,
    signature_hash,
    ip_address,
    user_agent,
    signed_at
  ) VALUES (
    p_audit_id,
    p_signer_id,
    v_signer.full_name,
    v_signer.email,
    v_signer.role::TEXT,
    p_signature_type,
    'signed',
    p_signature_data,
    v_hash,
    p_ip_address,
    p_user_agent,
    v_now
  )
  RETURNING id INTO v_signature_id;
  
  -- Update audit signature status
  UPDATE audits
  SET signature_status = 'signed',
      all_signatures_complete = (
        SELECT NOT EXISTS (
          SELECT 1 FROM audit_signatures 
          WHERE audit_id = p_audit_id AND status = 'pending'
        )
      )
  WHERE id = p_audit_id;
  
  RETURN v_signature_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGER: Check signature requirements on audit completion
-- ============================================

CREATE OR REPLACE FUNCTION check_signature_requirements()
RETURNS TRIGGER AS $$
DECLARE
  v_requirements RECORD;
BEGIN
  -- Only check when audit is completed
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Get organization's signature requirements
    SELECT * INTO v_requirements
    FROM signature_requirements
    WHERE organization_id = NEW.organization_id
    LIMIT 1;
    
    IF v_requirements.id IS NOT NULL THEN
      -- Check if signature is required
      IF v_requirements.require_inspector_signature OR 
         (v_requirements.require_on_failed_audits AND NOT NEW.passed) OR
         (v_requirements.require_on_critical_findings AND NEW.critical_failures > 0) THEN
        NEW.requires_signature := true;
        NEW.signature_status := 'pending';
        
        -- Create pending signature request for inspector
        IF v_requirements.require_inspector_signature THEN
          INSERT INTO audit_signatures (
            audit_id,
            signer_id,
            signer_name,
            signature_type,
            status,
            expires_at
          )
          SELECT 
            NEW.id,
            NEW.inspector_id,
            u.full_name,
            'inspector',
            'pending',
            NOW() + (v_requirements.signature_expiry_days || ' days')::INTERVAL
          FROM users u WHERE u.id = NEW.inspector_id
          ON CONFLICT DO NOTHING;
        END IF;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_check_signature_requirements ON audits;
CREATE TRIGGER trigger_check_signature_requirements
  BEFORE UPDATE ON audits
  FOR EACH ROW
  EXECUTE FUNCTION check_signature_requirements();

-- ============================================
-- VIEW: Pending Signatures
-- ============================================

CREATE OR REPLACE VIEW pending_signatures AS
SELECT 
  'audit' AS entity_type,
  asig.id AS signature_id,
  asig.audit_id AS entity_id,
  a.organization_id,
  asig.signer_id,
  asig.signer_name,
  asig.signature_type,
  asig.status,
  asig.requested_at,
  asig.expires_at,
  l.name AS location_name,
  a.audit_date,
  a.pass_percentage AS score
FROM audit_signatures asig
JOIN audits a ON asig.audit_id = a.id
JOIN locations l ON a.location_id = l.id
WHERE asig.status = 'pending'

UNION ALL

SELECT 
  'action' AS entity_type,
  asig.id AS signature_id,
  asig.action_id AS entity_id,
  act.organization_id,
  asig.signer_id,
  asig.signer_name,
  asig.signature_type,
  asig.status,
  asig.requested_at,
  asig.expires_at,
  l.name AS location_name,
  act.deadline AS audit_date,
  NULL AS score
FROM action_signatures asig
JOIN actions act ON asig.action_id = act.id
JOIN locations l ON act.location_id = l.id
WHERE asig.status = 'pending';


