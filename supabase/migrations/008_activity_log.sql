-- ============================================
-- AuditFlow Activity Log / Audit Trail
-- Version: 1.0.0
-- Professional compliance tracking
-- ============================================

-- Activity Log Table - Tracks all changes for compliance
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Who performed the action
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_email TEXT,
  user_name TEXT,
  
  -- What action was performed
  action_type VARCHAR(50) NOT NULL, -- 'create', 'update', 'delete', 'complete', 'verify', 'assign', 'comment'
  
  -- What entity was affected
  entity_type VARCHAR(50) NOT NULL, -- 'audit', 'action', 'location', 'template', 'user', 'organization'
  entity_id UUID,
  entity_name TEXT, -- Human-readable name for display
  
  -- Details of the change
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}', -- Additional context (old_value, new_value, etc.)
  
  -- IP and device info (for security)
  ip_address INET,
  user_agent TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_activity_log_org_id ON activity_log(organization_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_entity ON activity_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_action_type ON activity_log(action_type);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at DESC);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_activity_log_org_created ON activity_log(organization_id, created_at DESC);

-- Enable RLS
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Users can view activity in their organization
CREATE POLICY "Users can view org activity" ON activity_log
  FOR SELECT
  USING (
    organization_id IN (SELECT get_user_organization_ids(auth.jwt() ->> 'sub'))
  );

-- Service role can insert activity (for webhook/server actions)
CREATE POLICY "Service role full access to activity_log" ON activity_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- Helper Function: Log Activity
-- ============================================

CREATE OR REPLACE FUNCTION log_activity(
  p_org_id UUID,
  p_user_id UUID,
  p_user_email TEXT,
  p_user_name TEXT,
  p_action_type VARCHAR(50),
  p_entity_type VARCHAR(50),
  p_entity_id UUID,
  p_entity_name TEXT,
  p_description TEXT,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_activity_id UUID;
BEGIN
  INSERT INTO activity_log (
    organization_id,
    user_id,
    user_email,
    user_name,
    action_type,
    entity_type,
    entity_id,
    entity_name,
    description,
    metadata
  ) VALUES (
    p_org_id,
    p_user_id,
    p_user_email,
    p_user_name,
    p_action_type,
    p_entity_type,
    p_entity_id,
    p_entity_name,
    p_description,
    p_metadata
  )
  RETURNING id INTO v_activity_id;
  
  RETURN v_activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Automatic Activity Logging Triggers
-- ============================================

-- Trigger function for audit changes
CREATE OR REPLACE FUNCTION trigger_log_audit_activity()
RETURNS TRIGGER AS $$
DECLARE
  v_action_type VARCHAR(50);
  v_description TEXT;
  v_metadata JSONB;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action_type := 'create';
    v_description := 'Audit created';
    v_metadata := jsonb_build_object('status', NEW.status);
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != NEW.status THEN
      IF NEW.status = 'completed' THEN
        v_action_type := 'complete';
        v_description := 'Audit completed with score ' || ROUND(NEW.pass_percentage::numeric, 0) || '%';
        v_metadata := jsonb_build_object(
          'old_status', OLD.status,
          'new_status', NEW.status,
          'pass_percentage', NEW.pass_percentage,
          'passed', NEW.passed
        );
      ELSE
        v_action_type := 'update';
        v_description := 'Audit status changed from ' || OLD.status || ' to ' || NEW.status;
        v_metadata := jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status);
      END IF;
    ELSE
      RETURN NEW;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    v_action_type := 'delete';
    v_description := 'Audit deleted';
    v_metadata := jsonb_build_object('status', OLD.status);
  END IF;
  
  -- Insert activity log
  INSERT INTO activity_log (
    organization_id,
    user_id,
    action_type,
    entity_type,
    entity_id,
    description,
    metadata
  ) VALUES (
    COALESCE(NEW.organization_id, OLD.organization_id),
    COALESCE(NEW.inspector_id, OLD.inspector_id),
    v_action_type,
    'audit',
    COALESCE(NEW.id, OLD.id),
    v_description,
    v_metadata
  );
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for audits
DROP TRIGGER IF EXISTS trigger_audit_activity ON audits;
CREATE TRIGGER trigger_audit_activity
  AFTER INSERT OR UPDATE OF status OR DELETE ON audits
  FOR EACH ROW
  EXECUTE FUNCTION trigger_log_audit_activity();

-- Trigger function for action changes
CREATE OR REPLACE FUNCTION trigger_log_action_activity()
RETURNS TRIGGER AS $$
DECLARE
  v_action_type VARCHAR(50);
  v_description TEXT;
  v_metadata JSONB;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action_type := 'create';
    v_description := 'Action created: ' || NEW.title;
    v_metadata := jsonb_build_object('urgency', NEW.urgency, 'deadline', NEW.deadline);
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != NEW.status THEN
      IF NEW.status = 'completed' THEN
        v_action_type := 'complete';
        v_description := 'Action marked as completed';
      ELSIF NEW.status = 'verified' THEN
        v_action_type := 'verify';
        v_description := 'Action verified';
      ELSIF NEW.status = 'rejected' THEN
        v_action_type := 'reject';
        v_description := 'Action rejected';
      ELSE
        v_action_type := 'update';
        v_description := 'Action status changed to ' || NEW.status;
      END IF;
      v_metadata := jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status);
    ELSIF OLD.assigned_to_id IS DISTINCT FROM NEW.assigned_to_id THEN
      v_action_type := 'assign';
      v_description := 'Action reassigned';
      v_metadata := jsonb_build_object('old_assigned', OLD.assigned_to_id, 'new_assigned', NEW.assigned_to_id);
    ELSE
      RETURN NEW;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    v_action_type := 'delete';
    v_description := 'Action deleted: ' || OLD.title;
    v_metadata := '{}';
  END IF;
  
  -- Insert activity log
  INSERT INTO activity_log (
    organization_id,
    action_type,
    entity_type,
    entity_id,
    entity_name,
    description,
    metadata
  ) VALUES (
    COALESCE(NEW.organization_id, OLD.organization_id),
    v_action_type,
    'action',
    COALESCE(NEW.id, OLD.id),
    COALESCE(NEW.title, OLD.title),
    v_description,
    v_metadata
  );
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for actions
DROP TRIGGER IF EXISTS trigger_action_activity ON actions;
CREATE TRIGGER trigger_action_activity
  AFTER INSERT OR UPDATE OF status, assigned_to_id OR DELETE ON actions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_log_action_activity();

-- ============================================
-- Comments
-- ============================================

COMMENT ON TABLE activity_log IS 'Audit trail for all important actions in the system for compliance';
COMMENT ON COLUMN activity_log.action_type IS 'Type: create, update, delete, complete, verify, assign, comment, reject';
COMMENT ON COLUMN activity_log.entity_type IS 'Entity: audit, action, location, template, user, organization';
COMMENT ON COLUMN activity_log.metadata IS 'Additional context like old/new values for changes';
