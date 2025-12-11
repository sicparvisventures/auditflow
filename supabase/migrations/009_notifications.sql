-- ============================================
-- AuditFlow In-App Notification Center
-- Version: 1.0.0
-- Real-time notifications for users
-- ============================================

-- Notification Types Enum
DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM (
    'audit_assigned',
    'audit_completed',
    'action_created',
    'action_assigned',
    'action_completed',
    'action_verified',
    'action_rejected',
    'action_overdue',
    'action_reminder',
    'scheduled_audit_reminder',
    'team_member_joined',
    'mention',
    'comment'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Notification Priority Enum
DO $$ BEGIN
  CREATE TYPE notification_priority AS ENUM ('low', 'normal', 'high', 'urgent');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Who receives the notification
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Notification content
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  priority notification_priority DEFAULT 'normal',
  
  -- Related entities (for deep linking)
  entity_type VARCHAR(50), -- 'audit', 'action', 'location', etc.
  entity_id UUID,
  
  -- Link to navigate to
  action_url TEXT,
  
  -- Status
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  
  -- Email sent status
  email_sent BOOLEAN DEFAULT false,
  email_sent_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ -- Optional expiry for temporary notifications
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_org_id ON notifications(organization_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC) 
  WHERE is_read = false;

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT
  USING (user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.jwt() ->> 'sub'));

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE
  USING (user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.jwt() ->> 'sub'));

-- Service role can manage all notifications
CREATE POLICY "Service role full access to notifications" ON notifications
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- Helper Function: Create Notification
-- ============================================

CREATE OR REPLACE FUNCTION create_notification(
  p_org_id UUID,
  p_user_id UUID,
  p_type notification_type,
  p_title TEXT,
  p_message TEXT,
  p_entity_type VARCHAR(50) DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,
  p_action_url TEXT DEFAULT NULL,
  p_priority notification_priority DEFAULT 'normal'
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO notifications (
    organization_id,
    user_id,
    type,
    title,
    message,
    entity_type,
    entity_id,
    action_url,
    priority
  ) VALUES (
    p_org_id,
    p_user_id,
    p_type,
    p_title,
    p_message,
    p_entity_type,
    p_entity_id,
    p_action_url,
    p_priority
  )
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Helper Function: Mark Notification as Read
-- ============================================

CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE notifications
  SET is_read = true, read_at = NOW()
  WHERE id = p_notification_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Helper Function: Mark All Notifications as Read
-- ============================================

CREATE OR REPLACE FUNCTION mark_all_notifications_read(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE notifications
  SET is_read = true, read_at = NOW()
  WHERE user_id = p_user_id AND is_read = false;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Helper Function: Get Unread Count
-- ============================================

CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER INTO v_count
  FROM notifications
  WHERE user_id = p_user_id 
    AND is_read = false
    AND (expires_at IS NULL OR expires_at > NOW());
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Automatic Notification Triggers
-- ============================================

-- Create notification when action is assigned
CREATE OR REPLACE FUNCTION trigger_notify_action_assigned()
RETURNS TRIGGER AS $$
DECLARE
  v_location_name TEXT;
BEGIN
  -- Only trigger when assigned_to changes to a new user
  IF NEW.assigned_to_id IS NOT NULL 
     AND (OLD.assigned_to_id IS NULL OR OLD.assigned_to_id != NEW.assigned_to_id) THEN
    
    -- Get location name
    SELECT name INTO v_location_name FROM locations WHERE id = NEW.location_id;
    
    -- Create notification for assigned user
    PERFORM create_notification(
      NEW.organization_id,
      NEW.assigned_to_id,
      'action_assigned',
      'New Action Assigned',
      'You have been assigned: ' || NEW.title || ' at ' || COALESCE(v_location_name, 'Unknown'),
      'action',
      NEW.id,
      '/dashboard/actions/' || NEW.id,
      CASE NEW.urgency
        WHEN 'critical' THEN 'urgent'::notification_priority
        WHEN 'high' THEN 'high'::notification_priority
        ELSE 'normal'::notification_priority
      END
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_action_assigned_notification ON actions;
CREATE TRIGGER trigger_action_assigned_notification
  AFTER INSERT OR UPDATE OF assigned_to_id ON actions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_notify_action_assigned();

-- ============================================
-- View: User Notifications with Details
-- ============================================

CREATE OR REPLACE VIEW notifications_with_details AS
SELECT 
  n.*,
  u.first_name as user_first_name,
  u.email as user_email
FROM notifications n
LEFT JOIN users u ON n.user_id = u.id;

-- ============================================
-- Comments
-- ============================================

COMMENT ON TABLE notifications IS 'In-app notification center for real-time updates';
COMMENT ON COLUMN notifications.priority IS 'low, normal, high, urgent - affects visual styling';
COMMENT ON COLUMN notifications.action_url IS 'Deep link URL for the notification action';
