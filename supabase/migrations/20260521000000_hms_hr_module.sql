-- ============================================================
-- HMS & HR MODULE
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- TOP-LEVEL TABLES (tenant_id + RLS)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE public.hms_incidents (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title          text        NOT NULL,
  description    text,
  severity       text,
  status         text        NOT NULL DEFAULT 'open',
  incident_type  text,
  location       text,
  occurred_at    timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  reported_by    uuid        REFERENCES auth.users(id),
  project_id     uuid,
  assigned_to    uuid,
  due_date       date,
  attachments    jsonb       NOT NULL DEFAULT '[]',
  deleted_at     timestamptz
);

CREATE INDEX idx_hms_incidents_tenant ON public.hms_incidents(tenant_id);
CREATE INDEX idx_hms_incidents_status ON public.hms_incidents(tenant_id, status);

ALTER TABLE public.hms_incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Master admins can manage all hms_incidents" ON public.hms_incidents FOR ALL TO authenticated USING (has_role(auth.uid(), 'master_admin'::app_role));
CREATE POLICY "Tenant admins can manage their hms_incidents" ON public.hms_incidents FOR ALL TO authenticated USING ((tenant_id = get_user_tenant_id(auth.uid())) AND has_role(auth.uid(), 'tenant_admin'::app_role));
CREATE POLICY "Tenant users can view their hms_incidents" ON public.hms_incidents FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));


CREATE TABLE public.hms_action_items (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  incident_id  uuid        REFERENCES public.hms_incidents(id) ON DELETE CASCADE,
  title        text        NOT NULL,
  due_date     date,
  priority     text,
  status       text        NOT NULL DEFAULT 'open',
  created_at   timestamptz NOT NULL DEFAULT now(),
  deleted_at   timestamptz
);

CREATE INDEX idx_hms_action_items_tenant ON public.hms_action_items(tenant_id);

ALTER TABLE public.hms_action_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Master admins can manage all hms_action_items" ON public.hms_action_items FOR ALL TO authenticated USING (has_role(auth.uid(), 'master_admin'::app_role));
CREATE POLICY "Tenant admins can manage their hms_action_items" ON public.hms_action_items FOR ALL TO authenticated USING ((tenant_id = get_user_tenant_id(auth.uid())) AND has_role(auth.uid(), 'tenant_admin'::app_role));
CREATE POLICY "Tenant users can view their hms_action_items" ON public.hms_action_items FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));


CREATE TABLE public.hms_audit_log (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id      uuid        REFERENCES auth.users(id),
  action       text        NOT NULL,
  entity_type  text,
  entity_id    uuid,
  payload      jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_hms_audit_log_tenant ON public.hms_audit_log(tenant_id);
CREATE INDEX idx_hms_audit_log_entity ON public.hms_audit_log(tenant_id, entity_type, entity_id);

ALTER TABLE public.hms_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Master admins can manage all hms_audit_log" ON public.hms_audit_log FOR ALL TO authenticated USING (has_role(auth.uid(), 'master_admin'::app_role));
CREATE POLICY "Tenant admins can manage their hms_audit_log" ON public.hms_audit_log FOR ALL TO authenticated USING ((tenant_id = get_user_tenant_id(auth.uid())) AND has_role(auth.uid(), 'tenant_admin'::app_role));
CREATE POLICY "Tenant users can view their hms_audit_log" ON public.hms_audit_log FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant users can insert hms_audit_log" ON public.hms_audit_log FOR INSERT TO authenticated WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));


CREATE TABLE public.worktime_entries (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id               uuid,
  work_date             date        NOT NULL,
  ordinary_hours        numeric,
  hours_overtime        numeric,
  total_hours           numeric,
  break_minutes         int,
  activity              text,
  adjustment_reason     text,
  manually_adjusted     boolean     NOT NULL DEFAULT false,
  created_manually      boolean     NOT NULL DEFAULT false,
  source_system         text,
  source_hash           text,
  status                text        NOT NULL DEFAULT 'active',
  employee_name         text,
  external_employee_id  text,
  raw_payload           jsonb,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_worktime_entries_tenant_user ON public.worktime_entries(tenant_id, user_id);
CREATE INDEX idx_worktime_entries_tenant_date ON public.worktime_entries(tenant_id, work_date);

ALTER TABLE public.worktime_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Master admins can manage all worktime_entries" ON public.worktime_entries FOR ALL TO authenticated USING (has_role(auth.uid(), 'master_admin'::app_role));
CREATE POLICY "Tenant admins can manage their worktime_entries" ON public.worktime_entries FOR ALL TO authenticated USING ((tenant_id = get_user_tenant_id(auth.uid())) AND has_role(auth.uid(), 'tenant_admin'::app_role));
CREATE POLICY "Tenant users can view their worktime_entries" ON public.worktime_entries FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));


