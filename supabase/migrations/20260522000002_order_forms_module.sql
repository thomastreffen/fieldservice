-- ============================================================
-- ORDER FORMS MODULE
-- 13 tables: 4 top-level (tenant_id + RLS) + 9 child (RLS via parent FK)
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- TOP-LEVEL TABLES (tenant_id + RLS)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE public.order_form_templates (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name                  text        NOT NULL,
  slug                  text        NOT NULL,
  description           text,
  audience_type         text        NOT NULL DEFAULT 'both',
  external_title        text,
  internal_title        text,
  external_help_text    text,
  internal_help_text    text,
  category              text,
  category_id           uuid,
  is_active             boolean     NOT NULL DEFAULT true,
  show_in_catalog       boolean     NOT NULL DEFAULT false,
  requires_login        boolean     NOT NULL DEFAULT false,
  confirmation_text     text,
  on_submit_action      text        NOT NULL DEFAULT 'show_confirmation',
  default_status        text        NOT NULL DEFAULT 'new',
  default_priority      text        NOT NULL DEFAULT 'normal',
  default_handling_rule text        NOT NULL DEFAULT 'queue',
  send_email_to         text[]      NOT NULL DEFAULT '{}',
  created_by            uuid        REFERENCES auth.users(id),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  deleted_at            timestamptz,
  deleted_by            uuid        REFERENCES auth.users(id),
  UNIQUE (tenant_id, slug)
);

CREATE INDEX idx_order_form_templates_tenant ON public.order_form_templates(tenant_id);

ALTER TABLE public.order_form_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Master admins can manage all order_form_templates" ON public.order_form_templates FOR ALL TO authenticated USING (has_role(auth.uid(), 'master_admin'::app_role));
CREATE POLICY "Tenant admins can manage their order_form_templates" ON public.order_form_templates FOR ALL TO authenticated USING ((tenant_id = get_user_tenant_id(auth.uid())) AND has_role(auth.uid(), 'tenant_admin'::app_role));
CREATE POLICY "Tenant users can view their order_form_templates" ON public.order_form_templates FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));


CREATE TABLE public.order_form_submissions (
  id                              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                       uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  template_id                     uuid        REFERENCES public.order_form_templates(id),
  submission_no                   text,
  status                          text        NOT NULL DEFAULT 'new',
  priority                        text        NOT NULL DEFAULT 'normal',
  source                          text        NOT NULL DEFAULT 'web',
  channel                         text,
  requester_type                  text        NOT NULL DEFAULT 'external',
  submitted_by                    uuid        REFERENCES auth.users(id),
  submitter_name                  text,
  submitter_email                 text,
  submitter_user_id               uuid,
  assigned_to                     uuid        REFERENCES auth.users(id),
  summary                         jsonb,
  quality_score                   text,
  quality_issues                  jsonb,
  external_status                 text,
  external_status_updated_at      timestamptz,
  public_tracking_token           text        UNIQUE,
  inbound_token                   text        UNIQUE,
  notification_recipient_name     text,
  notification_recipient_email    text,
  notification_recipient_phone    text,
  notification_recipient_source   text,
  notification_sent_at            timestamptz,
  notification_error              text,
  confirmation_sent_at            timestamptz,
  auto_notify_on_status_change    boolean     NOT NULL DEFAULT true,
  awaiting_customer_reply         boolean     NOT NULL DEFAULT false,
  customer_last_reply_at          timestamptz,
  customer_last_viewed_at         timestamptz,
  last_activity_at                timestamptz,
  last_admin_message_at           timestamptz,
  last_customer_message_at        timestamptz,
  open_request_message_id         uuid,
  linked_customer_id              uuid,
  linked_project_id               uuid,
  linked_case_id                  uuid,
  linked_event_id                 uuid,
  commercial_case_id              uuid,
  converted_to_id                 uuid,
  converted_to_type               text,
  submitted_at                    timestamptz NOT NULL DEFAULT now(),
  updated_at                      timestamptz NOT NULL DEFAULT now(),
  closed_at                       timestamptz,
  closed_by                       uuid        REFERENCES auth.users(id),
  deleted_at                      timestamptz,
  deleted_by                      uuid        REFERENCES auth.users(id)
);

