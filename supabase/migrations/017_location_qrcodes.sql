-- ============================================
-- Migration: Location QR Codes
-- Feature: Generate and manage QR codes for quick audit access
-- ============================================

-- Add QR code fields to locations
ALTER TABLE locations
ADD COLUMN IF NOT EXISTS qr_code_token VARCHAR(64) UNIQUE,
ADD COLUMN IF NOT EXISTS qr_code_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS qr_code_created_at TIMESTAMPTZ;

-- ============================================
-- FUNCTION: Generate QR Token for Location
-- ============================================

CREATE OR REPLACE FUNCTION generate_location_qr_token(p_location_id UUID)
RETURNS VARCHAR AS $$
DECLARE
  v_token VARCHAR;
  v_org_id UUID;
BEGIN
  -- Get organization ID
  SELECT organization_id INTO v_org_id
  FROM locations
  WHERE id = p_location_id;
  
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Location not found';
  END IF;

  -- Generate unique token (organization prefix + random)
  v_token := encode(
    sha256(
      (p_location_id::TEXT || v_org_id::TEXT || NOW()::TEXT || random()::TEXT)::bytea
    ),
    'hex'
  );
  
  -- Take first 32 characters for shorter token
  v_token := LEFT(v_token, 32);
  
  -- Update location with token
  UPDATE locations
  SET 
    qr_code_token = v_token,
    qr_code_created_at = NOW(),
    qr_code_enabled = true
  WHERE id = p_location_id;
  
  RETURN v_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: Get Location by QR Token
-- ============================================

CREATE OR REPLACE FUNCTION get_location_by_qr_token(p_token VARCHAR)
RETURNS TABLE(
  id UUID,
  organization_id UUID,
  name VARCHAR,
  city VARCHAR,
  qr_code_enabled BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id,
    l.organization_id,
    l.name,
    l.city,
    l.qr_code_enabled
  FROM locations l
  WHERE l.qr_code_token = p_token
    AND l.status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- QR CODE SCAN LOG (for analytics)
-- ============================================

CREATE TABLE IF NOT EXISTS qr_scan_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  scanned_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Scan details
  scan_result VARCHAR(50) DEFAULT 'success', -- success, audit_started, invalid, disabled
  
  -- Device info (optional)
  ip_address INET,
  user_agent TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_locations_qr_token ON locations(qr_code_token);
CREATE INDEX IF NOT EXISTS idx_qr_scan_log_location ON qr_scan_log(location_id);
CREATE INDEX IF NOT EXISTS idx_qr_scan_log_created ON qr_scan_log(created_at);

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE qr_scan_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "qr_scan_log_select" ON qr_scan_log;
CREATE POLICY "qr_scan_log_select" ON qr_scan_log
  FOR SELECT
  USING (
    location_id IN (
      SELECT id FROM locations WHERE organization_id IN (SELECT get_user_organization_ids())
    )
  );

DROP POLICY IF EXISTS "qr_scan_log_insert" ON qr_scan_log;
CREATE POLICY "qr_scan_log_insert" ON qr_scan_log
  FOR INSERT
  WITH CHECK (true); -- Allow all inserts (for anonymous scans)

-- Service role bypass
DROP POLICY IF EXISTS "service_role_qr_scan_log" ON qr_scan_log;
CREATE POLICY "service_role_qr_scan_log" ON qr_scan_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- TRIGGER: Auto-generate QR token on location creation
-- ============================================

CREATE OR REPLACE FUNCTION auto_generate_qr_token()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.qr_code_token IS NULL THEN
    NEW.qr_code_token := LEFT(encode(sha256((NEW.id::TEXT || NOW()::TEXT || random()::TEXT)::bytea), 'hex'), 32);
    NEW.qr_code_created_at := NOW();
    NEW.qr_code_enabled := true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_qr_token ON locations;
CREATE TRIGGER trigger_auto_qr_token
  BEFORE INSERT ON locations
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_qr_token();

-- Generate tokens for existing locations that don't have one
UPDATE locations
SET 
  qr_code_token = LEFT(encode(sha256((id::TEXT || NOW()::TEXT || random()::TEXT)::bytea), 'hex'), 32),
  qr_code_created_at = NOW(),
  qr_code_enabled = true
WHERE qr_code_token IS NULL;
