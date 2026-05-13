-- ─────────────────────────────────────────────────────────────────────────────
-- Multi-vertical platform foundation
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. verticals ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.verticals (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT        UNIQUE NOT NULL,
  display_name    TEXT        NOT NULL,
  description     TEXT,
  icon            TEXT,
  color           TEXT,
  is_active       BOOLEAN     NOT NULL DEFAULT true,
  default_modules TEXT[]      NOT NULL DEFAULT '{}',
  config          JSONB       NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. platform_modules ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.platform_modules (
  id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                   TEXT        UNIQUE NOT NULL,
  name                   TEXT        NOT NULL,
  description            TEXT,
  icon                   TEXT,
  compatible_verticals   TEXT[]      NOT NULL DEFAULT '{}',
  is_core                BOOLEAN     NOT NULL DEFAULT false,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. vertical_modules ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.vertical_modules (
  id                  UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  vertical_id         UUID    NOT NULL REFERENCES public.verticals(id) ON DELETE CASCADE,
  module_slug         TEXT    NOT NULL,
  enabled_by_default  BOOLEAN NOT NULL DEFAULT true,
  label_overrides     JSONB   NOT NULL DEFAULT '{}',
  field_config        JSONB   NOT NULL DEFAULT '{}',
  UNIQUE (vertical_id, module_slug)
);

-- 4. Add vertical_id to tenants ────────────────────────────────────────────
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS vertical_id UUID REFERENCES public.verticals(id);

-- 5. RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE public.verticals        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vertical_modules ENABLE ROW LEVEL SECURITY;

-- verticals: public read, master_admin write
CREATE POLICY "Public can read verticals"
  ON public.verticals FOR SELECT TO authenticated USING (true);

CREATE POLICY "Master admin can manage verticals"
  ON public.verticals FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'master_admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'master_admin'
  ));

-- platform_modules: public read, master_admin write
CREATE POLICY "Public can read platform_modules"
  ON public.platform_modules FOR SELECT TO authenticated USING (true);

CREATE POLICY "Master admin can manage platform_modules"
  ON public.platform_modules FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'master_admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'master_admin'
  ));

-- vertical_modules: public read, master_admin write
CREATE POLICY "Public can read vertical_modules"
  ON public.vertical_modules FOR SELECT TO authenticated USING (true);

CREATE POLICY "Master admin can manage vertical_modules"
  ON public.vertical_modules FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'master_admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'master_admin'
  ));

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. SEED: verticals
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.verticals (slug, display_name, description, icon, color, is_active, default_modules)
VALUES
  (
    'varmepumpe',
    'Varmepumpe',
    'Field service for varmepumpe- og klimaanleggbransjen',
    'thermometer',
    '#6366f1',
    true,
    ARRAY['crm','jobs','service_agreements','assets','ressursplanlegger','postkontoret','warranties','hms']
  ),
  (
    'elektro',
    'Elektro',
    'Field service for elektroinstallatører',
    'zap',
    '#f59e0b',
    true,
    ARRAY['crm','jobs','assets','ressursplanlegger','postkontoret','warranties','hms','el_certificates']
  ),
  (
    'vvs',
    'VVS',
    'Field service for VVS-installatører',
    'droplets',
    '#06b6d4',
    true,
    ARRAY['crm','jobs','service_agreements','assets','ressursplanlegger','postkontoret','warranties','hms']
  )
