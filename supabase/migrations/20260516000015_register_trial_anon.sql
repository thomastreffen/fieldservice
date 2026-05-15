-- Drop old signature (6 params) before replacing with 7-param version
DROP FUNCTION IF EXISTS public.register_trial_tenant(TEXT, TEXT, UUID, TEXT, TEXT, TEXT[]);

-- Allow anon callers to register a trial tenant right after signUp()
-- when email confirmation is enabled (no session returned from signUp).
-- Security: anon callers must pass p_user_id; the function validates it was
-- created within the last 10 minutes to prevent replay abuse.
CREATE OR REPLACE FUNCTION public.register_trial_tenant(
  p_company_name    TEXT,
  p_slug            TEXT,
  p_vertical_id     UUID,
  p_contact_name    TEXT,
  p_email           TEXT,
  p_default_modules TEXT[],
  p_user_id         UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_user_id   UUID;
BEGIN
  -- Prefer authenticated session; fall back to explicit p_user_id (anon signUp case)
  v_user_id := COALESCE(auth.uid(), p_user_id);
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- When calling as anon, validate p_user_id is a freshly-created user (< 10 min old)
  IF auth.uid() IS NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = v_user_id
        AND created_at > NOW() - INTERVAL '10 minutes'
    ) THEN
      RAISE EXCEPTION 'Invalid or expired user registration';
    END IF;
  END IF;

  INSERT INTO tenants (name, slug, status, trial_ends_at, vertical_id)
  VALUES (
    p_company_name,
    p_slug,
    'trial',
    NOW() + INTERVAL '14 days',
    p_vertical_id
  )
  RETURNING id INTO v_tenant_id;

  INSERT INTO profiles (user_id, tenant_id, full_name, email, is_active)
  VALUES (v_user_id, v_tenant_id, p_contact_name, p_email, true)
  ON CONFLICT (user_id) DO UPDATE
    SET tenant_id  = EXCLUDED.tenant_id,
        full_name  = EXCLUDED.full_name,
        email      = EXCLUDED.email,
        is_active  = EXCLUDED.is_active;

  INSERT INTO user_roles (user_id, role)
  VALUES (v_user_id, 'tenant_admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO tenant_modules (tenant_id, module_name, is_active, activated_at)
  SELECT v_tenant_id, m::public.module_name, true, NOW()
  FROM unnest(p_default_modules) AS m
  WHERE m IN ('crm', 'postkontoret', 'ressursplanlegger');

  RETURN v_tenant_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_trial_tenant TO anon;
GRANT EXECUTE ON FUNCTION public.register_trial_tenant TO authenticated;
