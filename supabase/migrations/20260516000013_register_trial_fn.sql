-- SECURITY DEFINER function to register a trial tenant without requiring service role key on the frontend.
-- Called by the anon-authenticated user immediately after auth.signUp().
CREATE OR REPLACE FUNCTION public.register_trial_tenant(
  p_company_name  TEXT,
  p_slug          TEXT,
  p_vertical_id   UUID,
  p_contact_name  TEXT,
  p_email         TEXT,
  p_default_modules TEXT[]
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_user_id   UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
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

-- Allow any authenticated user to call this function (the body enforces auth.uid() != null)
GRANT EXECUTE ON FUNCTION public.register_trial_tenant TO authenticated;
