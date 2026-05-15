-- Remove FieldService Internt internal tenant and its data
DO $$
DECLARE v_id UUID;
BEGIN
  SELECT id INTO v_id FROM public.tenants WHERE slug = 'fieldservice-internt';
  IF v_id IS NOT NULL THEN
    DELETE FROM public.crm_contacts   WHERE tenant_id = v_id;
    DELETE FROM public.tenant_modules WHERE tenant_id = v_id;
    DELETE FROM public.profiles       WHERE tenant_id = v_id;
    DELETE FROM public.tenants        WHERE id = v_id;
  END IF;
END $$;

-- Drop old sales tables (activities first due to FK)
DROP TABLE IF EXISTS public.sales_activities;
DROP TABLE IF EXISTS public.sales_leads;

-- Platform-level CRM: contacts
CREATE TABLE public.platform_contacts (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT        NOT NULL,
  email        TEXT,
  company      TEXT,
  phone        TEXT,
  vertical_id  UUID        REFERENCES public.verticals(id) ON DELETE SET NULL,
  source       TEXT        NOT NULL DEFAULT 'manuelt',
  deal_stage   TEXT        NOT NULL DEFAULT 'Ny lead',
  assignee_id  UUID        REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  tenant_id    UUID        REFERENCES public.tenants(id) ON DELETE SET NULL,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.platform_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "master_admin_platform_contacts_all" ON public.platform_contacts
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'master_admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'master_admin')
  );

-- Platform-level CRM: activity log per contact
CREATE TABLE public.platform_activities (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id   UUID        NOT NULL REFERENCES public.platform_contacts(id) ON DELETE CASCADE,
  type         TEXT        NOT NULL DEFAULT 'notat',
  description  TEXT,
  performed_by UUID        REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.platform_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "master_admin_platform_activities_all" ON public.platform_activities
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'master_admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'master_admin')
  );
