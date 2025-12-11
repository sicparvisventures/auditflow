-- ============================================
-- AuditFlow Enhanced Analytics Views
-- Version: 1.0.0
-- Pre-computed analytics for dashboard
-- ============================================

-- ============================================
-- Location Performance Metrics
-- ============================================

CREATE OR REPLACE VIEW location_performance AS
SELECT 
  l.id as location_id,
  l.organization_id,
  l.name as location_name,
  l.city,
  l.manager_id,
  u.full_name as manager_name,
  
  -- Audit counts
  COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'completed') as total_audits,
  COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'completed' AND a.passed = true) as passed_audits,
  COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'completed' AND a.passed = false) as failed_audits,
  
  -- Pass rate
  CASE 
    WHEN COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'completed') > 0 
    THEN ROUND(
      (COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'completed' AND a.passed = true)::numeric / 
       COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'completed')::numeric) * 100, 1
    )
    ELSE 0 
  END as pass_rate,
  
  -- Average score
  ROUND(AVG(a.pass_percentage) FILTER (WHERE a.status = 'completed'), 1) as avg_score,
  
  -- Action counts
  COUNT(DISTINCT act.id) as total_actions,
  COUNT(DISTINCT act.id) FILTER (WHERE act.status IN ('pending', 'in_progress')) as open_actions,
  COUNT(DISTINCT act.id) FILTER (WHERE act.status = 'verified') as verified_actions,
  COUNT(DISTINCT act.id) FILTER (WHERE act.deadline < CURRENT_DATE AND act.status NOT IN ('completed', 'verified')) as overdue_actions,
  
  -- Recent activity
  MAX(a.audit_date) FILTER (WHERE a.status = 'completed') as last_audit_date,
  MIN(a.audit_date) FILTER (WHERE a.status = 'completed') as first_audit_date,
  
  -- Trend (last 3 audits average vs previous 3)
  (
    SELECT ROUND(AVG(pass_percentage), 1)
    FROM (
      SELECT pass_percentage FROM audits 
      WHERE location_id = l.id AND status = 'completed'
      ORDER BY audit_date DESC LIMIT 3
    ) recent
  ) as recent_avg_score

FROM locations l
LEFT JOIN users u ON l.manager_id = u.id
LEFT JOIN audits a ON l.id = a.location_id
LEFT JOIN actions act ON l.id = act.location_id
GROUP BY l.id, l.organization_id, l.name, l.city, l.manager_id, u.full_name;

-- ============================================
-- Monthly Audit Statistics
-- ============================================

CREATE OR REPLACE VIEW monthly_audit_stats AS
SELECT 
  organization_id,
  DATE_TRUNC('month', audit_date)::DATE as month,
  COUNT(*) as total_audits,
  COUNT(*) FILTER (WHERE passed = true) as passed_audits,
  COUNT(*) FILTER (WHERE passed = false) as failed_audits,
  ROUND(AVG(pass_percentage), 1) as avg_score,
  CASE 
    WHEN COUNT(*) > 0 
    THEN ROUND((COUNT(*) FILTER (WHERE passed = true)::numeric / COUNT(*)::numeric) * 100, 1)
    ELSE 0 
  END as pass_rate
FROM audits
WHERE status = 'completed'
GROUP BY organization_id, DATE_TRUNC('month', audit_date)
ORDER BY month DESC;

-- ============================================
-- Weekly Audit Statistics
-- ============================================

CREATE OR REPLACE VIEW weekly_audit_stats AS
SELECT 
  organization_id,
  DATE_TRUNC('week', audit_date)::DATE as week,
  COUNT(*) as total_audits,
  COUNT(*) FILTER (WHERE passed = true) as passed_audits,
  COUNT(*) FILTER (WHERE passed = false) as failed_audits,
  ROUND(AVG(pass_percentage), 1) as avg_score
FROM audits
WHERE status = 'completed'
GROUP BY organization_id, DATE_TRUNC('week', audit_date)
ORDER BY week DESC;

-- ============================================
-- Action Status Distribution
-- ============================================

