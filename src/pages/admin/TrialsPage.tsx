import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Users, AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Tenant = {
  id: string;
  name: string;
  slug: string;
  status: string;
  trial_ends_at: string | null;
  vertical_id: string | null;
  updated_at: string;
  vertical: { id: string; slug: string; display_name: string; color: string | null } | null;
};

function daysLeft(dateStr: string | null): number | null {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export default function TrialsPage() {
  const navigate = useNavigate();
  const [verticalFilter, setVerticalFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: tenants, isLoading } = useQuery<Tenant[]>({
    queryKey: ["trial_tenants"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("tenants")
        .select("id, name, slug, status, trial_ends_at, vertical_id, updated_at, vertical:verticals(id, slug, display_name, color)")
        .in("status", ["trial", "active"])
        .order("trial_ends_at", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data as Tenant[];
    },
  });

  const { data: userCounts } = useQuery<Record<string, number>>({
    queryKey: ["tenant_user_counts"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("profiles").select("tenant_id");
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data as { tenant_id: string }[]).forEach((p) => {
        counts[p.tenant_id] = (counts[p.tenant_id] ?? 0) + 1;
      });
      return counts;
    },
  });

  const verticals = Array.from(
    new Map(
      (tenants ?? [])
        .filter((t) => t.vertical)
        .map((t) => [t.vertical!.id, t.vertical!])
    ).values()
  );

  function getStatusLabel(t: Tenant): "active_trial" | "expired" | "converted" {
    if (t.status === "active") return "converted";
    const d = daysLeft(t.trial_ends_at);
    if (d !== null && d <= 0) return "expired";
    return "active_trial";
  }

  const filtered = (tenants ?? []).filter((t) => {
    if (verticalFilter !== "all" && t.vertical?.id !== verticalFilter) return false;
    const sl = getStatusLabel(t);
    if (statusFilter === "active_trial" && sl !== "active_trial") return false;
    if (statusFilter === "expired" && sl !== "expired") return false;
    if (statusFilter === "converted" && sl !== "converted") return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Trials</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {(tenants ?? []).filter((t) => t.status === "trial").length} aktive prøveperioder
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Select value={verticalFilter} onValueChange={setVerticalFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Alle vertikaler" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle vertikaler</SelectItem>
            {verticals.map((v) => (
              <SelectItem key={v.id} value={v.id}>{v.display_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Alle statuser" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle statuser</SelectItem>
            <SelectItem value="active_trial">Aktiv trial</SelectItem>
            <SelectItem value="expired">Utløpt</SelectItem>
            <SelectItem value="converted">Konvertert</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {isLoading ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">Laster...</CardContent></Card>
      ) : !filtered.length ? (
        <Card><CardContent className="p-12 text-center">
          <Clock className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">Ingen treff</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((t) => {
            const days = daysLeft(t.trial_ends_at);
            const sl = getStatusLabel(t);
            const userCount = userCounts?.[t.id] ?? 0;
            return (
              <Card
                key={t.id}
                className={cn(
                  "border-border/50 hover:border-border transition-colors",
                  sl === "expired" && "border-orange-200 dark:border-orange-800",
                  sl === "converted" && "opacity-70"
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold shrink-0"
                        style={{
                          backgroundColor: t.vertical?.color ? t.vertical.color + "20" : undefined,
                          color: t.vertical?.color ?? undefined,
                        }}
                      >
                        {t.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{t.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                          {t.vertical && <span>{t.vertical.display_name}</span>}
                          <span>·</span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" /> {userCount}
                          </span>
                          <span>·</span>
                          <span>
                            Sist aktiv {new Date(t.updated_at).toLocaleDateString("nb-NO")}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {sl === "active_trial" && days !== null && (
                        <span
                          className={cn(
                            "text-xs font-semibold",
                            days <= 3
                              ? "text-red-600 dark:text-red-400"
                              : days <= 7
                              ? "text-yellow-600 dark:text-yellow-400"
                              : "text-emerald-600 dark:text-emerald-400"
                          )}
                        >
                          {days} dager igjen
                        </span>
                      )}
                      {sl === "expired" && (
                        <Badge variant="outline" className="text-[10px] border-orange-300 text-orange-700 bg-orange-50 dark:bg-orange-950/20 dark:text-orange-400">
                          <AlertTriangle className="w-3 h-3 mr-1" />Utløpt
                        </Badge>
                      )}
                      {sl === "converted" && (
                        <Badge variant="outline" className="text-[10px] bg-accent/10 text-accent border-accent/20">
                          <CheckCircle2 className="w-3 h-3 mr-1" />Aktiv
                        </Badge>
                      )}
                      {sl !== "converted" && (
                        <Button
                          size="sm"
                          className="gap-1.5"
                          onClick={() => navigate(`/admin/trials/${t.id}/convert`)}
                        >
                          Konverter til betalt <ArrowRight className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
