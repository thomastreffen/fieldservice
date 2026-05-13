import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Thermometer, Zap, Droplets, Plus, Pencil, Loader2,
  ToggleLeft, ToggleRight, ChevronRight, Layers,
} from "lucide-react";

const VERTICAL_ICONS: Record<string, React.ReactNode> = {
  thermometer: <Thermometer className="h-5 w-5" />,
  zap: <Zap className="h-5 w-5" />,
  droplets: <Droplets className="h-5 w-5" />,
};

interface Vertical {
  id: string; slug: string; display_name: string; description: string | null;
  icon: string | null; color: string; is_active: boolean;
  default_modules: string[]; config: Record<string, unknown>;
}

interface VerticalModule {
  id: string; vertical_id: string; module_slug: string;
  enabled_by_default: boolean; label_overrides: Record<string, string>;
}

interface PlatformModule {
  id: string; slug: string; name: string; description: string | null;
  icon: string | null; is_core: boolean;
}

export default function VerticalsPage() {
  const [verticals, setVerticals] = useState<Vertical[]>([]);
  const [platformModules, setPlatformModules] = useState<PlatformModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingVertical, setEditingVertical] = useState<Vertical | null>(null);
  const [verticalModules, setVerticalModules] = useState<VerticalModule[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state for editing
  const [form, setForm] = useState({ display_name: "", description: "", icon: "", color: "", is_active: true });
  const [labelOverridesText, setLabelOverridesText] = useState("{}");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [vRes, mRes] = await Promise.all([
      (supabase as any).from("verticals").select("*").order("created_at"),
      (supabase as any).from("platform_modules").select("*").order("name"),
    ]);
    setVerticals(vRes.data ?? []);
    setPlatformModules(mRes.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openEdit = async (v: Vertical) => {
    setEditingVertical(v);
    setForm({ display_name: v.display_name, description: v.description ?? "", icon: v.icon ?? "", color: v.color ?? "#6366f1", is_active: v.is_active });

    // Load vertical_modules for this vertical
    const { data } = await (supabase as any).from("vertical_modules").select("*").eq("vertical_id", v.id);
    setVerticalModules(data ?? []);

    // Build merged label overrides from all modules
    const merged = (data ?? []).reduce((acc: Record<string, string>, m: VerticalModule) => ({ ...acc, ...m.label_overrides }), {});
    setLabelOverridesText(JSON.stringify(merged, null, 2));
    setSheetOpen(true);
  };

  const openNew = () => {
    setEditingVertical(null);
    setForm({ display_name: "", description: "", icon: "thermometer", color: "#6366f1", is_active: true });
    setVerticalModules([]);
    setLabelOverridesText("{}");
    setSheetOpen(true);
  };

  const toggleModule = async (moduleSlug: string, currentEnabled: boolean) => {
    if (!editingVertical) return;
    const existing = verticalModules.find(m => m.module_slug === moduleSlug);
    if (existing) {
      await (supabase as any).from("vertical_modules").update({ enabled_by_default: !currentEnabled }).eq("id", existing.id);
      setVerticalModules(vms => vms.map(m => m.module_slug === moduleSlug ? { ...m, enabled_by_default: !currentEnabled } : m));
    } else {
      const { data } = await (supabase as any).from("vertical_modules").insert({
        vertical_id: editingVertical.id, module_slug: moduleSlug, enabled_by_default: true, label_overrides: {},
      }).select().single();
      if (data) setVerticalModules(vms => [...vms, data]);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      let overrides: Record<string, string> = {};
      try { overrides = JSON.parse(labelOverridesText); } catch { toast.error("Ugyldig JSON i label overrides"); setSaving(false); return; }

      if (editingVertical) {
        await (supabase as any).from("verticals").update({
          display_name: form.display_name, description: form.description || null,
          icon: form.icon || null, color: form.color, is_active: form.is_active,
        }).eq("id", editingVertical.id);

        // Update label_overrides on the crm module row (or first module)
        const crmMod = verticalModules.find(m => m.module_slug === "crm");
        if (crmMod) {
          await (supabase as any).from("vertical_modules").update({ label_overrides: overrides }).eq("id", crmMod.id);
        }
        toast.success("Vertikal oppdatert");
      } else {
        await (supabase as any).from("verticals").insert({
          slug: form.display_name.toLowerCase().replace(/\s+/g, "_"),
          display_name: form.display_name, description: form.description || null,
          icon: form.icon || null, color: form.color, is_active: form.is_active,
          default_modules: [],
        });
        toast.success("Vertikal opprettet");
      }

      setSheetOpen(false);
      fetchData();
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vertikaler</h1>
          <p className="text-muted-foreground mt-1">Bransjevertikaler og modulkonfigurasjon</p>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus className="h-4 w-4" /> Ny vertikal
        </Button>
      </div>

      {/* Stat-kort */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-muted/40 rounded-lg px-4 py-3 flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Layers className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Vertikaler</p>
            <p className="font-semibold text-sm">{verticals.length}</p>
          </div>
        </div>
        <div className="bg-muted/40 rounded-lg px-4 py-3 flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center">
            <ToggleRight className="h-4 w-4 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Aktive</p>
            <p className="font-semibold text-sm">{verticals.filter(v => v.is_active).length}</p>
          </div>
        </div>
      </div>

      {/* Liste */}
      <div className="rounded-xl border border-border overflow-hidden bg-card">
        <div className="px-5 py-2.5 border-b border-border bg-muted/30">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {verticals.length} {verticals.length === 1 ? "vertikal" : "vertikaler"}
          </span>
        </div>
        {verticals.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground">Ingen vertikaler</div>
        ) : (
          verticals.map(v => (
            <div
              key={v.id}
              className="flex items-center gap-4 px-5 py-4 border-b border-border last:border-b-0 hover:bg-muted/20 transition-colors cursor-pointer group"
              onClick={() => openEdit(v)}
            >
              <div
                className="h-10 w-10 rounded-xl flex items-center justify-center text-white shrink-0"
                style={{ backgroundColor: v.color || "#6366f1" }}
              >
                {VERTICAL_ICONS[v.icon ?? ""] ?? <Layers className="h-5 w-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm">{v.display_name}</p>
                  <span className="text-xs text-muted-foreground font-mono">{v.slug}</span>
                </div>
                {v.description && <p className="text-xs text-muted-foreground mt-0.5">{v.description}</p>}
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {v.default_modules.slice(0, 5).map(m => (
                    <span key={m} className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-mono">{m}</span>
                  ))}
                  {v.default_modules.length > 5 && (
                    <span className="text-[10px] text-muted-foreground">+{v.default_modules.length - 5}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Badge variant={v.is_active ? "default" : "secondary"} className="text-[10px]">
                  {v.is_active ? "Aktiv" : "Inaktiv"}
                </Badge>
                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingVertical ? `Rediger ${editingVertical.display_name}` : "Ny vertikal"}</SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-5">
            {/* Basic info */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Navn</Label>
                <Input value={form.display_name} onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))} placeholder="Varmepumpe" />
              </div>
              <div className="space-y-1.5">
                <Label>Beskrivelse</Label>
                <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Ikon (slug)</Label>
                  <Input value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} placeholder="thermometer" />
                </div>
                <div className="space-y-1.5">
                  <Label>Farge</Label>
                  <div className="flex gap-2">
                    <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} className="h-9 w-10 rounded border border-input p-0.5 cursor-pointer" />
                    <Input value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} className="font-mono text-xs" />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
                <Label>Aktiv</Label>
              </div>
            </div>

            {/* Modules */}
            {editingVertical && (
              <div className="space-y-2">
                <p className="text-sm font-semibold">Moduler</p>
                <div className="rounded-lg border border-border divide-y divide-border overflow-hidden">
                  {platformModules.map(pm => {
                    const vm = verticalModules.find(m => m.module_slug === pm.slug);
                    const enabled = vm ? vm.enabled_by_default : false;
                    return (
                      <div key={pm.slug} className="flex items-center justify-between px-4 py-2.5">
                        <div>
                          <p className="text-sm font-medium">{pm.name}</p>
                          <p className="text-[11px] font-mono text-muted-foreground">{pm.slug}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {pm.is_core && <Badge variant="outline" className="text-[10px]">Kjerne</Badge>}
                          <Switch
                            checked={enabled}
                            onCheckedChange={() => toggleModule(pm.slug, enabled)}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Label overrides */}
            <div className="space-y-1.5">
              <Label>Label overrides (JSON)</Label>
              <p className="text-[11px] text-muted-foreground">Overstyr norske etiketter for denne vertikalen</p>
              <Textarea
                value={labelOverridesText}
                onChange={e => setLabelOverridesText(e.target.value)}
                rows={8}
                className="font-mono text-xs"
                placeholder='{"asset": "Tavle", "assets": "Tavler"}'
              />
            </div>

            <Button onClick={save} disabled={saving || !form.display_name} className="w-full gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {editingVertical ? "Lagre endringer" : "Opprett vertikal"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