CREATE INDEX idx_order_form_submissions_tenant ON public.order_form_submissions(tenant_id);
CREATE INDEX idx_order_form_submissions_template ON public.order_form_submissions(template_id);
CREATE INDEX idx_order_form_submissions_status ON public.order_form_submissions(tenant_id, status);

ALTER TABLE public.order_form_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Master admins can manage all order_form_submissions" ON public.order_form_submissions FOR ALL TO authenticated USING (has_role(auth.uid(), 'master_admin'::app_role));
CREATE POLICY "Tenant admins can manage their order_form_submissions" ON public.order_form_submissions FOR ALL TO authenticated USING ((tenant_id = get_user_tenant_id(auth.uid())) AND has_role(auth.uid(), 'tenant_admin'::app_role));
CREATE POLICY "Tenant users can view their order_form_submissions" ON public.order_form_submissions FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));


CREATE TABLE public.order_form_categories (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name            text        NOT NULL,
  slug            text        NOT NULL,
  description     text,
  is_active       boolean     NOT NULL DEFAULT true,
  show_in_catalog boolean     NOT NULL DEFAULT true,
  sort_order      int         NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, slug)
);

CREATE INDEX idx_order_form_categories_tenant ON public.order_form_categories(tenant_id);

ALTER TABLE public.order_form_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Master admins can manage all order_form_categories" ON public.order_form_categories FOR ALL TO authenticated USING (has_role(auth.uid(), 'master_admin'::app_role));
CREATE POLICY "Tenant admins can manage their order_form_categories" ON public.order_form_categories FOR ALL TO authenticated USING ((tenant_id = get_user_tenant_id(auth.uid())) AND has_role(auth.uid(), 'tenant_admin'::app_role));
CREATE POLICY "Tenant users can view their order_form_categories" ON public.order_form_categories FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));


CREATE TABLE public.order_form_catalog_settings (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title        text,
  subtitle     text,
  help_text    text,
  contact_info text,
  is_active    boolean     NOT NULL DEFAULT true,
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id)
);

CREATE INDEX idx_order_form_catalog_settings_tenant ON public.order_form_catalog_settings(tenant_id);

ALTER TABLE public.order_form_catalog_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Master admins can manage all order_form_catalog_settings" ON public.order_form_catalog_settings FOR ALL TO authenticated USING (has_role(auth.uid(), 'master_admin'::app_role));
CREATE POLICY "Tenant admins can manage their order_form_catalog_settings" ON public.order_form_catalog_settings FOR ALL TO authenticated USING ((tenant_id = get_user_tenant_id(auth.uid())) AND has_role(auth.uid(), 'tenant_admin'::app_role));
CREATE POLICY "Tenant users can view their order_form_catalog_settings" ON public.order_form_catalog_settings FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));


-- ─────────────────────────────────────────────────────────────
-- CHILD TABLES (RLS via parent EXISTS subquery)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE public.order_form_template_sections (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id      uuid        NOT NULL REFERENCES public.order_form_templates(id) ON DELETE CASCADE,
  title            text        NOT NULL,
  description      text,
  sort_order       int         NOT NULL DEFAULT 0,
  is_active        boolean     NOT NULL DEFAULT true,
  visibility_rules jsonb,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_form_template_sections_template ON public.order_form_template_sections(template_id);

ALTER TABLE public.order_form_template_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Master admins can manage all order_form_template_sections" ON public.order_form_template_sections FOR ALL TO authenticated USING (has_role(auth.uid(), 'master_admin'::app_role));
CREATE POLICY "Tenant admins can manage their order_form_template_sections" ON public.order_form_template_sections FOR ALL TO authenticated USING (has_role(auth.uid(), 'tenant_admin'::app_role) AND EXISTS (SELECT 1 FROM public.order_form_templates t WHERE t.id = order_form_template_sections.template_id AND t.tenant_id = get_user_tenant_id(auth.uid())));
CREATE POLICY "Tenant users can view their order_form_template_sections" ON public.order_form_template_sections FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.order_form_templates t WHERE t.id = order_form_template_sections.template_id AND t.tenant_id = get_user_tenant_id(auth.uid())));


