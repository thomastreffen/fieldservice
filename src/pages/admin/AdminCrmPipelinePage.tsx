import { useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Plus, UserCircle2 } from "lucide-react";

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

function CrmSubNav() {
  const location = useLocation();
  return (
    <div className="flex gap-0 border-b border-border mb-5">
      <Link
        to="/admin/crm"
        className={cn(
          "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
          location.pathname === "/admin/crm"
            ? "border-primary text-foreground"
            : "border-transparent text-muted-foreground hover:text-foreground"
        )}
      >
        Pipeline
      </Link>
      <Link
        to="/admin/crm/contacts"
        className={cn(
          "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
          location.pathname.startsWith("/admin/crm/contacts")
            ? "border-primary text-foreground"
            : "border-transparent text-muted-foreground hover:text-foreground"
        )}
      >
        Kontakter
      </Link>
    </div>
  );
}

export { CrmSubNav };

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

  const byStage = (stage: Stage) =>
    contacts.filter((c) => (c.deal_stage ?? "Ny lead") === stage);

  return (
    <div className="space-y-0">
      <CrmSubNav />
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Salgspipeline</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{contacts.length} leads totalt</p>
          </div>
          <Button size="sm" onClick={() => navigate("/admin/crm/new")} className="gap-1.5">
            <Plus className="w-4 h-4" /> Ny kontakt
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: "calc(100vh - 260px)" }}>
            {STAGES.map((stage) => {
              const cards = byStage(stage);
              return (
                <div
                  key={stage}
                  className="flex flex-col gap-2 shrink-0 w-64"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (dragId.current) {
                      moveContact.mutate({ id: dragId.current, stage });
                    }
                    dragId.current = null;
                  }}
                >
                  <div className={cn(
                    "flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-semibold",
                    STAGE_COLORS[stage]
                  )}>
                    <span>{stage}</span>
                    <span className="bg-background/60 px-1.5 py-0.5 rounded-full font-bold">{cards.length}</span>
                  </div>

                  <div className="flex flex-col gap-2 flex-1 min-h-[60px] rounded-lg transition-colors">
                    {cards.map((c) => {
                      const days = daysSince(c.created_at);
                      return (
                        <div
                          key={c.id}
                          draggable
                          onDragStart={() => { dragId.current = c.id; }}
                          onClick={() => navigate(`/admin/crm/contacts/${c.id}`)}
                          className="bg-card border border-border rounded-xl p-3 cursor-grab active:cursor-grabbing hover:border-primary/30 hover:shadow-sm transition-all select-none"
                        >
                          <div className="flex items-start gap-2">
                            <UserCircle2 className="w-7 h-7 text-muted-foreground/40 shrink-0 mt-0.5" />
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-sm truncate">{c.name}</p>
                              {c.company && (
                                <p className="text-xs text-muted-foreground truncate">{c.company}</p>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-1 mt-2.5">
                            {c.verticals && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                                {c.verticals.display_name}
                              </span>
                            )}
                            {c.source && c.source !== "manuelt" && (
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
    </div>
  );
}
