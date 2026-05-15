import { useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { UserCircle2 } from "lucide-react";

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
};
const SOURCE_COLORS: Record<string, string> = {
  kontaktskjema: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  trial: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
};

const VERTICAL_COLORS: Record<string, string> = {
  varmepumpe: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  vvs:        "bg-cyan-100   text-cyan-700   dark:bg-cyan-900/30   dark:text-cyan-400",
  elektro:    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
};

function daysSince(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

type Contact = {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  title: string | null;       // company name
  vertical_slug: string | null;
  source: string | null;
  deal_stage: string | null;
  created_at: string;
};

export default function CrmPipelinePage() {
  const { tenantId } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const dragId = useRef<string | null>(null);

  const { data: contacts = [], isLoading } = useQuery<Contact[]>({
    queryKey: ["pipeline_contacts", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("crm_contacts")
        .select("id, first_name, last_name, email, title, vertical_slug, source, deal_stage, created_at")
        .eq("tenant_id", tenantId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Contact[];
    },
  });

  const moveMutation = useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: Stage }) => {
      const { error } = await (supabase as any)
        .from("crm_contacts")
        .update({ deal_stage: stage })
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, stage }) => {
      await qc.cancelQueries({ queryKey: ["pipeline_contacts", tenantId] });
      const prev = qc.getQueryData<Contact[]>(["pipeline_contacts", tenantId]);
      qc.setQueryData<Contact[]>(["pipeline_contacts", tenantId], (old) =>
        old?.map((c) => c.id === id ? { ...c, deal_stage: stage } : c) ?? []
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["pipeline_contacts", tenantId], ctx.prev);
    },
  });

  const byStage = (stage: Stage) =>
    contacts.filter((c) => (c.deal_stage ?? "Ny lead") === stage);

  function onDragStart(id: string) {
    dragId.current = id;
  }

  function onDrop(stage: Stage) {
    const id = dragId.current;
    if (!id) return;
    const contact = contacts.find((c) => c.id === id);
    if (contact && (contact.deal_stage ?? "Ny lead") !== stage) {
      moveMutation.mutate({ id, stage });
    }
    dragId.current = null;
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Salgspipeline</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{contacts.length} leads totalt</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: "calc(100vh - 200px)" }}>
          {STAGES.map((stage) => {
            const cards = byStage(stage);
            return (
              <div
                key={stage}
                className="flex flex-col gap-2 shrink-0 w-64"
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => onDrop(stage)}
              >
                {/* Column header */}
                <div className={cn(
                  "flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-semibold",
                  STAGE_COLORS[stage]
                )}>
                  <span>{stage}</span>
                  <span className="bg-background/60 px-1.5 py-0.5 rounded-full font-bold">{cards.length}</span>
                </div>

                {/* Drop zone */}
                <div className="flex flex-col gap-2 flex-1 min-h-[60px] rounded-lg transition-colors">
                  {cards.map((c) => {
                    const fullName = [c.first_name, c.last_name].filter(Boolean).join(" ");
                    const days = daysSince(c.created_at);
                    return (
                      <div
                        key={c.id}
                        draggable
                        onDragStart={() => onDragStart(c.id)}
                        onClick={() => navigate(`/tenant/crm/contacts/${c.id}`)}
                        className="bg-card border border-border rounded-xl p-3 cursor-grab active:cursor-grabbing hover:border-primary/30 hover:shadow-sm transition-all select-none"
                      >
                        <div className="flex items-start gap-2">
                          <UserCircle2 className="w-7 h-7 text-muted-foreground/40 shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-sm truncate">{fullName || "—"}</p>
                            {c.title && (
                              <p className="text-xs text-muted-foreground truncate">{c.title}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1 mt-2.5">
                          {c.vertical_slug && (
                            <span className={cn(
                              "text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
                              VERTICAL_COLORS[c.vertical_slug] ?? "bg-muted text-muted-foreground"
                            )}>
                              {c.vertical_slug}
                            </span>
                          )}
                          {c.source && (
                            <span className={cn(
                              "text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
                              SOURCE_COLORS[c.source] ?? "bg-muted text-muted-foreground"
                            )}>
                              {SOURCE_LABELS[c.source] ?? c.source}
                            </span>
                          )}
                        </div>

                        <p className="text-[10px] text-muted-foreground mt-2">
                          {days === 0 ? "I dag" : `${days} dag${days === 1 ? "" : "er"} siden`}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