CREATE TABLE public.worktime_alerts (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id             uuid,
  severity            text,
  status              text        NOT NULL DEFAULT 'open',
  rule_key            text,
  title               text,
  explanation         text,
  why                 text,
  period_start        date,
  period_end          date,
  value               numeric,
  threshold           numeric,
  recommended_action  text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_worktime_alerts_tenant_user ON public.worktime_alerts(tenant_id, user_id);
CREATE INDEX idx_worktime_alerts_tenant_status ON public.worktime_alerts(tenant_id, status);

ALTER TABLE public.worktime_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Master admins can manage all worktime_alerts" ON public.worktime_alerts FOR ALL TO authenticated USING (has_role(auth.uid(), 'master_admin'::app_role));
CREATE POLICY "Tenant admins can manage their worktime_alerts" ON public.worktime_alerts FOR ALL TO authenticated USING ((tenant_id = get_user_tenant_id(auth.uid())) AND has_role(auth.uid(), 'tenant_admin'::app_role));
CREATE POLICY "Tenant users can view their worktime_alerts" ON public.worktime_alerts FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));


CREATE TABLE public.overtime_approvals (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id           uuid,
  period_start      date,
  period_end        date,
  approved_hours    numeric,
  status            text        NOT NULL DEFAULT 'pending',
  reason_type       text,
  approved_by       uuid        REFERENCES auth.users(id),
  approved_at       timestamptz,
  rejection_reason  text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_overtime_approvals_tenant ON public.overtime_approvals(tenant_id);
CREATE INDEX idx_overtime_approvals_tenant_status ON public.overtime_approvals(tenant_id, status);

ALTER TABLE public.overtime_approvals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Master admins can manage all overtime_approvals" ON public.overtime_approvals FOR ALL TO authenticated USING (has_role(auth.uid(), 'master_admin'::app_role));
CREATE POLICY "Tenant admins can manage their overtime_approvals" ON public.overtime_approvals FOR ALL TO authenticated USING ((tenant_id = get_user_tenant_id(auth.uid())) AND has_role(auth.uid(), 'tenant_admin'::app_role));
CREATE POLICY "Tenant users can view their overtime_approvals" ON public.overtime_approvals FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));


CREATE TABLE public.worktime_rulesets (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name         text        NOT NULL,
  description  text,
  is_default   boolean     NOT NULL DEFAULT false,
  rules        jsonb       NOT NULL DEFAULT '{}',
  version      int         NOT NULL DEFAULT 1,
  active_from  date,
  active_to    date,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_worktime_rulesets_tenant ON public.worktime_rulesets(tenant_id);

ALTER TABLE public.worktime_rulesets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Master admins can manage all worktime_rulesets" ON public.worktime_rulesets FOR ALL TO authenticated USING (has_role(auth.uid(), 'master_admin'::app_role));
CREATE POLICY "Tenant admins can manage their worktime_rulesets" ON public.worktime_rulesets FOR ALL TO authenticated USING ((tenant_id = get_user_tenant_id(auth.uid())) AND has_role(auth.uid(), 'tenant_admin'::app_role));
CREATE POLICY "Tenant users can view their worktime_rulesets" ON public.worktime_rulesets FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));


