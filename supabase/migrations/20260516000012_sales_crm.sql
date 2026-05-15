-- Sales CRM for master admin
CREATE TABLE IF NOT EXISTS sales_leads (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT        NOT NULL,
  email        TEXT,
  company      TEXT,
  phone        TEXT,
  vertical_id  UUID        REFERENCES verticals(id),
  source       TEXT        NOT NULL DEFAULT 'manuelt',
  deal_stage   TEXT        NOT NULL DEFAULT 'Ny lead',
  assignee_id  UUID        REFERENCES profiles(user_id),
  tenant_id    UUID        REFERENCES tenants(id),
  ticket_id    UUID        REFERENCES support_tickets(id),
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sales_activities (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id      UUID        NOT NULL REFERENCES sales_leads(id) ON DELETE CASCADE,
  type         TEXT        NOT NULL DEFAULT 'notat',
  description  TEXT,
  performed_by UUID        REFERENCES profiles(user_id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE sales_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "master_admin_sales_leads_all" ON sales_leads
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'master_admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'master_admin')
  );

CREATE POLICY "master_admin_sales_activities_all" ON sales_activities
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'master_admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'master_admin')
  );
