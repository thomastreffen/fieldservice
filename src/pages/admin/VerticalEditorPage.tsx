import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  ArrowLeft, Loader2, Thermometer, Zap, Droplets, Layers,
  Save, Mail, CalendarDays, TrendingUp, Puzzle, Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICON_OPTIONS = [
  { slug: "thermometer", Icon: Thermometer },
  { slug: "zap",         Icon: Zap },
  { slug: "droplets",    Icon: Droplets },
  { slug: "layers",      Icon: Layers },
];

const MODULE_ICONS: Record<string, typeof Layers> = {
  crm:               TrendingUp,
  postkontoret:      Mail,
  ressursplanlegger: CalendarDays,
  service:           Wrench,
};

interface Vertical {
  id: string; slug: string; display_name: string; description: string | null;
  icon: string | null; color: string; is_active: boolean;
}

interface PlatformModule {
  id: string; slug: string; name: string; description: string | null;
  icon: string | null; is_core: boolean;
}

interface VerticalModule {
  id: string; vertical_id: string; module_slug: string;
  enabled_by_default: boolean; is_core: boolean; display_order: number;
  label_overrides: Record<string, string>;
}

interface ModuleConfig {
  vertical_module_id: string | null;
  enabled: boolean;
  is_core: boolean;
  display_order: number;
  label_overrides: string;
}