CREATE TABLE public.order_form_template_fields (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id       uuid        NOT NULL REFERENCES public.order_form_templates(id) ON DELETE CASCADE,
  section_id        uuid        REFERENCES public.order_form_template_sections(id) ON DELETE CASCADE,
  field_key         text        NOT NULL,
  field_type        text        NOT NULL,
  label             text        NOT NULL,
  placeholder       text,
  help_text         text,
  is_required       boolean     NOT NULL DEFAULT false,
  is_active         boolean     NOT NULL DEFAULT true,
  is_readonly       boolean     NOT NULL DEFAULT false,
  field_width       text        NOT NULL DEFAULT 'full',
  sort_order        int         NOT NULL DEFAULT 0,
  options           jsonb,
  default_value     jsonb,
  validation        jsonb,
  conditional_logic jsonb,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_form_template_fields_template ON public.order_form_template_fields(template_id);
CREATE INDEX idx_order_form_template_fields_section ON public.order_form_template_fields(section_id);

ALTER TABLE public.order_form_template_fields ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Master admins can manage all order_form_template_fields" ON public.order_form_template_fields FOR ALL TO authenticated USING (has_role(auth.uid(), 'master_admin'::app_role));
CREATE POLICY "Tenant admins can manage their order_form_template_fields" ON public.order_form_template_fields FOR ALL TO authenticated USING (has_role(auth.uid(), 'tenant_admin'::app_role) AND EXISTS (SELECT 1 FROM public.order_form_templates t WHERE t.id = order_form_template_fields.template_id AND t.tenant_id = get_user_tenant_id(auth.uid())));
CREATE POLICY "Tenant users can view their order_form_template_fields" ON public.order_form_template_fields FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.order_form_templates t WHERE t.id = order_form_template_fields.template_id AND t.tenant_id = get_user_tenant_id(auth.uid())));


CREATE TABLE public.order_form_submission_values (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid        NOT NULL REFERENCES public.order_form_submissions(id) ON DELETE CASCADE,
  field_key     text        NOT NULL,
  value         jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_form_submission_values_submission ON public.order_form_submission_values(submission_id);

ALTER TABLE public.order_form_submission_values ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Master admins can manage all order_form_submission_values" ON public.order_form_submission_values FOR ALL TO authenticated USING (has_role(auth.uid(), 'master_admin'::app_role));
CREATE POLICY "Tenant admins can manage their order_form_submission_values" ON public.order_form_submission_values FOR ALL TO authenticated USING (has_role(auth.uid(), 'tenant_admin'::app_role) AND EXISTS (SELECT 1 FROM public.order_form_submissions s WHERE s.id = order_form_submission_values.submission_id AND s.tenant_id = get_user_tenant_id(auth.uid())));
CREATE POLICY "Tenant users can view their order_form_submission_values" ON public.order_form_submission_values FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.order_form_submissions s WHERE s.id = order_form_submission_values.submission_id AND s.tenant_id = get_user_tenant_id(auth.uid())));


CREATE TABLE public.order_form_submission_attachments (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid        NOT NULL REFERENCES public.order_form_submissions(id) ON DELETE CASCADE,
  field_key     text,
  file_name     text        NOT NULL,
  file_path     text        NOT NULL,
  file_size     bigint,
  mime_type     text,
  category      text,
  uploaded_by   uuid        REFERENCES auth.users(id),
  uploaded_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_form_submission_attachments_submission ON public.order_form_submission_attachments(submission_id);

ALTER TABLE public.order_form_submission_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Master admins can manage all order_form_submission_attachments" ON public.order_form_submission_attachments FOR ALL TO authenticated USING (has_role(auth.uid(), 'master_admin'::app_role));
CREATE POLICY "Tenant admins manage their order_form_submission_attachments" ON public.order_form_submission_attachments FOR ALL TO authenticated USING (has_role(auth.uid(), 'tenant_admin'::app_role) AND EXISTS (SELECT 1 FROM public.order_form_submissions s WHERE s.id = order_form_submission_attachments.submission_id AND s.tenant_id = get_user_tenant_id(auth.uid())));
CREATE POLICY "Tenant users can view their order_form_submission_attachments" ON public.order_form_submission_attachments FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.order_form_submissions s WHERE s.id = order_form_submission_attachments.submission_id AND s.tenant_id = get_user_tenant_id(auth.uid())));


