-- ============================================
-- Migration: Trend Alerts & Performance Monitoring
-- Feature: Automated alerts when performance drops
-- ============================================

-- ============================================
-- ENUMS
-- ============================================

DO $$ BEGIN
  CREATE TYPE alert_type AS ENUM (
    'score_drop',           -- Score dropped below threshold
    'consecutive_failures', -- Multiple consecutive failed audits
    'action_overdue',       -- Actions past deadline
    'audit_overdue',        -- Scheduled audit missed
    'critical_finding',     -- Critical risk item failed
    'trend_decline',        -- Declining trend over time
    'compliance_risk',      -- Compliance score below threshold
    'safety_risk'           -- Safety score below threshold
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE alert_severity AS ENUM ('info', 'warning', 'urgent', 'critical');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE alert_status AS ENUM ('active', 'acknowledged', 'resolved', 'dismissed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- TREND ALERTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS trend_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Alert details
  alert_type alert_type NOT NULL,
  severity alert_severity NOT NULL DEFAULT 'warning',
  status alert_status NOT NULL DEFAULT 'active',
  
  -- Related entities
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
  group_id UUID REFERENCES location_groups(id) ON DELETE CASCADE,
  audit_id UUID REFERENCES audits(id) ON DELETE SET NULL,
  action_id UUID REFERENCES actions(id) ON DELETE SET NULL,
  
  -- Alert content
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  
  -- Metrics
  current_value DECIMAL(10,2),
  threshold_value DECIMAL(10,2),
  previous_value DECIMAL(10,2),
  change_percentage DECIMAL(5,2),
  
  -- Timestamps
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  resolved_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Notes
  resolution_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ALERT RULES CONFIGURATION
-- ============================================

CREATE TABLE IF NOT EXISTS alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Rule details
  name VARCHAR(255) NOT NULL,
  description TEXT,
  alert_type alert_type NOT NULL,
  is_active BOOLEAN DEFAULT true,
  
  -- Thresholds
  threshold_value DECIMAL(10,2), -- e.g., score below 70
  threshold_percentage DECIMAL(5,2), -- e.g., 10% drop
  consecutive_count INTEGER, -- e.g., 3 consecutive failures
  time_window_days INTEGER DEFAULT 30, -- Look back period
  
  -- Severity mapping
  severity alert_severity DEFAULT 'warning',
  
  -- Notification settings
  notify_admins BOOLEAN DEFAULT true,
  notify_managers BOOLEAN DEFAULT false,
  notify_email BOOLEAN DEFAULT true,
  notify_in_app BOOLEAN DEFAULT true,
  
  -- Scope
  apply_to_all_locations BOOLEAN DEFAULT true,
  location_ids UUID[] DEFAULT '{}',
  group_ids UUID[] DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ALERT SUBSCRIPTIONS (who gets what alerts)
-- ============================================

CREATE TABLE IF NOT EXISTS alert_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- What to subscribe to
  alert_types alert_type[] DEFAULT '{}', -- Empty = all types
  severity_levels alert_severity[] DEFAULT '{warning,urgent,critical}',
  
  -- Scope
  all_locations BOOLEAN DEFAULT false,
  location_ids UUID[] DEFAULT '{}',
  group_ids UUID[] DEFAULT '{}',
  
  -- Notification preferences
  email_enabled BOOLEAN DEFAULT true,
  email_digest BOOLEAN DEFAULT false, -- Daily digest instead of immediate
  push_enabled BOOLEAN DEFAULT true,
  in_app_enabled BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(organization_id, user_id)
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_trend_alerts_org_id ON trend_alerts(organization_id);
CREATE INDEX IF NOT EXISTS idx_trend_alerts_location_id ON trend_alerts(location_id);
CREATE INDEX IF NOT EXISTS idx_trend_alerts_status ON trend_alerts(status);
CREATE INDEX IF NOT EXISTS idx_trend_alerts_severity ON trend_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_trend_alerts_triggered_at ON trend_alerts(triggered_at);
CREATE INDEX IF NOT EXISTS idx_alert_rules_org_id ON alert_rules(organization_id);
CREATE INDEX IF NOT EXISTS idx_alert_subscriptions_org_id ON alert_subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_alert_subscriptions_user_id ON alert_subscriptions(user_id);

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE trend_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_subscriptions ENABLE ROW LEVEL SECURITY;

-- Trend alerts policies
DROP POLICY IF EXISTS "trend_alerts_select" ON trend_alerts;
CREATE POLICY "trend_alerts_select" ON trend_alerts
  FOR SELECT
  USING (organization_id IN (SELECT get_user_organization_ids()));

DROP POLICY IF EXISTS "trend_alerts_insert" ON trend_alerts;
CREATE POLICY "trend_alerts_insert" ON trend_alerts
  FOR INSERT
  WITH CHECK (organization_id IN (SELECT get_user_organization_ids()));

DROP POLICY IF EXISTS "trend_alerts_update" ON trend_alerts;
CREATE POLICY "trend_alerts_update" ON trend_alerts
  FOR UPDATE
  USING (organization_id IN (SELECT get_user_organization_ids()));

-- Alert rules policies
DROP POLICY IF EXISTS "alert_rules_select" ON alert_rules;
CREATE POLICY "alert_rules_select" ON alert_rules
  FOR SELECT
  USING (organization_id IN (SELECT get_user_organization_ids()));

DROP POLICY IF EXISTS "alert_rules_insert" ON alert_rules;
CREATE POLICY "alert_rules_insert" ON alert_rules
  FOR INSERT
  WITH CHECK (organization_id IN (SELECT get_user_organization_ids()));

DROP POLICY IF EXISTS "alert_rules_update" ON alert_rules;
CREATE POLICY "alert_rules_update" ON alert_rules
  FOR UPDATE
  USING (organization_id IN (SELECT get_user_organization_ids()));

DROP POLICY IF EXISTS "alert_rules_delete" ON alert_rules;
CREATE POLICY "alert_rules_delete" ON alert_rules
  FOR DELETE
  USING (organization_id IN (SELECT get_user_organization_ids()));

-- Alert subscriptions policies
DROP POLICY IF EXISTS "alert_subscriptions_select" ON alert_subscriptions;
CREATE POLICY "alert_subscriptions_select" ON alert_subscriptions
  FOR SELECT
  USING (organization_id IN (SELECT get_user_organization_ids()));

DROP POLICY IF EXISTS "alert_subscriptions_insert" ON alert_subscriptions;
CREATE POLICY "alert_subscriptions_insert" ON alert_subscriptions
  FOR INSERT
  WITH CHECK (organization_id IN (SELECT get_user_organization_ids()));

DROP POLICY IF EXISTS "alert_subscriptions_update" ON alert_subscriptions;
CREATE POLICY "alert_subscriptions_update" ON alert_subscriptions
  FOR UPDATE
  USING (organization_id IN (SELECT get_user_organization_ids()));

-- Service role bypass (for server actions)
DROP POLICY IF EXISTS "service_role_trend_alerts" ON trend_alerts;
CREATE POLICY "service_role_trend_alerts" ON trend_alerts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_alert_rules" ON alert_rules;
CREATE POLICY "service_role_alert_rules" ON alert_rules
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_alert_subscriptions" ON alert_subscriptions;
CREATE POLICY "service_role_alert_subscriptions" ON alert_subscriptions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- FUNCTION: Check and Create Score Drop Alert
-- ============================================

CREATE OR REPLACE FUNCTION check_score_drop_alert()
RETURNS TRIGGER AS $$
DECLARE
  v_prev_audit RECORD;
  v_rule RECORD;
  v_drop_percentage DECIMAL;
BEGIN
  -- Only check on completed audits
  IF NEW.status != 'completed' THEN
    RETURN NEW;
  END IF;

  -- Get previous audit for this location
  SELECT pass_percentage, audit_date INTO v_prev_audit
  FROM audits
  WHERE location_id = NEW.location_id
    AND status = 'completed'
    AND id != NEW.id
  ORDER BY audit_date DESC
  LIMIT 1;

  IF v_prev_audit.pass_percentage IS NOT NULL THEN
    v_drop_percentage := v_prev_audit.pass_percentage - NEW.pass_percentage;
    
    -- Check for significant drop (> 15%)
    IF v_drop_percentage > 15 THEN
      INSERT INTO trend_alerts (
        organization_id,
        alert_type,
        severity,
        location_id,
        audit_id,
        title,
        message,
        current_value,
        previous_value,
        threshold_value,
        change_percentage
      ) VALUES (
        NEW.organization_id,
        'score_drop',
        CASE 
          WHEN v_drop_percentage > 30 THEN 'critical'::alert_severity
          WHEN v_drop_percentage > 20 THEN 'urgent'::alert_severity
          ELSE 'warning'::alert_severity
        END,
        NEW.location_id,
        NEW.id,
        'Significant Score Drop Detected',
        format('Audit score dropped from %.1f%% to %.1f%% (%.1f%% decrease)', 
          v_prev_audit.pass_percentage, NEW.pass_percentage, v_drop_percentage),
        NEW.pass_percentage,
        v_prev_audit.pass_percentage,
        15,
        -v_drop_percentage
      );
    END IF;
  END IF;

  -- Check for consecutive failures
  IF NOT NEW.passed THEN
    DECLARE
      v_fail_count INTEGER;
    BEGIN
      SELECT COUNT(*) INTO v_fail_count
      FROM audits
      WHERE location_id = NEW.location_id
        AND status = 'completed'
        AND NOT passed
        AND audit_date >= CURRENT_DATE - INTERVAL '60 days'
      LIMIT 3;
      
      IF v_fail_count >= 3 THEN
        INSERT INTO trend_alerts (
          organization_id,
          alert_type,
          severity,
          location_id,
          audit_id,
          title,
          message,
          current_value,
          threshold_value
        ) VALUES (
          NEW.organization_id,
          'consecutive_failures',
          'urgent',
          NEW.location_id,
          NEW.id,
          'Multiple Consecutive Failed Audits',
          format('%s consecutive failed audits detected at this location', v_fail_count),
          v_fail_count,
          3
        );
      END IF;
    END;
  END IF;

  -- Check for critical findings
  IF NEW.critical_failures > 0 THEN
    INSERT INTO trend_alerts (
      organization_id,
      alert_type,
      severity,
      location_id,
      audit_id,
      title,
      message,
      current_value
    ) VALUES (
      NEW.organization_id,
      'critical_finding',
      'critical',
      NEW.location_id,
      NEW.id,
      'Critical Risk Item Failed',
      format('%s critical risk item(s) failed during this audit. Immediate attention required.', 
        NEW.critical_failures),
      NEW.critical_failures
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_check_score_alerts ON audits;
CREATE TRIGGER trigger_check_score_alerts
  AFTER INSERT OR UPDATE ON audits
  FOR EACH ROW
  EXECUTE FUNCTION check_score_drop_alert();

-- ============================================
-- FUNCTION: Check Overdue Actions
-- ============================================

CREATE OR REPLACE FUNCTION check_overdue_action_alerts()
RETURNS void AS $$
DECLARE
  v_action RECORD;
BEGIN
  -- Find actions that became overdue today and don't have an active alert
  FOR v_action IN 
    SELECT a.*, l.name AS location_name, l.group_id
    FROM actions a
    JOIN locations l ON a.location_id = l.id
    WHERE a.deadline = CURRENT_DATE - INTERVAL '1 day'
      AND a.status NOT IN ('completed', 'verified')
      AND NOT EXISTS (
        SELECT 1 FROM trend_alerts 
        WHERE action_id = a.id 
          AND alert_type = 'action_overdue' 
          AND status = 'active'
      )
  LOOP
    INSERT INTO trend_alerts (
      organization_id,
      alert_type,
      severity,
      location_id,
      group_id,
      action_id,
      title,
      message
    ) VALUES (
      v_action.organization_id,
      'action_overdue',
      CASE v_action.urgency
        WHEN 'critical' THEN 'critical'::alert_severity
        WHEN 'high' THEN 'urgent'::alert_severity
        ELSE 'warning'::alert_severity
      END,
      v_action.location_id,
      v_action.group_id,
      v_action.id,
      'Action Deadline Missed',
      format('Action "%s" at %s is now overdue', v_action.title, v_action.location_name)
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VIEW: Active Alerts Dashboard
-- ============================================

CREATE OR REPLACE VIEW active_alerts_dashboard AS
SELECT 
  ta.id,
  ta.organization_id,
  ta.alert_type,
  ta.severity,
  ta.status,
  ta.title,
  ta.message,
  ta.current_value,
  ta.threshold_value,
  ta.change_percentage,
  ta.triggered_at,
  l.name AS location_name,
  lg.name AS group_name,
  a.audit_date,
  a.pass_percentage AS audit_score
FROM trend_alerts ta
LEFT JOIN locations l ON ta.location_id = l.id
LEFT JOIN location_groups lg ON ta.group_id = lg.id
LEFT JOIN audits a ON ta.audit_id = a.id
WHERE ta.status = 'active'
ORDER BY 
  CASE ta.severity
    WHEN 'critical' THEN 1
    WHEN 'urgent' THEN 2
    WHEN 'warning' THEN 3
    ELSE 4
  END,
  ta.triggered_at DESC;

-- ============================================
-- VIEW: Alert Statistics
-- ============================================

CREATE OR REPLACE VIEW alert_statistics AS
SELECT 
  organization_id,
  COUNT(*) FILTER (WHERE status = 'active') AS active_alerts,
  COUNT(*) FILTER (WHERE status = 'active' AND severity = 'critical') AS critical_alerts,
  COUNT(*) FILTER (WHERE status = 'active' AND severity = 'urgent') AS urgent_alerts,
  COUNT(*) FILTER (WHERE status = 'active' AND severity = 'warning') AS warning_alerts,
  COUNT(*) FILTER (WHERE status = 'acknowledged') AS acknowledged_alerts,
  COUNT(*) FILTER (WHERE status = 'resolved' AND resolved_at >= CURRENT_DATE - INTERVAL '7 days') AS resolved_this_week,
  AVG(EXTRACT(EPOCH FROM (resolved_at - triggered_at))/3600) FILTER (WHERE status = 'resolved') AS avg_resolution_hours
FROM trend_alerts
GROUP BY organization_id;

-- ============================================
-- INSERT DEFAULT ALERT RULES (for new organizations)
-- ============================================

-- This function creates default alert rules for a new organization
CREATE OR REPLACE FUNCTION create_default_alert_rules(p_org_id UUID)
RETURNS void AS $$
BEGIN
  -- Score drop alert
  INSERT INTO alert_rules (organization_id, name, description, alert_type, threshold_percentage, severity)
  VALUES (p_org_id, 'Significant Score Drop', 'Alert when audit score drops more than 15%', 'score_drop', 15, 'warning')
  ON CONFLICT DO NOTHING;
  
  -- Consecutive failures alert
  INSERT INTO alert_rules (organization_id, name, description, alert_type, consecutive_count, severity)
  VALUES (p_org_id, 'Consecutive Failures', 'Alert after 3 consecutive failed audits', 'consecutive_failures', 3, 'urgent')
  ON CONFLICT DO NOTHING;
  
  -- Critical finding alert
  INSERT INTO alert_rules (organization_id, name, description, alert_type, threshold_value, severity)
  VALUES (p_org_id, 'Critical Risk Finding', 'Alert on any critical risk item failure', 'critical_finding', 1, 'critical')
  ON CONFLICT DO NOTHING;
  
  -- Compliance risk alert
  INSERT INTO alert_rules (organization_id, name, description, alert_type, threshold_value, severity)
  VALUES (p_org_id, 'Compliance Risk', 'Alert when compliance score drops below 80%', 'compliance_risk', 80, 'urgent')
  ON CONFLICT DO NOTHING;
  
  -- Safety risk alert
  INSERT INTO alert_rules (organization_id, name, description, alert_type, threshold_value, severity)
  VALUES (p_org_id, 'Safety Risk', 'Alert when safety score drops below 90%', 'safety_risk', 90, 'critical')
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql;


