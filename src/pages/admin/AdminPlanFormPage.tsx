import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  ArrowLeft, Loader2, Check, Plus, Eye, EyeOff, Package,
  Clock, Users, CheckCircle2, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ALL_MODULES = ["crm", "postkontoret", "ressursplanlegger"] as const;
type Module = typeof ALL_MODULES[number];
const MODULE_LABELS: Record<string, string> = {
  crm: "CRM", postkontoret: "Postkontoret", ressursplanlegger: "Ressursplanlegger",
};

function toSlug(name: string) {
  return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

function formatPrice(n: number) {
  return n.toLocaleString("nb-NO");
}

interface Vertical { id: string; display_name: string; color: string | null }

interface PlanForm {
  name: string;
  slug: string;
  slugTouched: boolean;
  description: string;
  price_monthly: number;
  price_yearly: number;
  showYearly: boolean;
  trial_days: number;
  max_users: number | null;
  vertical_ids: string[];
  included_modules: string[];
  addon_modules: string[];
  is_active: boolean;
  is_visible: boolean;
  sort_order: number;
}

const EMPTY: PlanForm = {
  name: "", slug: "", slugTouched: false,
  description: "", price_monthly: 0, price_yearly: 0, showYearly: false,
  trial_days: 14, max_users: null, vertical_ids: [],
  included_modules: [], addon_modules: [],
  is_active: true, is_visible: true, sort_order: 0,
};

// ── Live Preview ──────────────────────────────────────────────────────────────

function PlanPreview({ form }: { form: PlanForm }) {
  const yearlyMonthly = form.price_yearly > 0
    ? Math.round(form.price_yearly / 12)
    : 0;

  return (
    <div className="bg-card border-2 border-border rounded-2xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-border">
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="font-bold text-lg leading-tight">{form.name || "Plannavn"}</p>
          <div className="flex flex-col gap-1 items-end shrink-0">
            {!form.is_active && (
              <span className="text-[10px] bg-destructive/10 text-destructive px-2 py-0.5 rounded font-medium">Inaktiv</span>
            )}
            {!form.is_visible && (
              <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded font-medium">Skjult</span>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground leading-snug">
          {form.description || "Beskrivelse av planen vises her"}
        </p>
      </div>

      {/* Pricing */}
      <div className="px-6 py-4 border-b border-border">
        <div className="flex items-baseline gap-1.5">
          <span className="text-3xl font-bold">{formatPrice(form.price_monthly)}</span>
          <span className="text-sm text-muted-foreground">kr/mnd</span>
        </div>
        {form.showYearly && form.price_yearly > 0 && (
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
            {formatPrice(yearlyMonthly)} kr/mnd fakturert årlig ({formatPrice(form.price_yearly)} kr/år)
          </p>
        )}
        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {form.trial_days}d gratis prøve
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {form.max_users ? `opp til ${form.max_users} brukere` : "ubegrenset"}
          </span>
        </div>
      </div>

      {/* Modules */}
      <div className="px-6 py-4 space-y-2">
        {ALL_MODULES.filter(m => form.included_modules.includes(m)).map(m => (
          <div key={m} className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            {MODULE_LABELS[m]}
          </div>
        ))}
        {ALL_MODULES.filter(m => form.addon_modules.includes(m)).map(m => (
          <div key={m} className="flex items-center gap-2 text-sm text-muted-foreground">
            <Plus className="h-4 w-4 shrink-0" />
            {MODULE_LABELS[m]} <span className="text-[11px]">(tillegg)</span>
          </div>
        ))}
        {form.included_modules.length === 0 && form.addon_modules.length === 0 && (
          <p className="text-xs text-muted-foreground italic">Ingen moduler valgt ennå</p>
        )}
      </div>

      {/* CTA */}
      <div className="px-6 pb-6">
        <div className="w-full bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-semibold text-center">
          Kom i gang
        </div>
      </div>
    </div>
  );
}

// ── Module Selector ───────────────────────────────────────────────────────────

function ModuleRow({
  mod, included, addon, onInclude, onAddon,
}: {
  mod: Module;
  included: boolean;
  addon: boolean;
  onInclude: () => void;
  onAddon: () => void;
}) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
      <span className="text-sm font-medium">{MODULE_LABELS[mod]}</span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onInclude}
          className={cn(
            "text-xs px-2.5 py-1 rounded-md font-medium transition-colors",
            included
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
              : "bg-muted text-muted-foreground hover:bg-muted/60"
          )}
        >
          {included && <Check className="inline h-3 w-3 mr-1" />}
          Inkludert
        </button>
        <button
          type="button"
          onClick={onAddon}
          className={cn(
            "text-xs px-2.5 py-1 rounded-md font-medium transition-colors",
            addon
              ? "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400"
              : "bg-muted text-muted-foreground hover:bg-muted/60"
          )}
        >
          {addon && <Plus className="inline h-3 w-3 mr-1" />}
          Tillegg
        </button>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminPlanFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isNew = !id;

  const [form, setForm] = useState<PlanForm>(EMPTY);

  const { data: verticals = [] } = useQuery<Vertical[]>({
    queryKey: ["verticals-list"],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data } = await (supabase as any).from("verticals").select("id, display_name, color").order("display_name");
      return data ?? [];
    },
  });

  const { data: existing, isLoading } = useQuery({
    queryKey: ["saas_plan", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("saas_plans").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!existing) return;
    const p = existing as any;
    setForm({
      name: p.name,
      slug: p.slug,
      slugTouched: true,
      description: p.description ?? "",
      price_monthly: Number(p.price_monthly),
      price_yearly: Number(p.price_yearly),
      showYearly: Number(p.price_yearly) > 0,
      trial_days: p.trial_days,
      max_users: p.max_users ?? null,
      vertical_ids: p.vertical_ids ?? [],
      included_modules: p.included_modules ?? [],
      addon_modules: p.addon_modules ?? [],
      is_active: p.is_active,
      is_visible: p.is_visible,
      sort_order: p.sort_order,
    });
  }, [existing]);

  function set<K extends keyof PlanForm>(key: K, val: PlanForm[K]) {
    setForm(f => ({ ...f, [key]: val }));
  }

  function handleNameChange(name: string) {
    setForm(f => ({
      ...f,
      name,
      slug: f.slugTouched ? f.slug : toSlug(name),
    }));
  }

  function toggleVertical(vid: string) {
    setForm(f => ({
      ...f,
      vertical_ids: f.vertical_ids.includes(vid)
        ? f.vertical_ids.filter(v => v !== vid)
        : [...f.vertical_ids, vid],
    }));
  }

  function handleIncluded(mod: string) {
    setForm(f => {
      const alreadyIncluded = f.included_modules.includes(mod);
      return {
        ...f,
        included_modules: alreadyIncluded
          ? f.included_modules.filter(m => m !== mod)
          : [...f.included_modules, mod],
        addon_modules: f.addon_modules.filter(m => m !== mod),
      };
    });
  }

  function handleAddon(mod: string) {
    setForm(f => {
      const alreadyAddon = f.addon_modules.includes(mod);
      return {
        ...f,
        addon_modules: alreadyAddon
          ? f.addon_modules.filter(m => m !== mod)
          : [...f.addon_modules, mod],
        included_modules: f.included_modules.filter(m => m !== mod),
      };
    });
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const slug = form.slugTouched && form.slug ? form.slug : toSlug(form.name);
      const payload = {
        name: form.name.trim(),
        slug,
        description: form.description.trim(),
        price_monthly: form.price_monthly,
        price_yearly: form.showYearly ? form.price_yearly : 0,
        trial_days: form.trial_days,
        max_users: form.max_users || null,
        vertical_ids: form.vertical_ids,
        included_modules: form.included_modules,
        addon_modules: form.addon_modules,
        is_active: form.is_active,
        is_visible: form.is_visible,
        sort_order: form.sort_order,
      };
      if (isNew) {
        const { error } = await supabase.from("saas_plans").insert(payload as any);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("saas_plans").update(payload as any).eq("id", id!);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["saas_plans"] });
      toast.success(isNew ? "Plan opprettet" : "Plan lagret");
      navigate("/admin/plans");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!isNew && isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/plans")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{isNew ? "Ny plan" : "Rediger plan"}</h1>
          <p className="text-muted-foreground mt-0.5">{isNew ? "Opprett en ny abonnementsplan" : `Redigerer «${existing?.name ?? ""}»`}</p>
        </div>
      </div>

      <div className="flex gap-8 items-start">
        {/* ── Form ── */}
        <form
          className="flex-1 min-w-0 space-y-6"
          onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }}
        >
          {/* Basic info */}
          <div className="bg-card rounded-xl border border-border p-5 space-y-4">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Grunnleggende info</p>
            <div className="space-y-1.5">
              <Label htmlFor="plan-name">Navn *</Label>
              <Input
                id="plan-name"
                value={form.name}
                onChange={e => handleNameChange(e.target.value)}
                placeholder="f.eks. Starter, Pro, Enterprise"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="plan-slug">Slug</Label>
              <Input
                id="plan-slug"
                value={form.slug}
                onChange={e => setForm(f => ({ ...f, slug: e.target.value, slugTouched: true }))}
                placeholder={toSlug(form.name) || "plan-slug"}
                className="font-mono text-sm"
              />
              <p className="text-[11px] text-muted-foreground">Auto-generert fra navn. Kan overstyres.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="plan-desc">Beskrivelse</Label>
              <Textarea
                id="plan-desc"
                value={form.description}
                onChange={e => set("description", e.target.value)}
                placeholder="Kort beskrivelse av hva planen inneholder..."
                rows={2}
              />
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-card rounded-xl border border-border p-5 space-y-4">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Prissetting</p>
            <div className="space-y-1.5">
              <Label htmlFor="price-monthly">Månedspris (NOK)</Label>
              <Input
                id="price-monthly"
                type="number"
                min="0"
                step="1"
                value={form.price_monthly}
                onChange={e => set("price_monthly", Number(e.target.value))}
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="show-yearly"
                checked={form.showYearly}
                onCheckedChange={v => set("showYearly", v)}
              />
              <Label htmlFor="show-yearly" className="cursor-pointer">Tilby årlig fakturering</Label>
            </div>
            {form.showYearly && (
              <div className="space-y-1.5">
                <Label htmlFor="price-yearly">Årspris (NOK)</Label>
                <Input
                  id="price-yearly"
                  type="number"
                  min="0"
                  step="1"
                  value={form.price_yearly}
                  onChange={e => set("price_yearly", Number(e.target.value))}
                />
                {form.price_yearly > 0 && form.price_monthly > 0 && (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
                    Tilsvarer {formatPrice(Math.round(form.price_yearly / 12))} kr/mnd — {Math.round((1 - form.price_yearly / (form.price_monthly * 12)) * 100)}% rabatt
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Trial settings */}
          <div className="bg-card rounded-xl border border-border p-5 space-y-4">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Prøveperiode og brukere</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="trial-days">Prøvedager</Label>
                <Input
                  id="trial-days"
                  type="number"
                  min="0"
                  value={form.trial_days}
                  onChange={e => set("trial_days", Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="max-users">Maks brukere</Label>
                <Input
                  id="max-users"
                  type="number"
                  min="0"
                  value={form.max_users ?? ""}
                  onChange={e => set("max_users", e.target.value ? Number(e.target.value) : null)}
                  placeholder="Ubegrenset"
                />
              </div>
            </div>
          </div>

          {/* Verticals */}
          {verticals.length > 0 && (
            <div className="bg-card rounded-xl border border-border p-5 space-y-3">
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Vertikaler</p>
              <p className="text-xs text-muted-foreground">Hvilke bransjevertikaler gjelder denne planen for?</p>
              <div className="space-y-2">
                {verticals.map(v => {
                  const selected = form.vertical_ids.includes(v.id);
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => toggleVertical(v.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors text-left",
                        selected
                          ? "border-primary/40 bg-primary/5 text-foreground"
                          : "border-border bg-background text-muted-foreground hover:bg-muted/40"
                      )}
                    >
                      <div
                        className="h-3 w-3 rounded-full shrink-0"
                        style={{ backgroundColor: v.color ?? "#6366f1" }}
                      />
                      {v.display_name}
                      {selected && <Check className="h-3.5 w-3.5 ml-auto text-primary" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Modules */}
          <div className="bg-card rounded-xl border border-border p-5 space-y-3">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Moduler</p>
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-emerald-600 dark:text-emerald-400">Inkludert</span> = inngår i planprisen.{" "}
              <span className="font-medium text-violet-600 dark:text-violet-400">Tillegg</span> = kan kjøpes separat.
            </p>
            <div>
              {ALL_MODULES.map(mod => (
                <ModuleRow
                  key={mod}
                  mod={mod}
                  included={form.included_modules.includes(mod)}
                  addon={form.addon_modules.includes(mod)}
                  onInclude={() => handleIncluded(mod)}
                  onAddon={() => handleAddon(mod)}
                />
              ))}
            </div>
          </div>

          {/* Visibility & sort */}
          <div className="bg-card rounded-xl border border-border p-5 space-y-4">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Synlighet og rekkefølge</p>
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-3">
                <Switch id="is-active" checked={form.is_active} onCheckedChange={v => set("is_active", v)} />
                <Label htmlFor="is-active" className="cursor-pointer">Aktiv</Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch id="is-visible" checked={form.is_visible} onCheckedChange={v => set("is_visible", v)} />
                <Label htmlFor="is-visible" className="cursor-pointer flex items-center gap-1.5">
                  {form.is_visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  Synlig for kunder
                </Label>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sort-order">Sorteringsrekkefølge</Label>
              <Input
                id="sort-order"
                type="number"
                value={form.sort_order}
                onChange={e => set("sort_order", Number(e.target.value))}
                className="w-28"
              />
              <p className="text-[11px] text-muted-foreground">Lavere tall vises først</p>
            </div>
          </div>

          <div className="flex items-center gap-3 pb-8">
            <Button type="submit" disabled={saveMutation.isPending || !form.name.trim()} className="gap-2">
              {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isNew ? "Opprett plan" : "Lagre endringer"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => navigate("/admin/plans")}>Avbryt</Button>
          </div>
        </form>

        {/* ── Live Preview ── */}
        <div className="w-72 shrink-0 sticky top-6 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Forhåndsvisning</p>
          </div>
          <PlanPreview form={form} />
          <p className="text-[11px] text-muted-foreground text-center">Oppdateres i sanntid</p>
        </div>
      </div>
    </div>
  );
}