CREATE TABLE public.worktime_import_batches (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  filename      text,
  status        text,
  total_rows    int,
  new_rows      int,
  updated_rows  int,
  skipped_rows  int,
  source_system text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  finished_at   timestamptz
);

CREATE INDEX idx_worktime_import_batches_tenant ON public.worktime_import_batches(tenant_id);

ALTER TABLE public.worktime_import_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Master admins can manage all worktime_import_batches" ON public.worktime_import_batches FOR ALL TO authenticated USING (has_role(auth.uid(), 'master_admin'::app_role));
CREATE POLICY "Tenant admins can manage their worktime_import_batches" ON public.worktime_import_batches FOR ALL TO authenticated USING ((tenant_id = get_user_tenant_id(auth.uid())) AND has_role(auth.uid(), 'tenant_admin'::app_role));
CREATE POLICY "Tenant users can view their worktime_import_batches" ON public.worktime_import_batches FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));


CREATE TABLE public.employee_work_profiles (
  id                    uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             uuid    NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id               uuid    NOT NULL REFERENCES auth.users(id),
  external_employee_id  text,
  is_active             boolean NOT NULL DEFAULT true,
  created_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id)
);

CREATE INDEX idx_employee_work_profiles_tenant ON public.employee_work_profiles(tenant_id);

ALTER TABLE public.employee_work_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Master admins can manage all employee_work_profiles" ON public.employee_work_profiles FOR ALL TO authenticated USING (has_role(auth.uid(), 'master_admin'::app_role));
CREATE POLICY "Tenant admins can manage their employee_work_profiles" ON public.employee_work_profiles FOR ALL TO authenticated USING ((tenant_id = get_user_tenant_id(auth.uid())) AND has_role(auth.uid(), 'tenant_admin'::app_role));
CREATE POLICY "Tenant users can view their employee_work_profiles" ON public.employee_work_profiles FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));


CREATE TABLE public.hms_templates (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name                  text        NOT NULL,
  kind                  text        NOT NULL CHECK (kind IN ('sja', 'checklist')),
  description           text,
  category              text,
  is_active             boolean     NOT NULL DEFAULT true,
  suggested_work_types  text[]      NOT NULL DEFAULT '{}',
  current_version_id    uuid,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_hms_templates_tenant ON public.hms_templates(tenant_id);

ALTER TABLE public.hms_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Master admins can manage all hms_templates" ON public.hms_templates FOR ALL TO authenticated USING (has_role(auth.uid(), 'master_admin'::app_role));
CREATE POLICY "Tenant admins can manage their hms_templates" ON public.hms_templates FOR ALL TO authenticated USING ((tenant_id = get_user_tenant_id(auth.uid())) AND has_role(auth.uid(), 'tenant_admin'::app_role));
CREATE POLICY "Tenant users can view their hms_templates" ON public.hms_templates FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));


CREATE TABLE public.hms_submissions (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title             text,
  kind              text,
  status            text        NOT NULL DEFAULT 'draft',
  submitted_at      timestamptz,
  rejection_reason  text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  deleted_at        timestamptz,
  template_version  jsonb
);

CREATE INDEX idx_hms_submissions_tenant ON public.hms_submissions(tenant_id);
CREATE INDEX idx_hms_submissions_tenant_status ON public.hms_submissions(tenant_id, status);

ALTER TABLE public.hms_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Master admins can manage all hms_submissions" ON public.hms_submissions FOR ALL TO authenticated USING (has_role(auth.uid(), 'master_admin'::app_role));
CREATE POLICY "Tenant admins can manage their hms_submissions" ON public.hms_submissions FOR ALL TO authenticated USING ((tenant_id = get_user_tenant_id(auth.uid())) AND has_role(auth.uid(), 'tenant_admin'::app_role));
CREATE POLICY "Tenant users can view their hms_submissions" ON public.hms_submissions FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));


CREATE TABLE public.hms_handbooks (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title              text        NOT NULL,
  description        text,
  kind               text,
  current_version_id uuid,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  deleted_at         timestamptz
);

