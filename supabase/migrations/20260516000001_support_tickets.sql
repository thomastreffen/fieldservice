-- Support ticket system: support_tickets + support_messages

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_by   UUID        NOT NULL REFERENCES auth.users(id),
  title        TEXT        NOT NULL,
  description  TEXT        NOT NULL,
  category     TEXT        NOT NULL CHECK (category IN ('Bug', 'Spørsmål', 'Funksjonsønske', 'Annet')),
  priority     TEXT        NOT NULL DEFAULT 'Normal' CHECK (priority IN ('Lav', 'Normal', 'Høy', 'Kritisk')),
  status       TEXT        NOT NULL DEFAULT 'Åpen' CHECK (status IN ('Åpen', 'Under behandling', 'Løst', 'Lukket')),
  assignee_id  UUID        REFERENCES auth.users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.support_messages (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id   UUID        NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id   UUID        NOT NULL REFERENCES auth.users(id),
  message     TEXT        NOT NULL,
  is_internal BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS support_tickets_tenant_idx
  ON public.support_tickets (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS support_messages_ticket_idx
  ON public.support_messages (ticket_id, created_at ASC);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_support_ticket()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.touch_support_ticket();

-- RLS
ALTER TABLE public.support_tickets  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- Tickets: tenants see their own
CREATE POLICY "Tenant members can view own tickets"
  ON public.support_tickets FOR SELECT TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Tenant members can create tickets"
  ON public.support_tickets FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "Tenant members can update own tickets"
  ON public.support_tickets FOR UPDATE TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Master admin can manage all tickets"
  ON public.support_tickets FOR ALL TO authenticated
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

-- Messages: tenants see non-internal messages on their tickets
CREATE POLICY "Tenant members can view non-internal messages"
  ON public.support_messages FOR SELECT TO authenticated
  USING (
    is_internal = false
    AND ticket_id IN (
      SELECT id FROM public.support_tickets
      WHERE tenant_id IN (
        SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Tenant members can send messages"
  ON public.support_messages FOR INSERT TO authenticated
  WITH CHECK (
    is_internal = false
    AND sender_id = auth.uid()
    AND ticket_id IN (
      SELECT id FROM public.support_tickets
      WHERE tenant_id IN (
        SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Master admin can manage all messages"
  ON public.support_messages FOR ALL TO authenticated
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