CREATE TABLE public.order_form_messages (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id               uuid        NOT NULL REFERENCES public.order_form_submissions(id) ON DELETE CASCADE,
  body                        text        NOT NULL,
  sender_type                 text        NOT NULL,
  sender_name                 text,
  sender_user_id              uuid        REFERENCES auth.users(id),
  sender_participant_id       uuid,
  message_type                text        NOT NULL DEFAULT 'message',
  source                      text        NOT NULL DEFAULT 'web',
  visibility                  text        NOT NULL DEFAULT 'shared',
  is_visible_to_customer      boolean     NOT NULL DEFAULT true,
  requires_reply              boolean     NOT NULL DEFAULT false,
  replied_at                  timestamptz,
  review_status               text,
  reviewed_at                 timestamptz,
  reviewed_by_user_id         uuid        REFERENCES auth.users(id),
  addressed_to_participant_id uuid,
  email_notification_sent     boolean     NOT NULL DEFAULT false,
  email_notification_sent_at  timestamptz,
  created_at                  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_form_messages_submission ON public.order_form_messages(submission_id);

ALTER TABLE public.order_form_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Master admins can manage all order_form_messages" ON public.order_form_messages FOR ALL TO authenticated USING (has_role(auth.uid(), 'master_admin'::app_role));
CREATE POLICY "Tenant admins can manage their order_form_messages" ON public.order_form_messages FOR ALL TO authenticated USING (has_role(auth.uid(), 'tenant_admin'::app_role) AND EXISTS (SELECT 1 FROM public.order_form_submissions s WHERE s.id = order_form_messages.submission_id AND s.tenant_id = get_user_tenant_id(auth.uid())));
CREATE POLICY "Tenant users can view their order_form_messages" ON public.order_form_messages FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.order_form_submissions s WHERE s.id = order_form_messages.submission_id AND s.tenant_id = get_user_tenant_id(auth.uid())));


CREATE TABLE public.order_form_participants (
  id                       uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id            uuid        NOT NULL REFERENCES public.order_form_submissions(id) ON DELETE CASCADE,
  user_id                  uuid        REFERENCES auth.users(id),
  name                     text        NOT NULL,
  email                    text,
  participant_type         text        NOT NULL,
  role_label               text,
  can_reply                boolean     NOT NULL DEFAULT true,
  receives_notifications   boolean     NOT NULL DEFAULT true,
  is_visible_to_customer   boolean     NOT NULL DEFAULT false,
  inbound_token            text        UNIQUE,
  created_by               uuid        REFERENCES auth.users(id),
  created_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_form_participants_submission ON public.order_form_participants(submission_id);

ALTER TABLE public.order_form_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Master admins can manage all order_form_participants" ON public.order_form_participants FOR ALL TO authenticated USING (has_role(auth.uid(), 'master_admin'::app_role));
CREATE POLICY "Tenant admins can manage their order_form_participants" ON public.order_form_participants FOR ALL TO authenticated USING (has_role(auth.uid(), 'tenant_admin'::app_role) AND EXISTS (SELECT 1 FROM public.order_form_submissions s WHERE s.id = order_form_participants.submission_id AND s.tenant_id = get_user_tenant_id(auth.uid())));
CREATE POLICY "Tenant users can view their order_form_participants" ON public.order_form_participants FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.order_form_submissions s WHERE s.id = order_form_participants.submission_id AND s.tenant_id = get_user_tenant_id(auth.uid())));


CREATE TABLE public.order_form_activity_log (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid        NOT NULL REFERENCES public.order_form_submissions(id) ON DELETE CASCADE,
  event_type    text        NOT NULL,
  payload       jsonb,
  created_by    uuid        REFERENCES auth.users(id),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_form_activity_log_submission ON public.order_form_activity_log(submission_id);

ALTER TABLE public.order_form_activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Master admins can manage all order_form_activity_log" ON public.order_form_activity_log FOR ALL TO authenticated USING (has_role(auth.uid(), 'master_admin'::app_role));
CREATE POLICY "Tenant admins can manage their order_form_activity_log" ON public.order_form_activity_log FOR ALL TO authenticated USING (has_role(auth.uid(), 'tenant_admin'::app_role) AND EXISTS (SELECT 1 FROM public.order_form_submissions s WHERE s.id = order_form_activity_log.submission_id AND s.tenant_id = get_user_tenant_id(auth.uid())));
CREATE POLICY "Tenant users can view their order_form_activity_log" ON public.order_form_activity_log FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.order_form_submissions s WHERE s.id = order_form_activity_log.submission_id AND s.tenant_id = get_user_tenant_id(auth.uid())));