CREATE INDEX idx_hms_handbooks_tenant ON public.hms_handbooks(tenant_id);

ALTER TABLE public.hms_handbooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Master admins can manage all hms_handbooks" ON public.hms_handbooks FOR ALL TO authenticated USING (has_role(auth.uid(), 'master_admin'::app_role));
CREATE POLICY "Tenant admins can manage their hms_handbooks" ON public.hms_handbooks FOR ALL TO authenticated USING ((tenant_id = get_user_tenant_id(auth.uid())) AND has_role(auth.uid(), 'tenant_admin'::app_role));
CREATE POLICY "Tenant users can view their hms_handbooks" ON public.hms_handbooks FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));


-- ─────────────────────────────────────────────────────────────
-- GLOBAL CATALOG (no tenant_id, no RLS)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE public.hms_area_catalog (
  area_key         text    PRIMARY KEY,
  label            text    NOT NULL,
  description      text,
  category         text,
  legal_reference  text,
  sort_order       int,
  is_active        boolean NOT NULL DEFAULT true
);


-- ─────────────────────────────────────────────────────────────
-- CHILD TABLES (isolation via parent FK)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE public.hms_template_sections (
  id           uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id  uuid  NOT NULL REFERENCES public.hms_templates(id) ON DELETE CASCADE,
  title        text  NOT NULL,
  description  text,
  ordering     int   NOT NULL DEFAULT 0
);

CREATE INDEX idx_hms_template_sections_template ON public.hms_template_sections(template_id);

ALTER TABLE public.hms_template_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Master admins can manage all hms_template_sections" ON public.hms_template_sections FOR ALL TO authenticated USING (has_role(auth.uid(), 'master_admin'::app_role));
CREATE POLICY "Tenant admins can manage their hms_template_sections" ON public.hms_template_sections FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.hms_templates t WHERE t.id = hms_template_sections.template_id AND t.tenant_id = get_user_tenant_id(auth.uid())) AND has_role(auth.uid(), 'tenant_admin'::app_role));
CREATE POLICY "Tenant users can view their hms_template_sections" ON public.hms_template_sections FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.hms_templates t WHERE t.id = hms_template_sections.template_id AND t.tenant_id = get_user_tenant_id(auth.uid())));


CREATE TABLE public.hms_template_items (
  id           uuid     PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id  uuid     NOT NULL REFERENCES public.hms_templates(id) ON DELETE CASCADE,
  section_id   uuid     REFERENCES public.hms_template_sections(id) ON DELETE CASCADE,
  ordering     int      NOT NULL DEFAULT 0,
  item_type    text     NOT NULL,
  label        text     NOT NULL,
  help_text    text,
  is_required  boolean  NOT NULL DEFAULT false
);

CREATE INDEX idx_hms_template_items_template ON public.hms_template_items(template_id);
CREATE INDEX idx_hms_template_items_section ON public.hms_template_items(section_id);

ALTER TABLE public.hms_template_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Master admins can manage all hms_template_items" ON public.hms_template_items FOR ALL TO authenticated USING (has_role(auth.uid(), 'master_admin'::app_role));
CREATE POLICY "Tenant admins can manage their hms_template_items" ON public.hms_template_items FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.hms_templates t WHERE t.id = hms_template_items.template_id AND t.tenant_id = get_user_tenant_id(auth.uid())) AND has_role(auth.uid(), 'tenant_admin'::app_role));
CREATE POLICY "Tenant users can view their hms_template_items" ON public.hms_template_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.hms_templates t WHERE t.id = hms_template_items.template_id AND t.tenant_id = get_user_tenant_id(auth.uid())));


CREATE TABLE public.hms_submission_answers (
  id               uuid      PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id    uuid      NOT NULL REFERENCES public.hms_submissions(id) ON DELETE CASCADE,
  section_id       uuid,
  item_id          uuid,
  value            text,
  attachment_urls  text[]    NOT NULL DEFAULT '{}'
);

