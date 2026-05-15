-- Platform-wide key/value settings (Teams webhook, Azure DevOps config, etc.)

CREATE TABLE IF NOT EXISTS public.platform_settings (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  key        TEXT        UNIQUE NOT NULL,
  value      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.touch_platform_settings()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER platform_settings_updated_at
  BEFORE UPDATE ON public.platform_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_platform_settings();

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read settings (needed for client-side webhook calls from tenant pages)
CREATE POLICY "Authenticated users can read settings"
  ON public.platform_settings FOR SELECT TO authenticated
  USING (true);

-- Only master admins can write settings
CREATE POLICY "Master admin can manage settings"
  ON public.platform_settings FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'master_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'master_admin'
    )
  );
