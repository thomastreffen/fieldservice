import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Package, Users, Clock, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const MODULE_LABELS: Record<string, string> = {
  crm: "CRM", postkontoret: "Postkontoret", ressursplanlegger: "Ressursplanlegger",
};

export default function PlansPage() {
  const navigate = useNavigate();

  const { data: plans, isLoading } = useQuery({
    queryKey: ["saas_plans"],
    queryFn: async () => {
      const { data, error } = await supabase.from("saas_plans").select("*").order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: subCounts } = useQuery({
    queryKey: ["sub_counts_by_plan"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tenant_subscriptions").select("plan_id, status");
      if (error) throw error;
      const counts: Record<string, { total: number; trial: number; active: number }> = {};
      data?.forEach((s) => {
        if (!counts[s.plan_id]) counts[s.plan_id] = { total: 0, trial: 0, active: 0 };
        counts[s.plan_id].total++;
        if (s.status === "trial") counts[s.plan_id].trial++;
        if (s.status === "active") counts[s.plan_id].active++;
      });
      return counts;
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Planer</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Pakker og prismodeller for VPKontroll</p>
        </div>
        <Button onClick={() => navigate("/admin/plans/new")} className="gap-2">
          <Plus className="w-4 h-4" /> Ny plan
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <Card className="col-span-full">
            <CardContent className="p-8 text-center text-muted-foreground">Laster...</CardContent>
          </Card>
        ) : !plans?.length ? (
          <Card className="col-span-full">
            <CardContent className="p-12 text-center">
              <Package className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground mb-4">Ingen planer opprettet ennå</p>
              <Button onClick={() => navigate("/admin/plans/new")} variant="outline" className="gap-2">
                <Plus className="w-4 h-4" /> Opprett første plan
              </Button>
            </CardContent>
          </Card>
        ) : (
          plans.map((p) => {
            const counts = subCounts?.[p.id] || { total: 0, trial: 0, active: 0 };
            const included = (p.included_modules as string[] || []);
            const addon = ((p as any).addon_modules as string[] || []);
            return (
              <Card
                key={p.id}
                className={cn(
                  "border-border/50 relative hover:border-border transition-colors cursor-pointer group",
                  !p.is_active && "opacity-60"
                )}
                onClick={() => navigate(`/admin/plans/${p.id}`)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base leading-tight">{p.name}</CardTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={e => { e.stopPropagation(); navigate(`/admin/plans/${p.id}`); }}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{p.description}</p>
                </CardHeader>

                <CardContent className="space-y-3">
                  <div>
                    <span className="text-2xl font-bold">{Number(p.price_monthly).toLocaleString("nb-NO")} kr</span>
                    <span className="text-sm text-muted-foreground"> /mnd</span>
                    {Number(p.price_yearly) > 0 && (
                      <p className="text-xs text-muted-foreground">{Number(p.price_yearly).toLocaleString("nb-NO")} kr/år</p>
                    )}
                  </div>

                  {included.length > 0 && (
                    <div className="space-y-1">
                      {included.map(m => (
                        <div key={m} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                          {MODULE_LABELS[m] || m}
                        </div>
                      ))}
                      {addon.map(m => (
                        <div key={m} className="flex items-center gap-1.5 text-xs text-muted-foreground/60">
                          <span className="h-3 w-3 flex items-center justify-center text-[10px] shrink-0">+</span>
                          {MODULE_LABELS[m] || m} (tillegg)
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1 border-t border-border/50">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {p.trial_days}d trial
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" /> {p.max_users || "∞"} brukere
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className={cn("text-[10px]", counts.active > 0 ? "bg-accent/10 text-accent border-accent/20" : "")}>
                      {counts.active} aktive
                    </Badge>
                    <Badge variant="outline" className={cn("text-[10px]", counts.trial > 0 ? "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800" : "")}>
                      {counts.trial} trial
                    </Badge>
                    {!p.is_active && <Badge variant="destructive" className="text-[10px]">Inaktiv</Badge>}
                    {!p.is_visible && <Badge variant="outline" className="text-[10px]">Skjult</Badge>}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