CREATE OR REPLACE VIEW action_status_distribution AS
SELECT 
  organization_id,
  status,
  urgency,
  COUNT(*) as count,
  COUNT(*) FILTER (WHERE deadline < CURRENT_DATE) as overdue_count
FROM actions
GROUP BY organization_id, status, urgency;

-- ============================================
-- Inspector Performance
-- ============================================

CREATE OR REPLACE VIEW inspector_performance AS
SELECT 
  a.organization_id,
  a.inspector_id,
  u.full_name as inspector_name,
  u.email as inspector_email,
  u.avatar_url,
  
  -- Audit counts
  COUNT(*) FILTER (WHERE a.status = 'completed') as total_audits,
  COUNT(*) FILTER (WHERE a.status = 'completed' AND a.passed = true) as passed_audits,
  
  -- Average scores
  ROUND(AVG(a.pass_percentage) FILTER (WHERE a.status = 'completed'), 1) as avg_score,
  
  -- This month stats
  COUNT(*) FILTER (
    WHERE a.status = 'completed' 
    AND a.audit_date >= DATE_TRUNC('month', CURRENT_DATE)
  ) as audits_this_month,
  
  -- Completion rate
  CASE 
    WHEN COUNT(*) FILTER (WHERE a.status = 'completed') > 0 
    THEN ROUND(
      (COUNT(*) FILTER (WHERE a.status = 'completed' AND a.passed = true)::numeric / 
       COUNT(*) FILTER (WHERE a.status = 'completed')::numeric) * 100, 1
    )
    ELSE 0 
  END as pass_rate,
  
  -- Activity
  MAX(a.audit_date) as last_audit_date,
  COUNT(DISTINCT a.location_id) as locations_audited

FROM audits a
JOIN users u ON a.inspector_id = u.id
GROUP BY a.organization_id, a.inspector_id, u.full_name, u.email, u.avatar_url;

-- ============================================
-- Category Performance (which checklist categories fail most)
-- ============================================

CREATE OR REPLACE VIEW category_performance AS
SELECT 
  at.organization_id,
  atc.id as category_id,
  atc.name as category_name,
  at.id as template_id,
  at.name as template_name,
  
  -- Total items checked
  COUNT(ar.id) as total_checks,
  COUNT(ar.id) FILTER (WHERE ar.result = 'pass') as passed_checks,
  COUNT(ar.id) FILTER (WHERE ar.result = 'fail') as failed_checks,
  COUNT(ar.id) FILTER (WHERE ar.result = 'na') as na_checks,
  
  -- Pass rate
  CASE 
    WHEN COUNT(ar.id) FILTER (WHERE ar.result != 'na') > 0 
    THEN ROUND(
      (COUNT(ar.id) FILTER (WHERE ar.result = 'pass')::numeric / 
       COUNT(ar.id) FILTER (WHERE ar.result != 'na')::numeric) * 100, 1
    )
    ELSE 0 
  END as pass_rate

FROM audit_templates at
JOIN audit_template_categories atc ON at.id = atc.template_id
JOIN audit_template_items ati ON atc.id = ati.category_id
LEFT JOIN audit_results ar ON ati.id = ar.template_item_id
GROUP BY at.organization_id, atc.id, atc.name, at.id, at.name
ORDER BY pass_rate ASC;

-- ============================================
-- Most Failed Items
-- ============================================

CREATE OR REPLACE VIEW most_failed_items AS
SELECT 
  at.organization_id,
  ati.id as item_id,
  ati.title as item_title,
  atc.name as category_name,
  at.name as template_name,
  
  COUNT(ar.id) as total_checks,
  COUNT(ar.id) FILTER (WHERE ar.result = 'fail') as fail_count,
  
  -- Fail rate
  CASE 
    WHEN COUNT(ar.id) FILTER (WHERE ar.result != 'na') > 0 
    THEN ROUND(
      (COUNT(ar.id) FILTER (WHERE ar.result = 'fail')::numeric / 
       COUNT(ar.id) FILTER (WHERE ar.result != 'na')::numeric) * 100, 1
    )
    ELSE 0 
  END as fail_rate