CREATE TABLE public.order_form_comments (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id     uuid        NOT NULL REFERENCES public.order_form_submissions(id) ON DELETE CASCADE,
  body              text        NOT NULL,
  comment_type      text        NOT NULL DEFAULT 'internal',
  visibility        text        NOT NULL DEFAULT 'internal',
  is_customer_reply boolean     NOT NULL DEFAULT false,
  author_name       text,
  created_by        uuid        REFERENCES auth.users(id),
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_form_comments_submission ON public.order_form_comments(submission_id);

ALTER TABLE public.order_form_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Master admins can manage all order_form_comments" ON public.order_form_comments FOR ALL TO authenticated USING (has_role(auth.uid(), 'master_admin'::app_role));
CREATE POLICY "Tenant admins can manage their order_form_comments" ON public.order_form_comments FOR ALL TO authenticated USING (has_role(auth.uid(), 'tenant_admin'::app_role) AND EXISTS (SELECT 1 FROM public.order_form_submissions s WHERE s.id = order_form_comments.submission_id AND s.tenant_id = get_user_tenant_id(auth.uid())));
CREATE POLICY "Tenant users can view their order_form_comments" ON public.order_form_comments FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.order_form_submissions s WHERE s.id = order_form_comments.submission_id AND s.tenant_id = get_user_tenant_id(auth.uid())));


CREATE TABLE public.order_form_field_requests (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id    uuid        NOT NULL REFERENCES public.order_form_submissions(id) ON DELETE CASCADE,
  request_batch_id text        NOT NULL,
  field_key        text,
  field_label      text        NOT NULL,
  field_type       text        NOT NULL,
  is_free_text     boolean     NOT NULL DEFAULT false,
  options          jsonb,
  status           text        NOT NULL DEFAULT 'pending',
  requested_by     uuid        REFERENCES auth.users(id),
  requested_by_name text,
  requested_at     timestamptz NOT NULL DEFAULT now(),
  answered_at      timestamptz,
  answer_value     jsonb,
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_form_field_requests_submission ON public.order_form_field_requests(submission_id);

ALTER TABLE public.order_form_field_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Master admins can manage all order_form_field_requests" ON public.order_form_field_requests FOR ALL TO authenticated USING (has_role(auth.uid(), 'master_admin'::app_role));
CREATE POLICY "Tenant admins can manage their order_form_field_requests" ON public.order_form_field_requests FOR ALL TO authenticated USING (has_role(auth.uid(), 'tenant_admin'::app_role) AND EXISTS (SELECT 1 FROM public.order_form_submissions s WHERE s.id = order_form_field_requests.submission_id AND s.tenant_id = get_user_tenant_id(auth.uid())));
CREATE POLICY "Tenant users can view their order_form_field_requests" ON public.order_form_field_requests FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.order_form_submissions s WHERE s.id = order_form_field_requests.submission_id AND s.tenant_id = get_user_tenant_id(auth.uid())));


-- ─────────────────────────────────────────────────────────────
-- UPDATED_AT TRIGGERS
-- ─────────────────────────────────────────────────────────────

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.order_form_templates        FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.order_form_submissions       FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.order_form_catalog_settings  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.order_form_field_requests    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ─────────────────────────────────────────────────────────────
-- REGISTER MODULE
-- ─────────────────────────────────────────────────────────────

INSERT INTO public.platform_modules (slug, name, description, icon, is_core, compatible_verticals)
VALUES (
  'order_forms',
  'Bestillingsmodul',
  'Offentlige bestillingsskjemaer med intern saksbehandling og kundesporing',
  'ClipboardList',
  false,
  ARRAY['varmepumpe', 'elektro', 'vvs']
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.vertical_modules (vertical_id, module_slug, enabled_by_default, label_overrides)
SELECT v.id, 'order_forms', false, '{}'::jsonb
FROM public.verticals v
WHERE v.slug IN ('varmepumpe', 'elektro', 'vvs')
ON CONFLICT (vertical_id, module_slug) DO NOTHING;