CREATE INDEX idx_hms_submission_answers_submission ON public.hms_submission_answers(submission_id);

ALTER TABLE public.hms_submission_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Master admins can manage all hms_submission_answers" ON public.hms_submission_answers FOR ALL TO authenticated USING (has_role(auth.uid(), 'master_admin'::app_role));
CREATE POLICY "Tenant admins can manage their hms_submission_answers" ON public.hms_submission_answers FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.hms_submissions s WHERE s.id = hms_submission_answers.submission_id AND s.tenant_id = get_user_tenant_id(auth.uid())) AND has_role(auth.uid(), 'tenant_admin'::app_role));
CREATE POLICY "Tenant users can view their hms_submission_answers" ON public.hms_submission_answers FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.hms_submissions s WHERE s.id = hms_submission_answers.submission_id AND s.tenant_id = get_user_tenant_id(auth.uid())));


CREATE TABLE public.hms_submission_participants (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id    uuid        NOT NULL REFERENCES public.hms_submissions(id) ON DELETE CASCADE,
  user_id          uuid        REFERENCES auth.users(id),
  signed_at        timestamptz,
  signature_image  text
);

CREATE INDEX idx_hms_submission_participants_submission ON public.hms_submission_participants(submission_id);

ALTER TABLE public.hms_submission_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Master admins can manage all hms_submission_participants" ON public.hms_submission_participants FOR ALL TO authenticated USING (has_role(auth.uid(), 'master_admin'::app_role));
CREATE POLICY "Tenant admins can manage their hms_submission_participants" ON public.hms_submission_participants FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.hms_submissions s WHERE s.id = hms_submission_participants.submission_id AND s.tenant_id = get_user_tenant_id(auth.uid())) AND has_role(auth.uid(), 'tenant_admin'::app_role));
CREATE POLICY "Tenant users can view their hms_submission_participants" ON public.hms_submission_participants FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.hms_submissions s WHERE s.id = hms_submission_participants.submission_id AND s.tenant_id = get_user_tenant_id(auth.uid())));


CREATE TABLE public.hms_handbook_versions (
  id                       uuid     PRIMARY KEY DEFAULT gen_random_uuid(),
  handbook_id              uuid     NOT NULL REFERENCES public.hms_handbooks(id) ON DELETE CASCADE,
  version                  int      NOT NULL DEFAULT 1,
  status                   text     NOT NULL DEFAULT 'draft',
  changelog                text,
  acknowledgement_required boolean  NOT NULL DEFAULT false,
  created_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_hms_handbook_versions_handbook ON public.hms_handbook_versions(handbook_id);

ALTER TABLE public.hms_handbook_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Master admins can manage all hms_handbook_versions" ON public.hms_handbook_versions FOR ALL TO authenticated USING (has_role(auth.uid(), 'master_admin'::app_role));
CREATE POLICY "Tenant admins can manage their hms_handbook_versions" ON public.hms_handbook_versions FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.hms_handbooks h WHERE h.id = hms_handbook_versions.handbook_id AND h.tenant_id = get_user_tenant_id(auth.uid())) AND has_role(auth.uid(), 'tenant_admin'::app_role));
CREATE POLICY "Tenant users can view their hms_handbook_versions" ON public.hms_handbook_versions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.hms_handbooks h WHERE h.id = hms_handbook_versions.handbook_id AND h.tenant_id = get_user_tenant_id(auth.uid())));


CREATE TABLE public.hms_handbook_sections (
  id           uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  handbook_id  uuid  NOT NULL REFERENCES public.hms_handbooks(id) ON DELETE CASCADE,
  version_id   uuid  REFERENCES public.hms_handbook_versions(id) ON DELETE CASCADE,
  heading      text,
  body         text,
  ordering     int   NOT NULL DEFAULT 0
);

CREATE INDEX idx_hms_handbook_sections_handbook ON public.hms_handbook_sections(handbook_id);
CREATE INDEX idx_hms_handbook_sections_version ON public.hms_handbook_sections(version_id);

