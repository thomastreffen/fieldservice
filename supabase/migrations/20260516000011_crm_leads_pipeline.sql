-- Add sales pipeline fields to crm_contacts
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS deal_stage TEXT DEFAULT 'Ny lead';
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS vertical_slug TEXT;

-- Create internal FieldService tenant
INSERT INTO tenants (name, slug, status, vertical_id)
SELECT 'FieldService Internt', 'fieldservice-internt', 'active', id
FROM verticals WHERE slug = 'elektro' LIMIT 1
ON CONFLICT (slug) DO NOTHING;

-- Link thomas.treffen@gmail.com to the internal tenant
INSERT INTO profiles (user_id, tenant_id, full_name, email, is_active)
SELECT
  '2d46150b-a12f-41f3-8f1d-38feb9c065da',
  t.id,
  'Thomas',
  'thomas.treffen@gmail.com',
  true
FROM tenants t
WHERE t.slug = 'fieldservice-internt'
ON CONFLICT (user_id) DO UPDATE SET tenant_id = EXCLUDED.tenant_id;
