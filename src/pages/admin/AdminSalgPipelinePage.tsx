import { useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Plus, TrendingUp } from "lucide-react";

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

type Lead = {
  id: string;
  name: string;
  email: string | null;
  company: string | null;
  source: string;
  deal_stage: string;
  created_at: string;
  verticals: { slug: string; display_name: string } | null;
};

export default function AdminSalgPipelinePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const dragId = useRef<string | null>(null);

  const { data: leads = [], isLoading } = useQuery<Lead[]>({
    queryKey: ["admin-sales-leads"],
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("sales_leads")
        .select("id, name, email, company, source, deal_stage, created_at, verticals(slug, display_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Lead[];
    },
  });

  const moveLead = useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: string }) => {
      const { error } = await (supabase as any)
        .from("sales_leads")
        .update({ deal_stage: stage, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, stage }) => {
      await qc.cancelQueries({ queryKey: ["admin-sales-leads"] });
      const prev = qc.getQueryData<Lead[]>(["admin-sales-leads"]);
      qc.setQueryData<Lead[]>(["admin-sales-leads"], (old) =>
        (old ?? []).map((l) => (l.id === id ? { ...l, deal_stage: stage } : l))
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["admin-sales-leads"], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["admin-sales-leads"] }),
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
          <TrendingUp className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-bold">Salgs-pipeline</h1>
        </div>
        <Button size="sm" onClick={() => navigate("/admin/salg/new")} className="gap-1.5">
          <Plus className="w-4 h-4" /> Ny lead
        </Button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {STAGES.map((stage) => {
          const col = leads.filter((l) => l.deal_stage === stage);
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
                  moveLead.mutate({ id: dragId.current, stage });
                }
                dragId.current = null;
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{stage}</span>
                <span className="text-xs font-bold text-muted-foreground">{col.length}</span>
              </div>
              {col.map((lead) => (
                <div
                  key={lead.id}
                  draggable
                  onDragStart={() => { dragId.current = lead.id; }}
                  onClick={() => navigate(`/admin/salg/${lead.id}`)}
                  className="bg-card border border-border rounded-lg p-3 cursor-pointer hover:shadow-md hover:border-primary/30 transition-all space-y-2"
                >
                  <p className="font-semibold text-sm leading-tight">{lead.name}</p>
                  {lead.company && <p className="text-xs text-muted-foreground">{lead.company}</p>}
                  {lead.email && <p className="text-xs text-muted-foreground truncate">{lead.email}</p>}
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0.5", SOURCE_COLORS[lead.source])}>
                      {SOURCE_LABELS[lead.source] ?? lead.source}
                    </Badge>
                    {lead.verticals && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                        {lead.verticals.display_name}
                      </Badge>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">{daysSince(lead.created_at)}d siden</p>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