ON CONFLICT (slug) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. SEED: platform_modules
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.platform_modules (slug, name, description, icon, is_core, compatible_verticals)
VALUES
  ('crm',               'CRM',              'Kunder, kontakter, salg og anlegg',         'building2',      true,  ARRAY['varmepumpe','elektro','vvs']),
  ('jobs',              'Jobber',           'Jobbplanlegging og -oppfølging',             'briefcase',      true,  ARRAY['varmepumpe','elektro','vvs']),
  ('service_agreements','Serviceavtaler',   'Periodisk vedlikehold med automatisering',   'file-text',      false, ARRAY['varmepumpe','vvs']),
  ('assets',            'Anlegg',           'Utstyr og anlegg hos kunder',                'cpu',            true,  ARRAY['varmepumpe','elektro','vvs']),
  ('ressursplanlegger', 'Ressursplanlegger','Ukekalender og tekniker-tildeling',           'calendar-days',  false, ARRAY['varmepumpe','elektro','vvs']),
  ('postkontoret',      'Postkontoret',     'E-postintegrasjon og saksbehandling',         'mail',           false, ARRAY['varmepumpe','elektro','vvs']),
  ('warranties',        'Garantisaker',     'Registrering og oppfølging av garantisaker', 'shield-alert',   false, ARRAY['varmepumpe','elektro','vvs']),
  ('hms',               'HMS',              'Helse, miljø og sikkerhet',                  'shield-check',   false, ARRAY['varmepumpe','elektro','vvs']),
  ('el_certificates',   'El-sertifikater',  'Samsvarserklæringer og kontrolldokumenter',  'file-badge',     false, ARRAY['elektro'])
ON CONFLICT (slug) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. SEED: vertical_modules med label overrides
-- ─────────────────────────────────────────────────────────────────────────────
-- Varmepumpe – ingen label overrides (er default)
INSERT INTO public.vertical_modules (vertical_id, module_slug, enabled_by_default, label_overrides)
SELECT v.id, m.slug, true, '{}'::jsonb
FROM public.verticals v
CROSS JOIN (
  VALUES
    ('crm'), ('jobs'), ('service_agreements'), ('assets'),
    ('ressursplanlegger'), ('postkontoret'), ('warranties'), ('hms')
) AS m(slug)
WHERE v.slug = 'varmepumpe'
ON CONFLICT (vertical_id, module_slug) DO NOTHING;

-- Elektro – label overrides på crm-modulen
INSERT INTO public.vertical_modules (vertical_id, module_slug, enabled_by_default, label_overrides)
SELECT v.id, m.slug, true,
  CASE m.slug
    WHEN 'crm' THEN '{
      "asset": "Tavle",
      "assets": "Tavler",
      "asset_type": "Tavletype",
      "service_agreement": "Serviceavtale",
      "job_install": "Nyinstallasjon",
      "job_service": "Periodisk kontroll",
      "manufacturer": "Produsent"
    }'::jsonb
    ELSE '{}'::jsonb
  END
FROM public.verticals v
CROSS JOIN (
  VALUES
    ('crm'), ('jobs'), ('assets'), ('ressursplanlegger'),
    ('postkontoret'), ('warranties'), ('hms'), ('el_certificates')
) AS m(slug)
WHERE v.slug = 'elektro'
ON CONFLICT (vertical_id, module_slug) DO NOTHING;

-- VVS – label overrides på crm-modulen
INSERT INTO public.vertical_modules (vertical_id, module_slug, enabled_by_default, label_overrides)
SELECT v.id, m.slug, true,
  CASE m.slug
    WHEN 'crm' THEN '{
      "asset": "Anlegg",
      "assets": "Anlegg",
      "service_agreement": "Vedlikeholdsavtale",
      "job_install": "Installasjon",
      "job_service": "Service",
      "manufacturer": "Produsent"
    }'::jsonb
    ELSE '{}'::jsonb
  END
FROM public.verticals v
CROSS JOIN (
  VALUES
    ('crm'), ('jobs'), ('service_agreements'), ('assets'),
    ('ressursplanlegger'), ('postkontoret'), ('warranties'), ('hms')
) AS m(slug)
WHERE v.slug = 'vvs'
ON CONFLICT (vertical_id, module_slug) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. Koble eksisterende tenants til varmepumpe-vertikal
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE public.tenants
SET vertical_id = (SELECT id FROM public.verticals WHERE slug = 'varmepumpe')
WHERE vertical_id IS NULL;
