-- ============================================
-- AuditFlow Action Comments / Timeline
-- Version: 1.0.0
-- Communication thread on corrective actions
-- ============================================

-- Action Comments Table
CREATE TABLE IF NOT EXISTS action_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id UUID NOT NULL REFERENCES actions(id) ON DELETE CASCADE,
  
  -- Author
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_name TEXT, -- Cached for display even if user deleted
  user_email TEXT,
  user_avatar_url TEXT,
  
  -- Comment content
  comment TEXT NOT NULL,
  
  -- Optional attachments (photos/documents)
  attachments TEXT[] DEFAULT '{}',
  
  -- Comment type for timeline
  comment_type VARCHAR(30) DEFAULT 'comment', -- 'comment', 'status_change', 'assignment', 'system'
  
  -- For system/status messages
  metadata JSONB DEFAULT '{}',
  
  -- Edit tracking
  is_edited BOOLEAN DEFAULT false,
  edited_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_action_comments_action_id ON action_comments(action_id);
CREATE INDEX IF NOT EXISTS idx_action_comments_user_id ON action_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_action_comments_created_at ON action_comments(action_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_action_comments_type ON action_comments(comment_type);

-- Enable RLS
ALTER TABLE action_comments ENABLE ROW LEVEL SECURITY;

-- Users can view comments on actions they can see
CREATE POLICY "Users can view action comments" ON action_comments
  FOR SELECT
  USING (
    action_id IN (
      SELECT id FROM actions
      WHERE organization_id IN (SELECT get_user_organization_ids(auth.jwt() ->> 'sub'))
    )
  );

-- Users can create comments on actions in their org
CREATE POLICY "Users can create comments" ON action_comments
  FOR INSERT
  WITH CHECK (
    action_id IN (
      SELECT id FROM actions
      WHERE organization_id IN (SELECT get_user_organization_ids(auth.jwt() ->> 'sub'))
    )
  );

-- Users can edit their own comments
CREATE POLICY "Users can edit own comments" ON action_comments
  FOR UPDATE
  USING (
    user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.jwt() ->> 'sub')
  );

-- Admins can delete any comment
CREATE POLICY "Admins can delete comments" ON action_comments
  FOR DELETE
  USING (
    action_id IN (
      SELECT id FROM actions
      WHERE is_org_admin(auth.jwt() ->> 'sub', organization_id)
    )
  );

-- Service role full access
CREATE POLICY "Service role full access action_comments" ON action_comments
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================
-- Helper Function: Add Comment
-- ============================================

CREATE OR REPLACE FUNCTION add_action_comment(
  p_action_id UUID,
  p_user_id UUID,
  p_comment TEXT,
  p_comment_type VARCHAR(30) DEFAULT 'comment',
  p_attachments TEXT[] DEFAULT '{}',
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_comment_id UUID;
  v_user_name TEXT;
  v_user_email TEXT;
  v_user_avatar TEXT;
BEGIN
  -- Get user info
  SELECT full_name, email, avatar_url 
  INTO v_user_name, v_user_email, v_user_avatar
  FROM users WHERE id = p_user_id;
  
  INSERT INTO action_comments (
    action_id,
    user_id,
    user_name,
    user_email,
    user_avatar_url,
    comment,
    comment_type,
    attachments,
    metadata
  ) VALUES (
    p_action_id,
    p_user_id,
    v_user_name,
    v_user_email,
    v_user_avatar,
    p_comment,
    p_comment_type,
    p_attachments,
    p_metadata
  )
  RETURNING id INTO v_comment_id;
  
  RETURN v_comment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Trigger: Auto-create status change comments
-- ============================================

CREATE OR REPLACE FUNCTION trigger_create_status_comment()
RETURNS TRIGGER AS $$
DECLARE
  v_comment TEXT;
  v_metadata JSONB;
BEGIN
  -- Only on status change
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  
  -- Build comment based on status change
  CASE NEW.status
    WHEN 'in_progress' THEN
      v_comment := 'Status changed to In Progress';
    WHEN 'completed' THEN
      v_comment := 'Action marked as Completed';
    WHEN 'verified' THEN
      v_comment := 'Action has been Verified';
    WHEN 'rejected' THEN
      v_comment := 'Action was Rejected';
    ELSE
      v_comment := 'Status changed to ' || NEW.status;
  END CASE;
  
  v_metadata := jsonb_build_object(
    'old_status', OLD.status,
    'new_status', NEW.status
  );
  
  -- Add verification notes if present
  IF NEW.status IN ('verified', 'rejected') AND NEW.verification_notes IS NOT NULL THEN
    v_comment := v_comment || ': ' || NEW.verification_notes;
  END IF;
  
  -- Insert system comment
  INSERT INTO action_comments (
    action_id,
    user_id,
    user_name,
    comment,
    comment_type,
    metadata
  ) VALUES (
    NEW.id,
    COALESCE(NEW.verified_by_id, NEW.assigned_to_id),
    'System',
    v_comment,
    'status_change',
    v_metadata
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_action_status_comment ON actions;
CREATE TRIGGER trigger_action_status_comment
  AFTER UPDATE OF status ON actions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_create_status_comment();

-- ============================================
-- Trigger: Auto-create assignment comment
-- ============================================

CREATE OR REPLACE FUNCTION trigger_create_assignment_comment()
RETURNS TRIGGER AS $$
DECLARE
  v_new_user_name TEXT;
  v_comment TEXT;
BEGIN
  -- Only when assigned_to changes
  IF OLD.assigned_to_id IS NOT DISTINCT FROM NEW.assigned_to_id THEN
    RETURN NEW;
  END IF;
  
  -- Get new assignee name
  IF NEW.assigned_to_id IS NOT NULL THEN
    SELECT full_name INTO v_new_user_name FROM users WHERE id = NEW.assigned_to_id;
    v_comment := 'Assigned to ' || COALESCE(v_new_user_name, 'Unknown');
  ELSE
    v_comment := 'Assignment removed';
  END IF;
  
  -- Insert system comment
  INSERT INTO action_comments (
    action_id,
    user_name,
    comment,
    comment_type,
    metadata
  ) VALUES (
    NEW.id,
    'System',
    v_comment,
    'assignment',
    jsonb_build_object(
      'old_assigned_to', OLD.assigned_to_id,
      'new_assigned_to', NEW.assigned_to_id
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_action_assignment_comment ON actions;
CREATE TRIGGER trigger_action_assignment_comment
  AFTER UPDATE OF assigned_to_id ON actions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_create_assignment_comment();

-- ============================================
-- View: Action Timeline
-- ============================================

CREATE OR REPLACE VIEW action_timeline AS
SELECT 
  ac.id,
  ac.action_id,
  ac.user_id,
  ac.user_name,
  ac.user_email,
  ac.user_avatar_url,
  ac.comment,
  ac.comment_type,
  ac.attachments,
  ac.metadata,
  ac.is_edited,
  ac.created_at,
  a.title as action_title,
  a.organization_id
FROM action_comments ac
JOIN actions a ON ac.action_id = a.id
ORDER BY ac.created_at DESC;

-- ============================================
-- Comments
-- ============================================

COMMENT ON TABLE action_comments IS 'Communication timeline for corrective actions';
COMMENT ON COLUMN action_comments.comment_type IS 'comment (user), status_change (auto), assignment (auto), system';
COMMENT ON COLUMN action_comments.attachments IS 'Array of attachment URLs (photos, documents)';