ALTER TABLE public.hms_handbook_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Master admins can manage all hms_handbook_sections" ON public.hms_handbook_sections FOR ALL TO authenticated USING (has_role(auth.uid(), 'master_admin'::app_role));
CREATE POLICY "Tenant admins can manage their hms_handbook_sections" ON public.hms_handbook_sections FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.hms_handbooks h WHERE h.id = hms_handbook_sections.handbook_id AND h.tenant_id = get_user_tenant_id(auth.uid())) AND has_role(auth.uid(), 'tenant_admin'::app_role));
CREATE POLICY "Tenant users can view their hms_handbook_sections" ON public.hms_handbook_sections FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.hms_handbooks h WHERE h.id = hms_handbook_sections.handbook_id AND h.tenant_id = get_user_tenant_id(auth.uid())));


CREATE TABLE public.hms_handbook_acknowledgements (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL REFERENCES auth.users(id),
  handbook_id     uuid        NOT NULL REFERENCES public.hms_handbooks(id) ON DELETE CASCADE,
  version_id      uuid        REFERENCES public.hms_handbook_versions(id) ON DELETE CASCADE,
  acknowledged_at timestamptz NOT NULL DEFAULT now(),
  user_agent      text,
  UNIQUE (user_id, handbook_id, version_id)
);

CREATE INDEX idx_hms_handbook_ack_handbook ON public.hms_handbook_acknowledgements(handbook_id);
CREATE INDEX idx_hms_handbook_ack_user ON public.hms_handbook_acknowledgements(user_id);

ALTER TABLE public.hms_handbook_acknowledgements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Master admins can manage all hms_handbook_acknowledgements" ON public.hms_handbook_acknowledgements FOR ALL TO authenticated USING (has_role(auth.uid(), 'master_admin'::app_role));
CREATE POLICY "Tenant admins can manage their hms_handbook_acknowledgements" ON public.hms_handbook_acknowledgements FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.hms_handbooks h WHERE h.id = hms_handbook_acknowledgements.handbook_id AND h.tenant_id = get_user_tenant_id(auth.uid())) AND has_role(auth.uid(), 'tenant_admin'::app_role));
CREATE POLICY "Tenant users can view their hms_handbook_acknowledgements" ON public.hms_handbook_acknowledgements FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.hms_handbooks h WHERE h.id = hms_handbook_acknowledgements.handbook_id AND h.tenant_id = get_user_tenant_id(auth.uid())));
CREATE POLICY "Users can insert own hms_handbook_acknowledgements" ON public.hms_handbook_acknowledgements FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.hms_handbooks h WHERE h.id = hms_handbook_acknowledgements.handbook_id AND h.tenant_id = get_user_tenant_id(auth.uid())));


-- ─────────────────────────────────────────────────────────────
-- UPDATED_AT TRIGGERS
-- ─────────────────────────────────────────────────────────────

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.worktime_alerts       FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.worktime_rulesets     FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.hms_templates         FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.hms_submissions       FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.hms_handbooks         FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ─────────────────────────────────────────────────────────────
-- STEP 3: Register module in platform
-- ─────────────────────────────────────────────────────────────
-- Note: platform_modules uses module_slug TEXT in vertical_modules (not module_id UUID).
-- The existing 'hms' entry is a placeholder; 'hms_hr' is the full HMS & HR module.

INSERT INTO public.platform_modules (slug, name, description, icon, is_core, compatible_verticals)
VALUES (
  'hms_hr',
  'HMS & HR',
  'Avvikshåndtering, SJA/sjekklister, håndbøker, arbeidstid og AML-overvåking',
  'Shield',
  false,
  ARRAY['varmepumpe', 'elektro', 'vvs']
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.vertical_modules (vertical_id, module_slug, enabled_by_default, label_overrides)
SELECT v.id, 'hms_hr', false, '{}'::jsonb
FROM public.verticals v
WHERE v.slug IN ('varmepumpe', 'elektro', 'vvs')
ON CONFLICT (vertical_id, module_slug) DO NOTHING;
