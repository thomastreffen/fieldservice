import { useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Plus, Users } from "lucide-react";

const STAGES = [
  "Ny lead",
  "Kontaktet",
  "Demo booket",
  "Tilbud sendt",
  "Konvertert",
  "Tapt",
] as const;
type Stage = (typeof STAGES)[number];

const STAGE_COLORS: Record<Stage, string> = {
  "Ny lead":      "bg-blue-50   border-blue-200   dark:bg-blue-950/30   dark:border-blue-800",
  "Kontaktet":    "bg-violet-50 border-violet-200 dark:bg-violet-950/30 dark:border-violet-800",
  "Demo booket":  "bg-amber-50  border-amber-200  dark:bg-amber-950/30  dark:border-amber-800",
  "Tilbud sendt": "bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-800",
  "Konvertert":   "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800",
  "Tapt":         "bg-muted border-border",
};

const SOURCE_LABELS: Record<string, string> = {
  kontaktskjema: "Kontaktskjema",
  trial: "Trial",
  manuelt: "Manuelt",
};
const SOURCE_COLORS: Record<string, string> = {
  kontaktskjema: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  trial: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  manuelt: "bg-muted text-muted-foreground",
};

function daysSince(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

type Contact = {
  id: string;
  name: string;
  email: string | null;
  company: string | null;
  source: string;
  deal_stage: string;
  created_at: string;
  verticals: { slug: string; display_name: string } | null;
};

export default function AdminCrmPipelinePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const dragId = useRef<string | null>(null);

  const { data: contacts = [], isLoading } = useQuery<Contact[]>({
    queryKey: ["admin-crm-contacts"],
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("platform_contacts")
        .select("id, name, email, company, source, deal_stage, created_at, verticals(slug, display_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Contact[];
    },
  });

  const moveContact = useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: string }) => {
      const { error } = await (supabase as any)
        .from("platform_contacts")
        .update({ deal_stage: stage, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, stage }) => {
      await qc.cancelQueries({ queryKey: ["admin-crm-contacts"] });
      const prev = qc.getQueryData<Contact[]>(["admin-crm-contacts"]);
      qc.setQueryData<Contact[]>(["admin-crm-contacts"], (old) =>
        (old ?? []).map((c) => (c.id === id ? { ...c, deal_stage: stage } : c))
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["admin-crm-contacts"], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["admin-crm-contacts"] }),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-bold">CRM Pipeline</h1>
        </div>
        <Button size="sm" onClick={() => navigate("/admin/crm/new")} className="gap-1.5">
          <Plus className="w-4 h-4" /> Ny kontakt
        </Button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {STAGES.map((stage) => {
          const col = contacts.filter((c) => c.deal_stage === stage);
          return (
            <div
              key={stage}
              className={cn(
                "flex-shrink-0 w-64 rounded-xl border-2 p-3 flex flex-col gap-3 min-h-[200px]",
                STAGE_COLORS[stage]
              )}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragId.current) {
                  moveContact.mutate({ id: dragId.current, stage });
                }
                dragId.current = null;
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{stage}</span>
                <span className="text-xs font-bold text-muted-foreground">{col.length}</span>
              </div>
              {col.map((contact) => (
                <div
                  key={contact.id}
                  draggable
                  onDragStart={() => { dragId.current = contact.id; }}
                  onClick={() => navigate(`/admin/crm/${contact.id}`)}
                  className="bg-card border border-border rounded-lg p-3 cursor-pointer hover:shadow-md hover:border-primary/30 transition-all space-y-2"
                >
                  <p className="font-semibold text-sm leading-tight">{contact.name}</p>
                  {contact.company && <p className="text-xs text-muted-foreground">{contact.company}</p>}
                  {contact.email && <p className="text-xs text-muted-foreground truncate">{contact.email}</p>}
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0.5", SOURCE_COLORS[contact.source])}>
                      {SOURCE_LABELS[contact.source] ?? contact.source}
                    </Badge>
                    {contact.verticals && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                        {contact.verticals.display_name}
                      </Badge>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">{daysSince(contact.created_at)}d siden</p>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
