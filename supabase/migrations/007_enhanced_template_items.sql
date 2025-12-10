-- ============================================
-- MIGRATION: Enhanced Template Items
-- Adds urgency, deadline, and description fields
-- ============================================

-- Add description to categories if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'audit_template_categories' 
    AND column_name = 'description'
  ) THEN
    ALTER TABLE audit_template_categories ADD COLUMN description TEXT;
  END IF;
END $$;

-- Add action_urgency to template items if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'audit_template_items' 
    AND column_name = 'action_urgency'
  ) THEN
    ALTER TABLE audit_template_items ADD COLUMN action_urgency VARCHAR(20) DEFAULT 'medium';
  END IF;
END $$;

-- Add action_deadline_days to template items if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'audit_template_items' 
    AND column_name = 'action_deadline_days'
  ) THEN
    ALTER TABLE audit_template_items ADD COLUMN action_deadline_days INTEGER DEFAULT 7;
  END IF;
END $$;

-- Add audit_result_id to actions if not exists (for linking back to specific failed item)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'actions' 
    AND column_name = 'audit_result_id'
  ) THEN
    ALTER TABLE actions ADD COLUMN audit_result_id UUID REFERENCES audit_results(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_audit_template_items_category_id ON audit_template_items(category_id);
CREATE INDEX IF NOT EXISTS idx_actions_audit_result_id ON actions(audit_result_id);

-- ============================================
-- HELPER FUNCTION: Calculate Weighted Score
-- ============================================

CREATE OR REPLACE FUNCTION calculate_weighted_audit_score(p_audit_id UUID)
RETURNS TABLE (
  total_score NUMERIC,
  max_score NUMERIC,
  pass_percentage NUMERIC,
  passed BOOLEAN
) AS $$
DECLARE
  v_total_score NUMERIC := 0;
  v_max_score NUMERIC := 0;
  v_percentage NUMERIC;
  v_threshold NUMERIC;
  v_result RECORD;
BEGIN
  -- Get pass threshold from template
  SELECT COALESCE(at.pass_threshold, 70)
  INTO v_threshold
  FROM audits a
  LEFT JOIN audit_templates at ON a.template_id = at.id
  WHERE a.id = p_audit_id;

  -- Calculate weighted scores
  FOR v_result IN
    SELECT 
      ar.result,
      COALESCE(ati.weight, 1) * COALESCE(atc.weight, 1) as combined_weight
    FROM audit_results ar
    LEFT JOIN audit_template_items ati ON ar.template_item_id = ati.id
    LEFT JOIN audit_template_categories atc ON ati.category_id = atc.id
    WHERE ar.audit_id = p_audit_id
  LOOP
    IF v_result.result != 'na' THEN
      v_max_score := v_max_score + v_result.combined_weight;
      IF v_result.result = 'pass' THEN
        v_total_score := v_total_score + v_result.combined_weight;
      END IF;
    END IF;
  END LOOP;

  -- Calculate percentage
  IF v_max_score > 0 THEN
    v_percentage := ROUND((v_total_score / v_max_score) * 100, 2);
  ELSE
    v_percentage := 0;
  END IF;

  RETURN QUERY SELECT 
    v_total_score,
    v_max_score,
    v_percentage,
    v_percentage >= COALESCE(v_threshold, 70);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- UPDATE: Existing template items with defaults
-- ============================================

-- Set default action_urgency for existing items
UPDATE audit_template_items 
SET action_urgency = 'medium' 
WHERE action_urgency IS NULL;

-- Set default action_deadline_days for existing items
UPDATE audit_template_items 
SET action_deadline_days = 7 
WHERE action_deadline_days IS NULL;

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON COLUMN audit_template_items.action_urgency IS 'Urgency level for actions created from this item: low, medium, high, critical';
COMMENT ON COLUMN audit_template_items.action_deadline_days IS 'Number of days to resolve when action is created from this item';
COMMENT ON COLUMN audit_template_categories.description IS 'Optional description for the category';
COMMENT ON COLUMN actions.audit_result_id IS 'Reference to the specific audit result that created this action';
