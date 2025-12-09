-- ============================================
-- AuditFlow Audit Helper Functions
-- Version: 1.0.0
-- ============================================

-- Add unique constraint for audit_results if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'audit_results_audit_item_unique'
  ) THEN
    ALTER TABLE audit_results 
    ADD CONSTRAINT audit_results_audit_item_unique 
    UNIQUE (audit_id, template_item_id);
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL; -- Constraint might already exist
END $$;

-- Function to calculate audit score
CREATE OR REPLACE FUNCTION calculate_audit_score(p_audit_id UUID)
RETURNS TABLE (
  total_score INTEGER,
  max_score INTEGER,
  pass_percentage NUMERIC,
  passed BOOLEAN
) AS $$
DECLARE
  v_passed_count INTEGER;
  v_total_count INTEGER;
  v_percentage NUMERIC;
  v_threshold NUMERIC;
BEGIN
  -- Count results
  SELECT 
    COUNT(*) FILTER (WHERE result = 'pass'),
    COUNT(*) FILTER (WHERE result != 'na')
  INTO v_passed_count, v_total_count
  FROM audit_results
  WHERE audit_id = p_audit_id;
  
  -- Calculate percentage
  IF v_total_count > 0 THEN
    v_percentage := ROUND((v_passed_count::NUMERIC / v_total_count::NUMERIC) * 100, 2);
  ELSE
    v_percentage := 0;
  END IF;
  
  -- Get threshold from template
  SELECT COALESCE(at.pass_threshold, 70)
  INTO v_threshold
  FROM audits a
  LEFT JOIN audit_templates at ON a.template_id = at.id
  WHERE a.id = p_audit_id;
  
  RETURN QUERY SELECT 
    v_passed_count,
    v_total_count,
    v_percentage,
    v_percentage >= COALESCE(v_threshold, 70);
END;
$$ LANGUAGE plpgsql;

-- Function to auto-create actions for failed items
CREATE OR REPLACE FUNCTION create_actions_for_failed_items(p_audit_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_audit RECORD;
  v_failed_item RECORD;
  v_action_count INTEGER := 0;
  v_inspector_id UUID;
BEGIN
  -- Get audit details
  SELECT a.*, l.manager_id as location_manager_id
  INTO v_audit
  FROM audits a
  JOIN locations l ON a.location_id = l.id
  WHERE a.id = p_audit_id;
  
  IF v_audit IS NULL THEN
    RETURN 0;
  END IF;
  
  v_inspector_id := v_audit.inspector_id;
  
  -- Create actions for failed items
  FOR v_failed_item IN
    SELECT ar.*, ati.title as item_title, ati.creates_action_on_fail
    FROM audit_results ar
    JOIN audit_template_items ati ON ar.template_item_id = ati.id
    WHERE ar.audit_id = p_audit_id 
    AND ar.result = 'fail'
    AND ati.creates_action_on_fail = true
  LOOP
    INSERT INTO actions (
      organization_id,
      location_id,
      audit_id,
      title,
      description,
      status,
      urgency,
      assigned_to_id,
      created_by_id,
      deadline
    ) VALUES (
      v_audit.organization_id,
      v_audit.location_id,
      p_audit_id,
      v_failed_item.item_title,
      COALESCE(v_failed_item.comments, 'Item failed during audit'),
      'pending',
      'medium',
      v_audit.location_manager_id,
      v_inspector_id,
      (CURRENT_DATE + INTERVAL '7 days')::DATE
    );
    
    v_action_count := v_action_count + 1;
  END LOOP;
  
  RETURN v_action_count;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-complete audit and create actions
CREATE OR REPLACE FUNCTION on_audit_completed()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger when status changes to 'completed'
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Calculate scores
    SELECT 
      total_score,
      max_score,
      pass_percentage,
      passed
    INTO 
      NEW.total_score,
      NEW.max_score,
      NEW.pass_percentage,
      NEW.passed
    FROM calculate_audit_score(NEW.id);
    
    -- Create actions for failed items
    PERFORM create_actions_for_failed_items(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if not exists
DROP TRIGGER IF EXISTS audit_completed_trigger ON audits;
CREATE TRIGGER audit_completed_trigger
  BEFORE UPDATE ON audits
  FOR EACH ROW
  EXECUTE FUNCTION on_audit_completed();

-- ============================================
-- Index for better performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_audit_results_audit_id ON audit_results(audit_id);
CREATE INDEX IF NOT EXISTS idx_actions_audit_id ON actions(audit_id);
CREATE INDEX IF NOT EXISTS idx_actions_location_id ON actions(location_id);
CREATE INDEX IF NOT EXISTS idx_audits_organization_id ON audits(organization_id);
CREATE INDEX IF NOT EXISTS idx_audits_location_id ON audits(location_id);
