import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  ArrowLeft, Users, Puzzle, Pause, Play, Mail, CalendarDays, TrendingUp,
  Thermometer, Zap, Droplets, Layers, Activity, CreditCard, Clock,
  Eye, UserPlus, CheckCircle2, XCircle, CalendarX, Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Tables } from "@/integrations/supabase/types";

type TenantStatus = Tables<"tenants">["status"];

const statusLabels: Record<TenantStatus, string> = {
  active: "Aktiv", trial: "Prøveperiode", inactive: "Inaktiv", suspended: "Suspendert",
};
const statusColors: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400",
  trial: "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400",
  inactive: "bg-muted text-muted-foreground",
  suspended: "bg-destructive/10 text-destructive border-destructive/20",
};

const VERTICAL_ICONS: Record<string, typeof Layers> = {
  thermometer: Thermometer, zap: Zap, droplets: Droplets,
};
const MODULE_ICONS: Record<string, typeof Layers> = {
  crm: TrendingUp, postkontoret: Mail, ressursplanlegger: CalendarDays, service: Wrench,
};
const ENTITY_LABELS: Record<string, string> = {
  company: "Kunde", job: "Jobb", deal: "Salg", asset: "Anlegg",
  agreement: "Avtale", warranty: "Garanti", contact: "Kontakt",
};