FROM audit_templates at
JOIN audit_template_categories atc ON at.id = atc.template_id
JOIN audit_template_items ati ON atc.id = ati.category_id
LEFT JOIN audit_results ar ON ati.id = ar.template_item_id
GROUP BY at.organization_id, ati.id, ati.title, atc.name, at.name
HAVING COUNT(ar.id) FILTER (WHERE ar.result = 'fail') > 0
ORDER BY fail_count DESC, fail_rate DESC;

-- ============================================
-- Dashboard Summary View
-- ============================================

CREATE OR REPLACE VIEW dashboard_summary AS
SELECT 
  o.id as organization_id,
  o.name as organization_name,
  
  -- Counts
  (SELECT COUNT(*) FROM locations WHERE organization_id = o.id) as total_locations,
  (SELECT COUNT(*) FROM audits WHERE organization_id = o.id AND status = 'completed') as total_audits,
  (SELECT COUNT(*) FROM actions WHERE organization_id = o.id) as total_actions,
  
  -- This month
  (SELECT COUNT(*) FROM audits 
   WHERE organization_id = o.id 
   AND status = 'completed' 
   AND audit_date >= DATE_TRUNC('month', CURRENT_DATE)
  ) as audits_this_month,
  
  -- Open items
  (SELECT COUNT(*) FROM actions 
   WHERE organization_id = o.id 
   AND status IN ('pending', 'in_progress')
  ) as open_actions,
  
  -- Overdue
  (SELECT COUNT(*) FROM actions 
   WHERE organization_id = o.id 
   AND status NOT IN ('completed', 'verified')
   AND deadline < CURRENT_DATE
  ) as overdue_actions,
  
  -- Average score (last 30 days)
  (SELECT ROUND(AVG(pass_percentage), 1) FROM audits 
   WHERE organization_id = o.id 
   AND status = 'completed'
   AND audit_date >= CURRENT_DATE - INTERVAL '30 days'
  ) as avg_score_30d,
  
  -- Pass rate (last 30 days)
  (SELECT 
    CASE WHEN COUNT(*) > 0 
    THEN ROUND((COUNT(*) FILTER (WHERE passed = true)::numeric / COUNT(*)::numeric) * 100, 1)
    ELSE 0 END
   FROM audits 
   WHERE organization_id = o.id 
   AND status = 'completed'
   AND audit_date >= CURRENT_DATE - INTERVAL '30 days'
  ) as pass_rate_30d,
  
  -- Scheduled audits due
  (SELECT COUNT(*) FROM scheduled_audit_instances sai
   JOIN scheduled_audits sa ON sai.scheduled_audit_id = sa.id
   WHERE sa.organization_id = o.id
   AND sai.status = 'pending'
   AND sai.scheduled_date <= CURRENT_DATE
  ) as pending_scheduled_audits

FROM organizations o;

-- ============================================
-- Materialized View: Location Trends (for performance)
-- ============================================

CREATE MATERIALIZED VIEW IF NOT EXISTS location_trends AS
SELECT 
  l.id as location_id,
  l.organization_id,
  l.name as location_name,
  DATE_TRUNC('month', a.audit_date)::DATE as month,
  COUNT(*) as audit_count,
  ROUND(AVG(a.pass_percentage), 1) as avg_score,
  COUNT(*) FILTER (WHERE a.passed = true) as passed_count
FROM locations l
JOIN audits a ON l.id = a.location_id AND a.status = 'completed'
GROUP BY l.id, l.organization_id, l.name, DATE_TRUNC('month', a.audit_date);

-- Index for materialized view
CREATE INDEX IF NOT EXISTS idx_location_trends_location ON location_trends(location_id);
CREATE INDEX IF NOT EXISTS idx_location_trends_org_month ON location_trends(organization_id, month DESC);

-- Function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_location_trends()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY location_trends;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Comments
-- ============================================

COMMENT ON VIEW location_performance IS 'Pre-aggregated location performance metrics';
COMMENT ON VIEW monthly_audit_stats IS 'Monthly aggregated audit statistics';
COMMENT ON VIEW category_performance IS 'Which checklist categories fail most often';
COMMENT ON VIEW most_failed_items IS 'Most frequently failed checklist items';
COMMENT ON MATERIALIZED VIEW location_trends IS 'Historical location score trends (refresh periodically)';
