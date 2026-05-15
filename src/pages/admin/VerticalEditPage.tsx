import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";

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

export default function VerticalEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [vertical, setVertical] = useState<Vertical | null>(null);
  const [platformModules, setPlatformModules] = useState<PlatformModule[]>([]);
  const [verticalModules, setVerticalModules] = useState<VerticalModule[]>([]);
  const [form, setForm] = useState({ display_name: "", description: "", icon: "thermometer", color: "#6366f1", is_active: true });
  const [labelOverridesText, setLabelOverridesText] = useState("{}");

  useEffect(() => {
    const load = async () => {
      const mRes = await (supabase as any).from("platform_modules").select("*").order("name");
      setPlatformModules(mRes.data ?? []);

      if (id) {
        const [vRes, vmRes] = await Promise.all([
          (supabase as any).from("verticals").select("*").eq("id", id).single(),
          (supabase as any).from("vertical_modules").select("*").eq("vertical_id", id),
        ]);
        const v = vRes.data as Vertical;
        setVertical(v);
        setForm({ display_name: v.display_name, description: v.description ?? "", icon: v.icon ?? "", color: v.color ?? "#6366f1", is_active: v.is_active });
        setVerticalModules(vmRes.data ?? []);
        const merged = (vmRes.data ?? []).reduce(
          (acc: Record<string, string>, m: VerticalModule) => ({ ...acc, ...m.label_overrides }),
          {}
        );
        setLabelOverridesText(JSON.stringify(merged, null, 2));
      }

      setLoading(false);
    };
    load();
  }, [id]);

  const toggleModule = async (moduleSlug: string, currentEnabled: boolean) => {
    if (!vertical) return;
    const existing = verticalModules.find(m => m.module_slug === moduleSlug);
    if (existing) {
      await (supabase as any).from("vertical_modules").update({ enabled_by_default: !currentEnabled }).eq("id", existing.id);
      setVerticalModules(vms => vms.map(m => m.module_slug === moduleSlug ? { ...m, enabled_by_default: !currentEnabled } : m));
    } else {
      const { data } = await (supabase as any).from("vertical_modules").insert({
        vertical_id: vertical.id, module_slug: moduleSlug, enabled_by_default: true, label_overrides: {},
      }).select().single();
      if (data) setVerticalModules(vms => [...vms, data]);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      let overrides: Record<string, string> = {};
      try { overrides = JSON.parse(labelOverridesText); } catch { toast.error("Ugyldig JSON i label overrides"); setSaving(false); return; }

      if (vertical) {
        await (supabase as any).from("verticals").update({
          display_name: form.display_name, description: form.description || null,
          icon: form.icon || null, color: form.color, is_active: form.is_active,
        }).eq("id", vertical.id);

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

      navigate("/admin/verticals");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/verticals")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {vertical ? `Rediger ${vertical.display_name}` : "Ny vertikal"}
          </h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Vertikaler / {vertical ? vertical.display_name : "Ny"}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 space-y-5">
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

        {vertical && (
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
                      <Switch checked={enabled} onCheckedChange={() => toggleModule(pm.slug, enabled)} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

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

        <div className="flex gap-3 justify-end pt-2">
          <Button variant="outline" onClick={() => navigate("/admin/verticals")}>Avbryt</Button>
          <Button onClick={save} disabled={saving || !form.display_name} className="gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {vertical ? "Lagre endringer" : "Opprett vertikal"}
          </Button>
        </div>
      </div>
    </div>
  );
}