export default function TenantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [statusAction, setStatusAction] = useState<TenantStatus | null>(null);

  // ── Queries ──────────────────────────────────────────────────────────────
  const { data: tenant, isLoading } = useQuery({
    queryKey: ["tenant", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("tenants").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: subscription } = useQuery({
    queryKey: ["tenant_subscription", id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("tenant_subscriptions").select("*, saas_plans(*)").eq("tenant_id", id!).maybeSingle();
      return data as { trial_ends_at: string | null; status: string; saas_plans: { name: string; price_monthly: number; trial_days: number; included_modules: string[]; max_users: number | null } | null } | null;
    },
    enabled: !!id,
  });

  const { data: modules } = useQuery({
    queryKey: ["tenant_modules", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("tenant_modules").select("*").eq("tenant_id", id!);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: platformModules } = useQuery({
    queryKey: ["platform_modules"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("platform_modules").select("*").order("name");
      return (data ?? []) as { id: string; slug: string; name: string; is_core: boolean }[];
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ["tenant_profiles", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("tenant_id", id!);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: roles } = useQuery({
    queryKey: ["tenant_roles", id],
    queryFn: async () => {
      const [{ data: r }, { data: a }] = await Promise.all([
        supabase.from("tenant_roles").select("*").eq("tenant_id", id!),
        supabase.from("tenant_user_role_assignments").select("*").eq("tenant_id", id!),
      ]);
      return { roles: r ?? [], assignments: a ?? [] };
    },
    enabled: !!id,
  });

  const { data: activityLog } = useQuery({
    queryKey: ["tenant_activity", id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("activity_log").select("*").eq("tenant_id", id!)
        .order("created_at", { ascending: false }).limit(20);
      return (data ?? []) as { id: string; entity_type: string; action: string; title: string | null; performed_by: string | null; created_at: string }[];
    },
    enabled: !!id,
  });

  const { data: verticals } = useQuery({
    queryKey: ["verticals"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("verticals").select("id, slug, display_name, icon, color").order("display_name");
      return (data ?? []) as { id: string; slug: string; display_name: string; icon: string | null; color: string }[];
    },
  });

  // ── Mutations ─────────────────────────────────────────────────────────────
  const statusMutation = useMutation({
    mutationFn: async (newStatus: TenantStatus) => {
      const { error } = await supabase.from("tenants").update({ status: newStatus }).eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant", id] });
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      toast.success("Status oppdatert");
      setStatusAction(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const verticalMutation = useMutation({
    mutationFn: async (verticalId: string | null) => {
      const { error } = await (supabase as any).from("tenants").update({ vertical_id: verticalId }).eq("id", id!);
      if (error) throw error;
      const { data: allPm } = await (supabase as any).from("platform_modules").select("slug");
      const enabled = new Set<string>();
      if (verticalId) {
        const { data: vm } = await (supabase as any).from("vertical_modules")
          .select("module_slug, enabled_by_default").eq("vertical_id", verticalId);
        for (const m of (vm ?? [])) if (m.enabled_by_default) enabled.add(m.module_slug);
      }
      for (const { slug } of (allPm ?? [])) {
        const isActive = enabled.has(slug);
        const existing = modules?.find(m => m.module_name === slug);
        if (existing) {
          await (supabase as any).from("tenant_modules")
            .update({ is_active: isActive, deactivated_at: !isActive ? new Date().toISOString() : null })
            .eq("id", existing.id);
        } else if (isActive) {
          await (supabase as any).from("tenant_modules")
            .insert({ tenant_id: id!, module_name: slug as any, is_active: true, activated_at: new Date().toISOString() });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant", id] });
      queryClient.invalidateQueries({ queryKey: ["tenant_modules", id] });
      toast.success("Vertikal og moduler oppdatert");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleModuleMutation = useMutation({
    mutationFn: async ({ slug, isActive }: { slug: string; isActive: boolean }) => {
      const existing = modules?.find(m => m.module_name === slug);
      if (existing) {
        const { error } = await supabase.from("tenant_modules").update({
          is_active: isActive,
          activated_at: isActive ? new Date().toISOString() : existing.activated_at,
          deactivated_at: !isActive ? new Date().toISOString() : null,
        }).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("tenant_modules").insert({
          tenant_id: id!, module_name: slug as any, is_active: isActive,
          activated_at: isActive ? new Date().toISOString() : null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant_modules", id] });
      toast.success("Modul oppdatert");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── Guards ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }
  if (!tenant) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Tenant ikke funnet</p>
        <Button asChild variant="ghost" className="mt-4"><Link to="/admin/tenants">Tilbake</Link></Button>
      </div>
    );
  }

  // ── Derived values ────────────────────────────────────────────────────────
  const tenantVerticalId = (tenant as any).vertical_id as string | null;
  const currentVertical = verticals?.find(v => v.id === tenantVerticalId) ?? null;
  const VerticalIcon = (currentVertical?.icon && VERTICAL_ICONS[currentVertical.icon]) || Layers;

  const activeModules = modules?.filter(m => m.is_active) ?? [];
  const daysSinceCreated = Math.floor((Date.now() - new Date(tenant.created_at).getTime()) / 864e5);
  const activeUsers = profiles?.filter(p => (p as any).is_active !== false).length ?? 0;

  const plan = subscription?.saas_plans ?? null;
  const trialEndsAt = subscription?.trial_ends_at ?? null;
  const trialDays = plan?.trial_days ?? 14;
  const daysRemaining = trialEndsAt
    ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 864e5))
    : null;
  const trialPct = trialDays > 0 && daysRemaining !== null
    ? Math.min(100, Math.round(((trialDays - daysRemaining) / trialDays) * 100))
    : 0;

  const resolvePerformer = (userId: string | null) => {
    if (!userId) return "System";
    const p = profiles?.find(prof => prof.user_id === userId);
    return p?.full_name || p?.email || "Ukjent";
  };

  const isTrial = tenant.status === "trial" && daysRemaining !== null;

  return (
    <div className="space-y-6 pb-12">

      {/* ── 1. STICKY HEADER ─────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 -mx-6 lg:-mx-8 px-6 lg:px-8 py-3 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <Button asChild variant="ghost" size="icon" className="shrink-0">
              <Link to="/admin/tenants"><ArrowLeft className="w-4 h-4" /></Link>
            </Button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-bold leading-tight">{tenant.name}</h1>
                <Badge variant="outline" className={cn("text-[11px] shrink-0", statusColors[tenant.status])}>
                  {statusLabels[tenant.status]}
                </Badge>
                {currentVertical && (
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium text-white shrink-0"
                    style={{ backgroundColor: currentVertical.color }}
                  >
                    <VerticalIcon className="h-3 w-3" />
                    {currentVertical.display_name}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">
                {tenant.slug}{tenant.domain ? ` · ${tenant.domain}` : ""} · Opprettet {new Date(tenant.created_at).toLocaleDateString("nb-NO")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <Select
              value={tenantVerticalId ?? "none"}
              onValueChange={v => verticalMutation.mutate(v === "none" ? null : v)}
              disabled={verticalMutation.isPending}
            >
              <SelectTrigger className="h-8 w-40 text-xs">
                <SelectValue placeholder="Velg vertikal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Ingen vertikal</SelectItem>
                {verticals?.map(v => <SelectItem key={v.id} value={v.id}>{v.display_name}</SelectItem>)}
              </SelectContent>
            </Select>

            {tenant.status === "suspended" ? (
              <Button variant="outline" size="sm" onClick={() => setStatusAction("active")}>
                <Play className="w-3.5 h-3.5 mr-1.5" /> Reaktiver
              </Button>
            ) : tenant.status !== "inactive" ? (
              <Button variant="outline" size="sm"
                className="text-destructive hover:text-destructive border-destructive/30"
                onClick={() => setStatusAction("suspended")}>
                <Pause className="w-3.5 h-3.5 mr-1.5" /> Suspender
              </Button>
            ) : null}

            <Button variant="outline" size="sm" onClick={() => toast.info("Impersonering er ikke implementert ennå")}>
              <Eye className="w-3.5 h-3.5 mr-1.5" /> Impersoner
            </Button>
          </div>
        </div>
      </div>

      {/* ── 2. USAGE STATS ───────────────────────────────────────────── */}
      <div className={cn("grid gap-4", isTrial ? "grid-cols-2 lg:grid-cols-5" : "grid-cols-2 lg:grid-cols-3")}>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-2xl font-bold">{profiles?.length ?? 0}</p>
                <p className="text-xs font-medium text-muted-foreground mt-0.5">Totalt brukere</p>
                <p className="text-[11px] text-muted-foreground/70 mt-0.5">{activeUsers} aktive</p>
              </div>
              <div className="p-2 rounded-lg bg-muted"><Users className="w-4 h-4 text-muted-foreground" /></div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-2xl font-bold">{activeModules.length}</p>
                <p className="text-xs font-medium text-muted-foreground mt-0.5">Aktive moduler</p>
                <p className="text-[11px] text-muted-foreground/70 mt-0.5">av {platformModules?.length ?? 0} tilgjengelige</p>
              </div>
              <div className="p-2 rounded-lg bg-muted"><Puzzle className="w-4 h-4 text-muted-foreground" /></div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-2xl font-bold">{daysSinceCreated}</p>
                <p className="text-xs font-medium text-muted-foreground mt-0.5">Dager aktiv</p>
                <p className="text-[11px] text-muted-foreground/70 mt-0.5">siden {new Date(tenant.created_at).toLocaleDateString("nb-NO")}</p>
              </div>
              <div className="p-2 rounded-lg bg-muted"><Clock className="w-4 h-4 text-muted-foreground" /></div>
            </div>
          </CardContent>
        </Card>

        {isTrial && (
          <Card className="border-yellow-200 dark:border-yellow-900/40 lg:col-span-2">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-2xl font-bold">{daysRemaining}</p>
                  <p className="text-xs font-medium text-muted-foreground mt-0.5">Dager igjen av prøveperiode</p>
                  <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                    Utløper {new Date(trialEndsAt!).toLocaleDateString("nb-NO")}
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-yellow-50 dark:bg-yellow-900/30">
                  <CalendarX className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                </div>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${trialPct}%`,
                    backgroundColor: trialPct > 80 ? "#ef4444" : trialPct > 50 ? "#f59e0b" : "#22c55e",
                  }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1.5">{trialPct}% av prøveperioden brukt</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── 3 & 5: MODULES + BILLING ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* MODULE USAGE */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Puzzle className="w-4 h-4" /> Moduler
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {(platformModules ?? []).map(pm => {
                const mod = modules?.find(m => m.module_name === pm.slug);
                const active = mod?.is_active ?? false;
                const ModIcon = MODULE_ICONS[pm.slug] ?? Puzzle;
                return (
                  <div key={pm.slug} className={cn("flex items-center gap-3 px-5 py-3 transition-opacity", !active && "opacity-50")}>
                    <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center shrink-0",
                      active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                      <ModIcon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-medium">{pm.name}</p>
                        <Badge variant={pm.is_core ? "secondary" : "outline"} className="text-[10px]">
                          {pm.is_core ? "Kjerne" : "Tillegg"}
                        </Badge>
                      </div>
                      {active && mod?.activated_at && (
                        <p className="text-[11px] text-muted-foreground">
                          Aktivert {new Date(mod.activated_at).toLocaleDateString("nb-NO")}
                        </p>
                      )}
                    </div>
                    <Switch
                      checked={active}
                      onCheckedChange={v => toggleModuleMutation.mutate({ slug: pm.slug, isActive: v })}
                      disabled={toggleModuleMutation.isPending}
                    />
                  </div>
                );
              })}
              {!platformModules?.length && (
                <p className="text-sm text-muted-foreground text-center py-6">Ingen plattformmoduler konfigurert</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* BILLING SUMMARY */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <CreditCard className="w-4 h-4" /> Fakturering
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 rounded-lg border border-border/50 bg-muted/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">{plan?.name ?? "Ingen plan"}</p>
                  <p className="text-xs text-muted-foreground">
                    {plan ? `${plan.price_monthly?.toLocaleString("nb-NO") ?? "0"} kr/mnd` : "Ikke tilknyttet plan"}
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px]">
                  {subscription?.status === "trial" ? "Prøve" : subscription?.status === "active" ? "Aktiv" : subscription?.status ?? "—"}
                </Badge>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Tilleggsmoduler</p>
              {(() => {
                const included = new Set(plan?.included_modules ?? []);
                const addOns = activeModules.filter(m => !included.has(m.module_name));
                return addOns.length === 0
                  ? <p className="text-xs text-muted-foreground py-1">Ingen tilleggsmoduler aktivert</p>
                  : addOns.map(m => {
                    const ModIcon = MODULE_ICONS[m.module_name] ?? Puzzle;
                    return (
                      <div key={m.id} className="flex items-center justify-between py-1.5 text-sm">
                        <div className="flex items-center gap-2">
                          <ModIcon className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="capitalize">{m.module_name}</span>
                        </div>
                        <span className="text-xs text-muted-foreground font-mono">— kr/mnd</span>
                      </div>
                    );
                  });
              })()}
            </div>

            <div className="pt-3 border-t border-border space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Brukerseter</span>
                <span className="font-medium">
                  {profiles?.length ?? 0}{plan?.max_users ? ` / ${plan.max_users}` : ""} brukere
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">Per-sete prising kobles til i neste versjon</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── 4. USER LIST ─────────────────────────────────────────────── */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Users className="w-4 h-4" /> Brukere ({profiles?.length ?? 0})
            </CardTitle>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs"
              onClick={() => toast.info("Brukerinvitasjon settes opp i neste versjon")}>
              <UserPlus className="w-3.5 h-3.5" /> Inviter bruker
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {!profiles?.length ? (
            <p className="text-sm text-muted-foreground text-center py-8">Ingen brukere tilknyttet</p>
          ) : (
            <>
              <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto] gap-3 px-5 py-2 border-y border-border bg-muted/30 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                <span>Navn</span>
                <span>E-post</span>
                <span className="w-32">Roller</span>
                <span className="w-8 text-center">OK</span>
              </div>
              <div className="divide-y divide-border">
                {profiles.map(p => {
                  const userRoles = roles?.assignments.filter(a => a.user_id === p.user_id) ?? [];
                  const roleNames = userRoles.map(ur => roles?.roles.find(r => r.id === ur.role_id)?.name).filter(Boolean) as string[];
                  const isActive = (p as any).is_active !== false;
                  return (
                    <div key={p.id} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto] gap-3 items-center px-5 py-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={cn("w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                          isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                          {(p.full_name?.[0] || p.email?.[0] || "?").toUpperCase()}
                        </div>
                        <span className="text-sm font-medium truncate">{p.full_name || "—"}</span>
                      </div>
                      <span className="text-xs text-muted-foreground truncate">{p.email}</span>
                      <div className="w-32 flex gap-1 flex-wrap">
                        {roleNames.length
                          ? roleNames.map(rn => <Badge key={rn} variant="outline" className="text-[10px]">{rn}</Badge>)
                          : <span className="text-xs text-muted-foreground">—</span>}
                      </div>
                      <div className="w-8 flex justify-center">
                        {isActive
                          ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          : <XCircle className="w-4 h-4 text-muted-foreground" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── 6. ACTIVITY LOG ──────────────────────────────────────────── */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Activity className="w-4 h-4" /> Aktivitetslogg
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!activityLog?.length ? (
            <p className="text-sm text-muted-foreground text-center py-8">Ingen aktivitet registrert ennå</p>
          ) : (
            <div className="divide-y divide-border">
              {activityLog.map(entry => (
                <div key={entry.id} className="flex items-start gap-3 px-5 py-3">
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                    <Activity className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{entry.action}</span>
                      {entry.entity_type && (
                        <Badge variant="outline" className="text-[10px]">
                          {ENTITY_LABELS[entry.entity_type] ?? entry.entity_type}
                        </Badge>
                      )}
                    </div>
                    {entry.title && <p className="text-xs text-muted-foreground mt-0.5 truncate">{entry.title}</p>}
                    <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                      {resolvePerformer(entry.performed_by)} · {new Date(entry.created_at).toLocaleString("nb-NO")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status confirmation */}
      <AlertDialog open={!!statusAction} onOpenChange={o => { if (!o) setStatusAction(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Endre status til «{statusAction ? statusLabels[statusAction] : ""}»?</AlertDialogTitle>
            <AlertDialogDescription>
              {statusAction === "suspended"
                ? "Brukere i denne tenanten vil miste tilgang til systemet."
                : "Tenantens status vil bli oppdatert."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => statusAction && statusMutation.mutate(statusAction)}
              className={statusAction === "suspended" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
            >
              {statusMutation.isPending ? "Lagrer..." : "Bekreft"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
