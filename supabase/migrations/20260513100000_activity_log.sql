-- Generic activity log for CRM entities (company, job, deal, etc.)
CREATE TABLE IF NOT EXISTS public.activity_log (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  entity_type   TEXT        NOT NULL,
  entity_id     UUID        NOT NULL,
  type          TEXT        NOT NULL DEFAULT 'note',
  action        TEXT        NOT NULL,
  title         TEXT,
  description   TEXT,
  performed_by  UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata      JSONB       NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS activity_log_entity_idx
  ON public.activity_log (tenant_id, entity_type, entity_id, created_at DESC);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view activity log"
  ON public.activity_log FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Tenant members can insert activity log entries"
  ON public.activity_log FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );
