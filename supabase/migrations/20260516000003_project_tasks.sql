-- Internal project management: project_tasks + task_comments

CREATE TABLE IF NOT EXISTS public.project_tasks (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT         NOT NULL,
  description     TEXT         NOT NULL DEFAULT '',
  type            TEXT         NOT NULL DEFAULT 'Intern oppgave'
                               CHECK (type IN ('Feil', 'Funksjonsønske', 'Intern oppgave', 'Tenant-bestilling')),
  priority        TEXT         NOT NULL DEFAULT 'Normal'
                               CHECK (priority IN ('Lav', 'Normal', 'Høy', 'Kritisk')),
  status          TEXT         NOT NULL DEFAULT 'Backlog'
                               CHECK (status IN ('Backlog', 'Under arbeid', 'Review', 'Ferdig')),
  assignee_id     UUID         REFERENCES auth.users(id),
  vertical_id     UUID         REFERENCES public.verticals(id),
  tenant_id       UUID         REFERENCES public.tenants(id),
  ticket_id       UUID         REFERENCES public.support_tickets(id),
  estimated_hours NUMERIC(6,2),
  logged_hours    NUMERIC(6,2) NOT NULL DEFAULT 0,
  created_by      UUID         NOT NULL REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.task_comments (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id    UUID        NOT NULL REFERENCES public.project_tasks(id) ON DELETE CASCADE,
  author_id  UUID        REFERENCES auth.users(id),
  comment    TEXT        NOT NULL,
  is_system  BOOLEAN     NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS project_tasks_status_idx ON public.project_tasks (status, created_at DESC);
CREATE INDEX IF NOT EXISTS task_comments_task_idx   ON public.task_comments (task_id, created_at ASC);

CREATE OR REPLACE FUNCTION public.touch_project_task()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER project_tasks_updated_at
  BEFORE UPDATE ON public.project_tasks
  FOR EACH ROW EXECUTE FUNCTION public.touch_project_task();

ALTER TABLE public.project_tasks  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Master admin can manage project tasks"
  ON public.project_tasks FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'master_admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'master_admin'));

CREATE POLICY "Master admin can manage task comments"
  ON public.task_comments FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'master_admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'master_admin'));
