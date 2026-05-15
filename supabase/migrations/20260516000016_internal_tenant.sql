-- Add 'internal' status for platform-owned tenants (excluded from trials, billing, etc.)
ALTER TYPE public.tenant_status ADD VALUE IF NOT EXISTS 'internal';

-- Create permanent internal tenant for the FieldService team
INSERT INTO public.tenants (name, slug, status, trial_ends_at, vertical_id)
VALUES ('FieldService AS', 'fieldservice-as', 'internal', NULL, NULL)
ON CONFLICT (slug) DO NOTHING;

-- Activate CRM module for this tenant
INSERT INTO public.tenant_modules (tenant_id, module_name, is_active, activated_at)
SELECT t.id, 'crm', true, NOW()
FROM public.tenants t
WHERE t.slug = 'fieldservice-as'
ON CONFLICT (tenant_id, module_name) DO NOTHING;

-- Link thomas.treffen@gmail.com's profile to this internal tenant
-- Upserts so it works whether or not a profile already exists
INSERT INTO public.profiles (user_id, tenant_id, full_name, email, is_active)
SELECT
  u.id,
  t.id,
  COALESCE(u.raw_user_meta_data->>'full_name', 'Thomas'),
  u.email,
  true
FROM auth.users u
CROSS JOIN public.tenants t
WHERE u.email = 'thomas.treffen@gmail.com'
  AND t.slug   = 'fieldservice-as'
ON CONFLICT (user_id) DO UPDATE
  SET tenant_id = EXCLUDED.tenant_id,
      is_active  = true;

-- Ensure tenant_admin role is assigned (master_admin already has it via user_roles)
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'tenant_admin'
FROM auth.users u
WHERE u.email = 'thomas.treffen@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;
