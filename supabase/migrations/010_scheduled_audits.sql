-- ============================================
-- AuditFlow Scheduled/Recurring Audits
-- Version: 1.0.0
-- Plan and schedule recurring audits
-- ============================================

-- Recurrence Pattern Enum
DO $$ BEGIN
  CREATE TYPE recurrence_pattern AS ENUM (
    'once',      -- One-time scheduled audit
    'daily',
    'weekly',
    'biweekly',
    'monthly',
    'quarterly',
    'yearly'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Scheduled Audits Table
CREATE TABLE IF NOT EXISTS scheduled_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Which template and location
  template_id UUID NOT NULL REFERENCES audit_templates(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  
  -- Schedule details
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Recurrence settings
  recurrence recurrence_pattern NOT NULL DEFAULT 'monthly',
  start_date DATE NOT NULL,
  end_date DATE, -- NULL = no end date
  
  -- Specific day settings
  day_of_week INTEGER, -- 0 = Sunday, 6 = Saturday (for weekly)
  day_of_month INTEGER, -- 1-31 (for monthly)
  
  -- Time window for audit completion
  time_window_days INTEGER DEFAULT 3, -- Days to complete after scheduled date
  
  -- Notification settings
  reminder_days_before INTEGER DEFAULT 1, -- Days before to send reminder
  notify_inspector BOOLEAN DEFAULT true,
  notify_manager BOOLEAN DEFAULT true,
  
  -- Assignment
  default_inspector_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  last_generated_date DATE, -- Track last audit generated
  next_scheduled_date DATE, -- Pre-calculated next date
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by_id UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Scheduled Audit Instances (generated audits from schedule)
CREATE TABLE IF NOT EXISTS scheduled_audit_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_audit_id UUID NOT NULL REFERENCES scheduled_audits(id) ON DELETE CASCADE,
  audit_id UUID REFERENCES audits(id) ON DELETE SET NULL, -- Links to actual audit when created
  
  -- Instance details
  scheduled_date DATE NOT NULL,
  due_date DATE NOT NULL, -- scheduled_date + time_window_days
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'created', 'completed', 'missed', 'skipped'
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  -- Ensure no duplicate instances
  UNIQUE(scheduled_audit_id, scheduled_date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_scheduled_audits_org_id ON scheduled_audits(organization_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_audits_location_id ON scheduled_audits(location_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_audits_template_id ON scheduled_audits(template_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_audits_next_date ON scheduled_audits(next_scheduled_date) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_scheduled_audits_active ON scheduled_audits(organization_id, is_active);

CREATE INDEX IF NOT EXISTS idx_scheduled_instances_schedule_id ON scheduled_audit_instances(scheduled_audit_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_instances_audit_id ON scheduled_audit_instances(audit_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_instances_status ON scheduled_audit_instances(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_instances_due_date ON scheduled_audit_instances(due_date) WHERE status = 'pending';

-- Enable RLS
ALTER TABLE scheduled_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_audit_instances ENABLE ROW LEVEL SECURITY;

-- RLS Policies for scheduled_audits
CREATE POLICY "Users can view org scheduled audits" ON scheduled_audits
  FOR SELECT
  USING (
    organization_id IN (SELECT get_user_organization_ids(auth.jwt() ->> 'sub'))
  );

CREATE POLICY "Admins can manage scheduled audits" ON scheduled_audits
  FOR ALL
  USING (
    is_org_admin(auth.jwt() ->> 'sub', organization_id)
  );

-- RLS Policies for scheduled_audit_instances
CREATE POLICY "Users can view org scheduled instances" ON scheduled_audit_instances
  FOR SELECT
  USING (
    scheduled_audit_id IN (
      SELECT id FROM scheduled_audits 
      WHERE organization_id IN (SELECT get_user_organization_ids(auth.jwt() ->> 'sub'))
    )
  );

-- Service role access
CREATE POLICY "Service role full access scheduled_audits" ON scheduled_audits
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access scheduled_instances" ON scheduled_audit_instances
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================
-- Helper Function: Calculate Next Scheduled Date
-- ============================================

CREATE OR REPLACE FUNCTION calculate_next_scheduled_date(
  p_recurrence recurrence_pattern,
  p_start_date DATE,
  p_end_date DATE,
  p_last_date DATE,
  p_day_of_week INTEGER DEFAULT NULL,
  p_day_of_month INTEGER DEFAULT NULL
)
RETURNS DATE AS $$
DECLARE
  v_next_date DATE;
  v_current_date DATE := COALESCE(p_last_date, p_start_date - INTERVAL '1 day');
BEGIN
  -- Calculate next date based on recurrence
  CASE p_recurrence
    WHEN 'once' THEN
      IF p_last_date IS NULL THEN
        v_next_date := p_start_date;
      ELSE
        v_next_date := NULL;
      END IF;
      
    WHEN 'daily' THEN
      v_next_date := v_current_date + INTERVAL '1 day';
      
    WHEN 'weekly' THEN
      v_next_date := v_current_date + INTERVAL '1 week';
      -- Adjust to specific day of week if set
      IF p_day_of_week IS NOT NULL THEN
        v_next_date := v_next_date + (p_day_of_week - EXTRACT(DOW FROM v_next_date))::INTEGER;
        IF v_next_date <= v_current_date THEN
          v_next_date := v_next_date + INTERVAL '1 week';
        END IF;
      END IF;
      
    WHEN 'biweekly' THEN
      v_next_date := v_current_date + INTERVAL '2 weeks';
      
    WHEN 'monthly' THEN
      v_next_date := v_current_date + INTERVAL '1 month';
      -- Adjust to specific day of month if set
      IF p_day_of_month IS NOT NULL THEN
        v_next_date := DATE_TRUNC('month', v_next_date) + (p_day_of_month - 1)::INTEGER;
        -- Handle months with fewer days
        IF p_day_of_month > EXTRACT(DAY FROM (DATE_TRUNC('month', v_next_date) + INTERVAL '1 month' - INTERVAL '1 day')) THEN
          v_next_date := DATE_TRUNC('month', v_next_date) + INTERVAL '1 month' - INTERVAL '1 day';
        END IF;
      END IF;
      
    WHEN 'quarterly' THEN
      v_next_date := v_current_date + INTERVAL '3 months';
      
    WHEN 'yearly' THEN
      v_next_date := v_current_date + INTERVAL '1 year';
      
    ELSE
      v_next_date := NULL;
  END CASE;
  
  -- Ensure date is not before start date
  IF v_next_date IS NOT NULL AND v_next_date < p_start_date THEN
    v_next_date := p_start_date;
  END IF;
  
  -- Check if past end date
  IF v_next_date IS NOT NULL AND p_end_date IS NOT NULL AND v_next_date > p_end_date THEN
    v_next_date := NULL;
  END IF;
  
  RETURN v_next_date;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Trigger: Update next_scheduled_date
-- ============================================

CREATE OR REPLACE FUNCTION update_next_scheduled_date()
RETURNS TRIGGER AS $$
BEGIN
  NEW.next_scheduled_date := calculate_next_scheduled_date(
    NEW.recurrence,
    NEW.start_date,
    NEW.end_date,
    NEW.last_generated_date,
    NEW.day_of_week,
    NEW.day_of_month
  );
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_next_scheduled ON scheduled_audits;
CREATE TRIGGER trigger_update_next_scheduled
  BEFORE INSERT OR UPDATE OF recurrence, start_date, end_date, last_generated_date, day_of_week, day_of_month, is_active
  ON scheduled_audits
  FOR EACH ROW
  EXECUTE FUNCTION update_next_scheduled_date();

-- ============================================
-- View: Scheduled Audits with Details
-- ============================================

CREATE OR REPLACE VIEW scheduled_audits_with_details AS
SELECT 
  sa.*,
  l.name as location_name,
  l.city as location_city,
  at.name as template_name,
  u.full_name as inspector_name,
  u.email as inspector_email,
  (
    SELECT COUNT(*) FROM scheduled_audit_instances sai 
    WHERE sai.scheduled_audit_id = sa.id AND sai.status = 'completed'
  ) as completed_count,
  (
    SELECT COUNT(*) FROM scheduled_audit_instances sai 
    WHERE sai.scheduled_audit_id = sa.id AND sai.status = 'missed'
  ) as missed_count
FROM scheduled_audits sa
LEFT JOIN locations l ON sa.location_id = l.id
LEFT JOIN audit_templates at ON sa.template_id = at.id
LEFT JOIN users u ON sa.default_inspector_id = u.id;

-- ============================================
-- Function: Generate Due Audit Instances
-- Called by cron job or manually
-- ============================================

CREATE OR REPLACE FUNCTION generate_due_audit_instances()
RETURNS INTEGER AS $$
DECLARE
  v_scheduled RECORD;
  v_count INTEGER := 0;
BEGIN
  -- Find all active schedules where next date is today or in the past
  FOR v_scheduled IN
    SELECT * FROM scheduled_audits
    WHERE is_active = true
      AND next_scheduled_date IS NOT NULL
      AND next_scheduled_date <= CURRENT_DATE
  LOOP
    -- Create instance if not exists
    INSERT INTO scheduled_audit_instances (
      scheduled_audit_id,
      scheduled_date,
      due_date,
      status
    ) VALUES (
      v_scheduled.id,
      v_scheduled.next_scheduled_date,
      v_scheduled.next_scheduled_date + v_scheduled.time_window_days,
      'pending'
    )
    ON CONFLICT (scheduled_audit_id, scheduled_date) DO NOTHING;
    
    -- Update last generated date
    UPDATE scheduled_audits
    SET last_generated_date = v_scheduled.next_scheduled_date
    WHERE id = v_scheduled.id;
    
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Comments
-- ============================================

COMMENT ON TABLE scheduled_audits IS 'Recurring audit schedules for automated planning';
COMMENT ON TABLE scheduled_audit_instances IS 'Individual instances generated from schedules';
COMMENT ON COLUMN scheduled_audits.time_window_days IS 'Number of days to complete audit after scheduled date';
COMMENT ON COLUMN scheduled_audits.next_scheduled_date IS 'Pre-calculated next audit date for efficient querying';