export default function VerticalEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    display_name: "", slug: "", description: "",
    icon: "layers", color: "#6366f1", is_active: true,
  });
  const [platformModules, setPlatformModules] = useState<PlatformModule[]>([]);
  const [moduleConfigs, setModuleConfigs] = useState<Record<string, ModuleConfig>>({});

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const [vRes, pmRes, vmRes] = await Promise.all([
        (supabase as any).from("verticals").select("*").eq("id", id).single(),
        (supabase as any).from("platform_modules").select("*").order("name"),
        (supabase as any).from("vertical_modules").select("*").eq("vertical_id", id),
      ]);

      const v = vRes.data as Vertical;
      setConfig({
        display_name: v.display_name,
        slug: v.slug,
        description: v.description ?? "",
        icon: v.icon ?? "layers",
        color: v.color ?? "#6366f1",
        is_active: v.is_active,
      });

      const modules = (pmRes.data ?? []) as PlatformModule[];
      setPlatformModules(modules);

      const vmMap = new Map(((vmRes.data ?? []) as VerticalModule[]).map(m => [m.module_slug, m]));
      const configs: Record<string, ModuleConfig> = {};
      for (const pm of modules) {
        const vm = vmMap.get(pm.slug);
        configs[pm.slug] = {
          vertical_module_id: vm?.id ?? null,
          enabled: vm?.enabled_by_default ?? false,
          is_core: vm?.is_core ?? false,
          display_order: vm?.display_order ?? 0,
          label_overrides: JSON.stringify(vm?.label_overrides ?? {}, null, 2),
        };
      }
      setModuleConfigs(configs);
      setLoading(false);
    };
    load();
  }, [id]);

  const updateModule = (slug: string, updates: Partial<ModuleConfig>) =>
    setModuleConfigs(prev => ({ ...prev, [slug]: { ...prev[slug], ...updates } }));

  const save = async () => {
    for (const [slug, cfg] of Object.entries(moduleConfigs)) {
      try { JSON.parse(cfg.label_overrides); } catch {
        toast.error(`Ugyldig JSON i label overrides for «${slug}»`);
        return;
      }
    }

    setSaving(true);
    try {
      const { error: vErr } = await (supabase as any).from("verticals").update({
        display_name: config.display_name,
        slug: config.slug,
        description: config.description || null,
        icon: config.icon || null,
        color: config.color,
        is_active: config.is_active,
      }).eq("id", id!);
      if (vErr) throw vErr;

      for (const [slug, cfg] of Object.entries(moduleConfigs)) {
        const overrides = JSON.parse(cfg.label_overrides);
        const payload = {
          enabled_by_default: cfg.enabled,
          is_core: cfg.is_core,
          display_order: cfg.display_order,
          label_overrides: overrides,
        };
        if (cfg.vertical_module_id) {
          await (supabase as any).from("vertical_modules")
            .update(payload).eq("id", cfg.vertical_module_id);
        } else if (cfg.enabled || cfg.is_core) {
          const { data } = await (supabase as any).from("vertical_modules")
            .insert({ vertical_id: id!, module_slug: slug, ...payload })
            .select().single();
          if (data) updateModule(slug, { vertical_module_id: data.id });
        }
      }

      toast.success("Endringer lagret");
    } catch (e: any) {
      toast.error(e?.message ?? "Feil ved lagring");
    } finally {
      setSaving(false);
    }
  };

  const PreviewIcon = ICON_OPTIONS.find(o => o.slug === config.icon)?.Icon ?? Layers;

  const sortedModules = useMemo(
    () => [...platformModules].sort(
      (a, b) => (moduleConfigs[a.slug]?.display_order ?? 0) - (moduleConfigs[b.slug]?.display_order ?? 0)
    ),
    [platformModules, moduleConfigs]
  );

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 -mx-6 lg:-mx-8 px-6 lg:px-8 py-3 bg-background/95 backdrop-blur border-b border-border flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" className="shrink-0" onClick={() => navigate("/admin/verticals")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-lg font-bold leading-tight truncate">{config.display_name || "Vertikal"}</h1>
            <p className="text-xs text-muted-foreground font-mono">{config.slug}</p>
          </div>
        </div>
        <Button onClick={save} disabled={saving || !config.display_name} className="gap-2 shrink-0">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Lagre endringer
        </Button>
      </div>

      {/* ── Section 1: Vertical Config ─────────────────────────────────── */}
      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-semibold">Vertikalkonfigurasjon</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Form */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Navn</Label>
                  <Input
                    value={config.display_name}
                    onChange={e => setConfig(c => ({ ...c, display_name: e.target.value }))}
                    placeholder="Varmepumpe"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Slug</Label>
                  <Input
                    value={config.slug}
                    onChange={e => setConfig(c => ({ ...c, slug: e.target.value }))}
                    placeholder="varmepumpe"
                    className="font-mono text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Beskrivelse</Label>
                <Textarea
                  value={config.description}
                  onChange={e => setConfig(c => ({ ...c, description: e.target.value }))}
                  rows={2}
                  placeholder="Kort beskrivelse av bransjevertikalen"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Ikon</Label>
                <div className="flex gap-2 flex-wrap items-center">
                  {ICON_OPTIONS.map(({ slug, Icon }) => (
                    <button
                      key={slug}
                      type="button"
                      onClick={() => setConfig(c => ({ ...c, icon: slug }))}
                      className={cn(
                        "h-9 w-9 rounded-lg border flex items-center justify-center transition-all",
                        config.icon === slug
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </button>
                  ))}
                  <Input
                    value={config.icon}
                    onChange={e => setConfig(c => ({ ...c, icon: e.target.value }))}
                    className="flex-1 min-w-[90px] font-mono text-xs h-9"
                    placeholder="slug"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Farge</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={config.color}
                    onChange={e => setConfig(c => ({ ...c, color: e.target.value }))}
                    className="h-9 w-10 rounded border border-input p-0.5 cursor-pointer"
                  />
                  <Input
                    value={config.color}
                    onChange={e => setConfig(c => ({ ...c, color: e.target.value }))}
                    className="font-mono text-xs w-32"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <Switch
                  checked={config.is_active}
                  onCheckedChange={v => setConfig(c => ({ ...c, is_active: v }))}
                />
                <Label>Aktiv</Label>
              </div>
            </div>

            {/* Preview */}
            <div className="space-y-2">
              <Label>Forhåndsvisning</Label>
              <div className="rounded-xl border border-border bg-muted/20 p-6 flex flex-col items-center justify-center gap-4 min-h-[200px]">
                <div
                  className="h-16 w-16 rounded-2xl flex items-center justify-center text-white shadow-lg transition-all"
                  style={{ backgroundColor: config.color }}
                >
                  <PreviewIcon className="h-8 w-8" />
                </div>
                <div className="text-center space-y-1">
                  <p className="font-semibold text-base">{config.display_name || "Vertikal"}</p>
                  <p className="text-xs text-muted-foreground font-mono">{config.slug || "slug"}</p>
                </div>
                <div className="flex gap-2 flex-wrap justify-center">
                  <Badge
                    variant="outline"
                    style={{ borderColor: config.color, color: config.color }}
                  >
                    {config.slug || "slug"}
                  </Badge>
                  <Badge
                    style={config.is_active ? { backgroundColor: config.color, color: "#fff", border: "none" } : {}}
                    variant={config.is_active ? "default" : "secondary"}
                  >
                    {config.is_active ? "Aktiv" : "Inaktiv"}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Section 2: Module Manager ──────────────────────────────────── */}
      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Puzzle className="h-4 w-4" /> Modulhåndtering
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Konfigurer moduler for denne vertikalen. Endringer påvirker kun{" "}
            <span className="font-medium text-foreground">{config.display_name || "denne vertikalen"}</span>.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          {/* Column headers */}
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-2.5 border-y border-border bg-muted/30 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            <span>Modul</span>
            <span className="w-24 text-center">Type</span>
            <span className="w-16 text-center">Orden</span>
            <span className="w-14 text-center">Aktiv</span>
          </div>

          <div className="divide-y divide-border">
            {sortedModules.map(pm => {
              const cfg = moduleConfigs[pm.slug];
              if (!cfg) return null;
              const ModIcon = MODULE_ICONS[pm.slug] ?? Puzzle;

              return (
                <div key={pm.slug} className={cn("px-5 py-4 space-y-3 transition-colors", cfg.enabled ? "" : "opacity-60")}>
                  {/* Main row */}
                  <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center">
                    {/* Module identity */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cn(
                        "h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                        cfg.enabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                      )}>
                        <ModIcon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium leading-tight">{pm.name}</p>
                        <p className="text-[11px] font-mono text-muted-foreground">{pm.slug}</p>
                      </div>
                    </div>

                    {/* Core / Add-on toggle */}
                    <div className="w-24 flex justify-center">
                      <button
                        type="button"
                        onClick={() => updateModule(pm.slug, { is_core: !cfg.is_core })}
                        className={cn(
                          "text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-all whitespace-nowrap",
                          cfg.is_core
                            ? "bg-primary/10 text-primary border-primary/30 hover:bg-primary/20"
                            : "bg-muted text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                        )}
                      >
                        {cfg.is_core ? "Kjerne" : "Tillegg"}
                      </button>
                    </div>

                    {/* Display order */}
                    <div className="w-16 flex justify-center">
                      <Input
                        type="number"
                        value={cfg.display_order}
                        onChange={e => updateModule(pm.slug, { display_order: parseInt(e.target.value) || 0 })}
                        className="w-14 h-7 text-center text-xs px-1 font-mono"
                        min={0}
                      />
                    </div>

                    {/* Enabled toggle */}
                    <div className="w-14 flex justify-center">
                      <Switch
                        checked={cfg.enabled}
                        onCheckedChange={v => updateModule(pm.slug, { enabled: v })}
                      />
                    </div>
                  </div>

                  {/* Label overrides */}
                  <div className="ml-11 space-y-1">
                    <p className="text-[11px] text-muted-foreground font-medium">
                      Label overrides{" "}
                      <span className="font-mono font-normal opacity-70">JSON</span>
                    </p>
                    <Textarea
                      value={cfg.label_overrides}
                      onChange={e => updateModule(pm.slug, { label_overrides: e.target.value })}
                      rows={2}
                      className="font-mono text-xs resize-none"
                      placeholder='{"asset": "Tavle", "assets": "Tavler", "customer": "Anleggsherre"}'
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
