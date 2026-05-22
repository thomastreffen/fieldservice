import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  ClipboardList, BookOpen, FileText, ChevronRight, Loader2, Check,
  AlertTriangle, Plus, Clock,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useHmsContextReady, HmsLoading } from "@/modules/hms-hr/context/HmsContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { startSubmission } from "@/lib/hms/submissions";
import { formatDistanceToNow } from "date-fns";
import { nb } from "date-fns/locale";

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

interface Template {
  id: string;
  kind: string;
  name: string;
  category: string;
  description: string | null;
  suggested_work_types: string[];
}

interface DraftSubmission {
  id: string;
  title: string;
  kind: string;
  status: string;
  created_at: string;
}

interface Handbook {
  id: string;
  title: string;
  category: string | null;
  updated_at: string;
  acknowledged: boolean;
}

// ────────────────────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────────────────────

export default function HmsMobilePage() {
  const navigate = useNavigate();
  const { user, tenantId } = useAuth();
  const { ready, loading } = useHmsContextReady();
  const [tab, setTab] = useState<"start" | "mine" | "handbook">("start");
  const [startingId, setStartingId] = useState<string | null>(null);

  // ── Templates ─────────────────────────────────────────────────────────────
  const { data: templates = [], isLoading: tplLoading } = useQuery<Template[]>({
    queryKey: ["hms-mobile-templates", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const sb = supabase as any;
      const { data, error } = await sb
        .from("hms_templates")
        .select("id, kind, name, category, description, suggested_work_types")
        .eq("tenant_id", tenantId!)
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("name");
      if (error) throw error;
      return (data ?? []) as Template[];
    },
  });

  // ── My drafts ─────────────────────────────────────────────────────────────
  const { data: myDrafts = [], isLoading: draftsLoading } = useQuery<DraftSubmission[]>({
    queryKey: ["hms-mobile-drafts", tenantId, user?.id],
    enabled: !!tenantId && !!user,
    queryFn: async () => {
      const sb = supabase as any;
      const { data, error } = await sb
        .from("hms_submissions")
        .select("id, title, kind, status, created_at")
        .eq("tenant_id", tenantId!)
        .eq("submitted_by", user!.id)
        .in("status", ["draft", "submitted"])
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as DraftSubmission[];
    },
  });

  // ── Handbooks ─────────────────────────────────────────────────────────────
  const { data: handbooks = [], isLoading: hbLoading } = useQuery<Handbook[]>({
    queryKey: ["hms-mobile-handbooks", tenantId, user?.id],
    enabled: !!tenantId && !!user,
    queryFn: async () => {
      const sb = supabase as any;
      const { data: hbs, error } = await sb
        .from("hms_handbooks")
        .select("id, title, category, updated_at")
        .eq("tenant_id", tenantId!)
        .eq("is_published", true)
        .is("deleted_at", null)
        .order("updated_at", { ascending: false });
      if (error) throw error;

      // Fetch acknowledgements for this user
      const ids = (hbs ?? []).map((h: any) => h.id);
      let ackIds: string[] = [];
      if (ids.length > 0) {
        const { data: acks } = await sb
          .from("hms_handbook_acknowledgements")
          .select("handbook_id")
          .eq("user_id", user!.id)
          .in("handbook_id", ids);
        ackIds = (acks ?? []).map((a: any) => a.handbook_id);
      }

      return (hbs ?? []).map((h: any) => ({
        ...h,
        acknowledged: ackIds.includes(h.id),
      })) as Handbook[];
    },
  });

  // ── Start submission ──────────────────────────────────────────────────────
  const startMut = useMutation({
    mutationFn: async (tpl: Template) => {
      if (!tenantId || !user) throw new Error("Mangler kontekst");
      setStartingId(tpl.id);
      const subId = await startSubmission({
        tenantId,
        templateId: tpl.id,
        userId: user.id,
        userName: (user as any).name || user.email || "Ukjent",
      });
      return subId;
    },
    onSuccess: (subId) => {
      setStartingId(null);
      navigate(`/hms/submissions/${subId}/fill`);
    },
    onError: (e: any) => {
      setStartingId(null);
      toast.error(e.message);
    },
  });

  // ── Acknowledge handbook ──────────────────────────────────────────────────
  const ackMut = useMutation({
    mutationFn: async (handbookId: string) => {
      if (!user || !tenantId) throw new Error("Mangler kontekst");
      const sb = supabase as any;
      const { error } = await sb.from("hms_handbook_acknowledgements").upsert(
        {
          handbook_id: handbookId,
          user_id: user.id,
          tenant_id: tenantId,
          acknowledged_at: new Date().toISOString(),
        },
        { onConflict: "handbook_id,user_id" }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Kvittert for lesing");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) return <HmsLoading label="Laster HMS..." />;

  // ── Render ────────────────────────────────────────────────────────────────
  const sjaTemplates = templates.filter((t) => t.kind === "sja");
  const checklistTemplates = templates.filter((t) => t.kind === "checklist");
  const unacknowledgedHandbooks = handbooks.filter((h) => !h.acknowledged);

  return (
    <div
      className="min-h-screen bg-background"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 80px)" }}
    >
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border/60">
        <div className="px-4 py-3 max-w-2xl mx-auto">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">HMS</div>
          <div className="text-lg font-semibold">Feltverktøy</div>
        </div>
      </header>

      <div className="px-4 py-4 max-w-2xl mx-auto">
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="start">Start</TabsTrigger>
            <TabsTrigger value="mine">
              Mine
              {myDrafts.filter((d) => d.status === "draft").length > 0 && (
                <Badge variant="secondary" className="ml-1 text-[9px] h-4 min-w-4 px-1">
                  {myDrafts.filter((d) => d.status === "draft").length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="handbook">
              Håndbok
              {unacknowledgedHandbooks.length > 0 && (
                <Badge variant="destructive" className="ml-1 text-[9px] h-4 min-w-4 px-1">
                  {unacknowledgedHandbooks.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ── Start tab ─────────────────────────────────────────── */}
          <TabsContent value="start" className="mt-4 space-y-4">
            {/* Quick actions */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => navigate("/hms/incident-report")}
                className="rounded-xl border-2 border-rose-300 bg-rose-50 p-4 text-left active:scale-[0.98] transition"
              >
                <AlertTriangle className="h-5 w-5 text-rose-600 mb-1.5" />
                <div className="text-sm font-semibold text-rose-900">Meld avvik/RUH</div>
                <div className="text-[11px] text-rose-700 mt-0.5">Rapporter hendelse</div>
              </button>
              <button
                onClick={() => setTab("mine")}
                className="rounded-xl border-2 border-border bg-card p-4 text-left active:scale-[0.98] transition"
              >
                <Clock className="h-5 w-5 text-muted-foreground mb-1.5" />
                <div className="text-sm font-semibold">Mine utkast</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  {myDrafts.filter((d) => d.status === "draft").length} aktive
                </div>
              </button>
            </div>

            {/* SJA templates */}
            {tplLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {sjaTemplates.length > 0 && (
                  <div className="space-y-2">
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-0.5">
                      SJA-maler
                    </h2>
                    {sjaTemplates.map((tpl) => (
                      <TemplateCard
                        key={tpl.id}
                        template={tpl}
                        loading={startingId === tpl.id}
                        onStart={() => startMut.mutate(tpl)}
                      />
                    ))}
                  </div>
                )}

                {checklistTemplates.length > 0 && (
                  <div className="space-y-2">
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-0.5">
                      Sjekklister
                    </h2>
                    {checklistTemplates.map((tpl) => (
                      <TemplateCard
                        key={tpl.id}
                        template={tpl}
                        loading={startingId === tpl.id}
                        onStart={() => startMut.mutate(tpl)}
                      />
                    ))}
                  </div>
                )}

                {templates.length === 0 && (
                  <Card className="border-dashed">
                    <CardContent className="py-10 text-center text-sm text-muted-foreground space-y-2">
                      <ClipboardList className="h-7 w-7 mx-auto text-muted-foreground/40" />
                      <div>Ingen aktive maler tilgjengelig</div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          {/* ── Mine tab ──────────────────────────────────────────── */}
          <TabsContent value="mine" className="mt-4 space-y-3">
            {draftsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : myDrafts.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-10 text-center text-sm text-muted-foreground space-y-2">
                  <FileText className="h-7 w-7 mx-auto text-muted-foreground/40" />
                  <div>Ingen aktive SJA-er eller sjekklister</div>
                  <Button size="sm" variant="outline" onClick={() => setTab("start")}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Start ny
                  </Button>
                </CardContent>
              </Card>
            ) : (
              myDrafts.map((sub) => (
                <button
                  key={sub.id}
                  className="w-full text-left"
                  onClick={() => navigate(`/hms/submissions/${sub.id}/fill`)}
                >
                  <Card className="border-border/60 hover:border-primary/40 transition-colors active:scale-[0.99]">
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{sub.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(sub.created_at), { addSuffix: true, locale: nb })}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge
                          variant={sub.status === "draft" ? "outline" : "secondary"}
                          className="text-[10px] uppercase"
                        >
                          {sub.status === "draft" ? "Utkast" : "Sendt inn"}
                        </Badge>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                </button>
              ))
            )}
          </TabsContent>

          {/* ── Handbook tab ──────────────────────────────────────── */}
          <TabsContent value="handbook" className="mt-4 space-y-3">
            {unacknowledgedHandbooks.length > 0 && (
              <Card className="border-amber-200 bg-amber-50">
                <CardContent className="p-3">
                  <div className="flex items-start gap-2 text-amber-800 text-sm">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>
                      Du har <strong>{unacknowledgedHandbooks.length}</strong> håndbøker du ikke har kvittert for.
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            {hbLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : handbooks.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-10 text-center text-sm text-muted-foreground space-y-2">
                  <BookOpen className="h-7 w-7 mx-auto text-muted-foreground/40" />
                  <div>Ingen håndbøker publisert enda</div>
                </CardContent>
              </Card>
            ) : (
              handbooks.map((hb) => (
                <Card key={hb.id} className="border-border/60">
                  <CardContent className="p-3 flex items-start gap-3">
                    <BookOpen className={`h-5 w-5 mt-0.5 shrink-0 ${hb.acknowledged ? "text-emerald-600" : "text-amber-500"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{hb.title}</div>
                      {hb.category && (
                        <div className="text-xs text-muted-foreground">{hb.category}</div>
                      )}
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        Oppdatert {formatDistanceToNow(new Date(hb.updated_at), { addSuffix: true, locale: nb })}
                      </div>
                    </div>
                    <div className="shrink-0">
                      {hb.acknowledged ? (
                        <span className="flex items-center gap-1 text-[11px] text-emerald-600">
                          <Check className="h-3.5 w-3.5" /> Kvittert
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7"
                          onClick={() => ackMut.mutate(hb.id)}
                          disabled={ackMut.isPending}
                        >
                          Kvitter
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// TemplateCard sub-component
// ────────────────────────────────────────────────────────────────────────────

function TemplateCard({
  template,
  loading,
  onStart,
}: {
  template: Template;
  loading: boolean;
  onStart: () => void;
}) {
  return (
    <Card className="border-border/60 active:scale-[0.99] transition-transform">
      <CardContent className="p-3 flex items-start gap-3">
        <ClipboardList className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm">{template.name}</div>
          {template.description && (
            <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{template.description}</div>
          )}
          {template.suggested_work_types?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {template.suggested_work_types.slice(0, 3).map((w) => (
                <Badge key={w} variant="outline" className="text-[9px] h-4 px-1">{w}</Badge>
              ))}
            </div>
          )}
        </div>
        <Button
          size="sm"
          className="shrink-0 h-8"
          onClick={onStart}
          disabled={loading}
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Plus className="h-3.5 w-3.5 mr-1" />Start</>}
        </Button>
      </CardContent>
    </Card>
  );
}
