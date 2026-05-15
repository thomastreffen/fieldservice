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
  ArrowLeft, Loader2, Check, Plus, Eye, EyeOff,
  Clock, Users, CheckCircle2, Sparkles, Trash2, X,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Pricing types ─────────────────────────────────────────────────────────────

interface FlatConfig {
  type: "flat";
  monthly: number;
  yearly: number;
  show_yearly: boolean;
}
interface PerUserConfig {
  type: "per_user";
  price_per_seat: number;
  yearly_price_per_seat: number;
  show_yearly: boolean;
  min_seats: number | null;
  max_seats: number | null;
}
interface Tier { up_to: number | null; price: number }
interface TieredConfig { type: "tiered"; tiers: Tier[] }
type PriceConfig = FlatConfig | PerUserConfig | TieredConfig;

const DEFAULT_FLAT: FlatConfig = { type: "flat", monthly: 0, yearly: 0, show_yearly: false };
const DEFAULT_PER_USER: PerUserConfig = { type: "per_user", price_per_seat: 0, yearly_price_per_seat: 0, show_yearly: false, min_seats: null, max_seats: null };
const DEFAULT_TIERED: TieredConfig = { type: "tiered", tiers: [{ up_to: 5, price: 499 }, { up_to: null, price: 899 }] };

function derivePrices(cfg: PriceConfig): { price_monthly: number; price_yearly: number } {
  if (cfg.type === "flat") return { price_monthly: cfg.monthly, price_yearly: cfg.show_yearly ? cfg.yearly : 0 };
  if (cfg.type === "per_user") return { price_monthly: cfg.price_per_seat, price_yearly: cfg.show_yearly ? cfg.yearly_price_per_seat : 0 };
  return { price_monthly: cfg.tiers[0]?.price ?? 0, price_yearly: 0 };
}

// ── Data types ────────────────────────────────────────────────────────────────

interface Vertical { id: string; slug: string; display_name: string; color: string | null }
interface PlatformModule { id: string; slug: string; name: string; is_core: boolean; compatible_verticals: string[] }

// ── Form state ────────────────────────────────────────────────────────────────

interface PlanForm {
  name: string;
  slug: string;
  slugTouched: boolean;
  description: string;
  price_config: PriceConfig;
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
  name: "", slug: "", slugTouched: false, description: "",
  price_config: DEFAULT_FLAT,
  trial_days: 14, max_users: null, vertical_ids: [],
  included_modules: [], addon_modules: [],
  is_active: true, is_visible: true, sort_order: 0,
};

function toSlug(name: string) {
  return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}
function fmt(n: number) { return n.toLocaleString("nb-NO"); }

// ── Live Preview ──────────────────────────────────────────────────────────────

function PricingDisplay({ cfg }: { cfg: PriceConfig }) {
  if (cfg.type === "flat") {
    const yearlyMonthly = cfg.yearly > 0 ? Math.round(cfg.yearly / 12) : 0;
    return (
      <>
        <div className="flex items-baseline gap-1.5">
          <span className="text-3xl font-bold">{fmt(cfg.monthly)}</span>
          <span className="text-sm text-muted-foreground">kr/mnd</span>
        </div>
        {cfg.show_yearly && cfg.yearly > 0 && (
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
            {fmt(yearlyMonthly)} kr/mnd fakturert årlig ({fmt(cfg.yearly)} kr/år)
          </p>
        )}
      </>
    );
  }
  if (cfg.type === "per_user") {
    return (
      <>
        <div className="flex items-baseline gap-1.5">
          <span className="text-3xl font-bold">{fmt(cfg.price_per_seat)}</span>
          <span className="text-sm text-muted-foreground">kr/bruker/mnd</span>
        </div>
        {cfg.min_seats && (
          <p className="text-xs text-muted-foreground mt-1">Minimum {cfg.min_seats} brukere ({fmt(cfg.price_per_seat * cfg.min_seats)} kr/mnd)</p>
        )}
        {cfg.show_yearly && cfg.yearly_price_per_seat > 0 && (
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
            {fmt(cfg.yearly_price_per_seat)} kr/bruker/mnd fakturert årlig
          </p>
        )}
      </>
    );
  }
  // tiered
  return (
    <div className="space-y-1">
      {cfg.tiers.map((t, i) => {
        const from = i === 0 ? 1 : (cfg.tiers[i - 1].up_to ?? 0) + 1;
        const to = t.up_to;
        return (
          <div key={i} className="flex justify-between text-sm">
            <span className="text-muted-foreground">{from}{to ? `–${to}` : "+"} brukere</span>
            <span className="font-semibold">{fmt(t.price)} kr/mnd</span>
          </div>
        );
      })}
    </div>
  );
}

function PlanPreview({ form, modules }: { form: PlanForm; modules: PlatformModule[] }) {
  const includedModules = modules.filter(m => form.included_modules.includes(m.slug));
  const addonModules = modules.filter(m => form.addon_modules.includes(m.slug));
  const { price_config: cfg } = form;

  return (
    <div className="bg-card border-2 border-border rounded-2xl overflow-hidden shadow-sm">
      <div className="px-6 pt-6 pb-4 border-b border-border">
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="font-bold text-lg leading-tight">{form.name || "Plannavn"}</p>
          <div className="flex flex-col gap-1 items-end shrink-0">
            {!form.is_active && <span className="text-[10px] bg-destructive/10 text-destructive px-2 py-0.5 rounded font-medium">Inaktiv</span>}
            {!form.is_visible && <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded font-medium">Skjult</span>}
          </div>
        </div>
        <p className="text-sm text-muted-foreground leading-snug">{form.description || "Beskrivelse av planen vises her"}</p>
      </div>

      <div className="px-6 py-4 border-b border-border">
        <PricingDisplay cfg={cfg} />
        <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{form.trial_days}d gratis prøve</span>
          <span className="flex items-center gap-1"><Users className="h-3 w-3" />{form.max_users ? `opp til ${form.max_users}` : "ubegrenset"}</span>
        </div>
      </div>

      <div className="px-6 py-4 space-y-1.5">
        {includedModules.map(m => (
          <div key={m.slug} className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />{m.name}
          </div>
        ))}
        {addonModules.map(m => (
          <div key={m.slug} className="flex items-center gap-2 text-sm text-muted-foreground">
            <Plus className="h-4 w-4 shrink-0" />{m.name} <span className="text-[11px]">(tillegg)</span>
          </div>
        ))}
        {includedModules.length === 0 && addonModules.length === 0 && (
          <p className="text-xs text-muted-foreground italic">Ingen moduler valgt ennå</p>
        )}
      </div>

      <div className="px-6 pb-6">
        <div className="w-full bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-semibold text-center">Kom i gang</div>
      </div>
    </div>
  );
}

// ── Pricing configurator ──────────────────────────────────────────────────────

function PricingConfigurator({ cfg, onChange }: { cfg: PriceConfig; onChange: (c: PriceConfig) => void }) {
  const types: { key: PriceConfig["type"]; label: string; desc: string }[] = [
    { key: "flat", label: "Flat pris", desc: "Fast måneds- eller årspris" },
    { key: "per_user", label: "Per bruker", desc: "Pris per sete per måned" },
    { key: "tiered", label: "Pakketrinn", desc: "Ulik pris per brukerantall" },
  ];

  function switchType(t: PriceConfig["type"]) {
    if (t === "flat") onChange(DEFAULT_FLAT);
    else if (t === "per_user") onChange(DEFAULT_PER_USER);
    else onChange(DEFAULT_TIERED);
  }

  return (
    <div className="space-y-4">
      {/* Type selector */}
      <div className="grid grid-cols-3 gap-2">
        {types.map(t => (
          <button
            key={t.key}
            type="button"
            onClick={() => switchType(t.key)}
            className={cn(
              "flex flex-col gap-0.5 px-3 py-2.5 rounded-lg border text-left transition-colors",
              cfg.type === t.key
                ? "border-primary bg-primary/5 text-foreground"
                : "border-border bg-background text-muted-foreground hover:bg-muted/40"
            )}
          >
            <span className="text-sm font-semibold">{t.label}</span>
            <span className="text-[11px] leading-tight">{t.desc}</span>
          </button>
        ))}
      </div>

      {/* Flat pris */}
      {cfg.type === "flat" && (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Månedspris (NOK)</Label>
            <Input type="number" min="0" value={cfg.monthly}
              onChange={e => onChange({ ...cfg, monthly: Number(e.target.value) })} />
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={cfg.show_yearly} onCheckedChange={v => onChange({ ...cfg, show_yearly: v })} />
            <Label className="cursor-pointer">Tilby årlig fakturering</Label>
          </div>
          {cfg.show_yearly && (
            <div className="space-y-1.5">
              <Label>Årspris (NOK)</Label>
              <Input type="number" min="0" value={cfg.yearly}
                onChange={e => onChange({ ...cfg, yearly: Number(e.target.value) })} />
              {cfg.yearly > 0 && cfg.monthly > 0 && (
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
                  {fmt(Math.round(cfg.yearly / 12))} kr/mnd — {Math.round((1 - cfg.yearly / (cfg.monthly * 12)) * 100)}% rabatt
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Per bruker */}
      {cfg.type === "per_user" && (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Pris per bruker/mnd (NOK)</Label>
            <Input type="number" min="0" value={cfg.price_per_seat}
              onChange={e => onChange({ ...cfg, price_per_seat: Number(e.target.value) })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Min. seter</Label>
              <Input type="number" min="1" value={cfg.min_seats ?? ""}
                onChange={e => onChange({ ...cfg, min_seats: e.target.value ? Number(e.target.value) : null })}
                placeholder="Ingen" />
            </div>
            <div className="space-y-1.5">
              <Label>Maks seter</Label>
              <Input type="number" min="1" value={cfg.max_seats ?? ""}
                onChange={e => onChange({ ...cfg, max_seats: e.target.value ? Number(e.target.value) : null })}
                placeholder="Ubegrenset" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={cfg.show_yearly} onCheckedChange={v => onChange({ ...cfg, show_yearly: v })} />
            <Label className="cursor-pointer">Tilby årlig fakturering</Label>
          </div>
          {cfg.show_yearly && (
            <div className="space-y-1.5">
              <Label>Pris per bruker/mnd – årlig (NOK)</Label>
              <Input type="number" min="0" value={cfg.yearly_price_per_seat}
                onChange={e => onChange({ ...cfg, yearly_price_per_seat: Number(e.target.value) })} />
              {cfg.yearly_price_per_seat > 0 && cfg.price_per_seat > 0 && (
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
                  {Math.round((1 - cfg.yearly_price_per_seat / cfg.price_per_seat) * 100)}% rabatt ved årsabonnement
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Pakketrinn */}
      {cfg.type === "tiered" && (
        <div className="space-y-2">
          <div className="grid grid-cols-[1fr_1fr_auto] gap-2 text-xs font-medium text-muted-foreground px-1">
            <span>Opp til X brukere</span>
            <span>Pris kr/mnd</span>
            <span />
          </div>
          {cfg.tiers.map((tier, i) => {
            const isLast = i === cfg.tiers.length - 1;
            return (
              <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                <div>
                  {isLast ? (
                    <div className="h-9 flex items-center px-3 rounded-md border border-border bg-muted/40 text-sm text-muted-foreground">
                      Ubegrenset
                    </div>
                  ) : (
                    <Input
                      type="number" min="1" value={tier.up_to ?? ""}
                      placeholder="Ant. brukere"
                      onChange={e => {
                        const tiers = [...cfg.tiers];
                        tiers[i] = { ...tier, up_to: e.target.value ? Number(e.target.value) : null };
                        onChange({ ...cfg, tiers });
                      }}
                    />
                  )}
                </div>
                <Input
                  type="number" min="0" value={tier.price}
                  onChange={e => {
                    const tiers = [...cfg.tiers];
                    tiers[i] = { ...tier, price: Number(e.target.value) };
                    onChange({ ...cfg, tiers });
                  }}
                />
                <button
                  type="button"
                  disabled={cfg.tiers.length <= 1}
                  onClick={() => onChange({ ...cfg, tiers: cfg.tiers.filter((_, j) => j !== i) })}
                  className="p-1.5 text-muted-foreground hover:text-destructive disabled:opacity-30 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
          <Button
            type="button" variant="outline" size="sm"
            className="gap-2 mt-1"
            onClick={() => {
              const tiers = [...cfg.tiers];
              const lastFixed = tiers.filter(t => t.up_to !== null);
              const unlimited = tiers.find(t => t.up_to === null);
              const newTier: Tier = { up_to: (lastFixed[lastFixed.length - 1]?.up_to ?? 0) + 10, price: 0 };
              const withoutUnlimited = tiers.filter(t => t.up_to !== null);
              onChange({ ...cfg, tiers: unlimited ? [...withoutUnlimited, newTier, unlimited] : [...tiers, { up_to: null, price: 0 }] });
            }}
          >
            <Plus className="h-3.5 w-3.5" /> Legg til trinn
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Module selector ───────────────────────────────────────────────────────────

type ModuleState = "included" | "addon" | "none";

function ModuleRow({
  mod, state, highlighted, onChange,
}: {
  mod: PlatformModule;
  state: ModuleState;
  highlighted: boolean;
  onChange: (s: ModuleState) => void;
}) {
  const btns: { s: ModuleState; label: string; activeClass: string }[] = [
    { s: "included", label: "Inkludert", activeClass: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" },
    { s: "addon", label: "Tillegg", activeClass: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400" },
    { s: "none", label: "Ikke med", activeClass: "bg-muted text-muted-foreground" },
  ];
  return (
    <div className={cn(
      "flex items-center justify-between py-2.5 border-b border-border last:border-0 transition-colors",
      highlighted && "bg-primary/5 -mx-5 px-5"
    )}>
      <div className="flex items-center gap-2 min-w-0">
        {highlighted && <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />}
        <div className="min-w-0">
          <span className="text-sm font-medium">{mod.name}</span>
          {mod.is_core && (
            <span className="ml-1.5 text-[10px] bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-400 px-1.5 py-0.5 rounded font-medium">Kjerne</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {btns.map(b => (
          <button
            key={b.s}
            type="button"
            onClick={() => onChange(b.s)}
            className={cn(
              "text-xs px-2.5 py-1 rounded-md font-medium transition-colors",
              state === b.s ? b.activeClass : "bg-muted/50 text-muted-foreground hover:bg-muted"
            )}
          >
            {state === b.s && b.s !== "none" && <Check className="inline h-3 w-3 mr-0.5" />}
            {b.label}
          </button>
        ))}
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
      const { data } = await (supabase as any).from("verticals").select("id, slug, display_name, color").order("display_name");
      return data ?? [];
    },
  });

  const { data: platformModules = [] } = useQuery<PlatformModule[]>({
    queryKey: ["platform-modules-all"],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data } = await (supabase as any).from("platform_modules").select("id, slug, name, is_core, compatible_verticals").order("name");
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
    const priceConfig: PriceConfig = p.price_config ?? {
      type: "flat",
      monthly: Number(p.price_monthly),
      yearly: Number(p.price_yearly),
      show_yearly: Number(p.price_yearly) > 0,
    };
    setForm({
      name: p.name,
      slug: p.slug,
      slugTouched: true,
      description: p.description ?? "",
      price_config: priceConfig,
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
    setForm(f => ({ ...f, name, slug: f.slugTouched ? f.slug : toSlug(name) }));
  }

  function toggleVertical(vid: string) {
    setForm(f => ({
      ...f,
      vertical_ids: f.vertical_ids.includes(vid)
        ? f.vertical_ids.filter(v => v !== vid)
        : [...f.vertical_ids, vid],
    }));
  }

  function handleModuleState(slug: string, state: ModuleState) {
    setForm(f => ({
      ...f,
      included_modules: state === "included"
        ? [...f.included_modules.filter(m => m !== slug), slug]
        : f.included_modules.filter(m => m !== slug),
      addon_modules: state === "addon"
        ? [...f.addon_modules.filter(m => m !== slug), slug]
        : f.addon_modules.filter(m => m !== slug),
    }));
  }

  // Compute which vertical slugs are currently selected
  const selectedVerticalSlugs = verticals
    .filter(v => form.vertical_ids.includes(v.id))
    .map(v => v.slug);

  // A module is "highlighted" when verticals are selected and the module is compatible with at least one
  function isHighlighted(mod: PlatformModule) {
    if (selectedVerticalSlugs.length === 0) return false;
    return mod.compatible_verticals.some(s => selectedVerticalSlugs.includes(s));
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const slug = form.slugTouched && form.slug ? form.slug : toSlug(form.name);
      const { price_monthly, price_yearly } = derivePrices(form.price_config);
      const payload = {
        name: form.name.trim(),
        slug,
        description: form.description.trim(),
        price_monthly,
        price_yearly,
        price_config: form.price_config,
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
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const hasVerticalFilter = selectedVerticalSlugs.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/plans")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{isNew ? "Ny plan" : "Rediger plan"}</h1>
          <p className="text-muted-foreground mt-0.5">{isNew ? "Opprett en ny abonnementsplan" : `Redigerer «${(existing as any)?.name ?? ""}»`}</p>
        </div>
      </div>

      <div className="flex gap-8 items-start">
        {/* ── Form ── */}
        <form className="flex-1 min-w-0 space-y-6" onSubmit={e => { e.preventDefault(); saveMutation.mutate(); }}>

          {/* Basic info */}
          <div className="bg-card rounded-xl border border-border p-5 space-y-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Grunnleggende info</p>
            <div className="space-y-1.5">
              <Label htmlFor="plan-name">Navn *</Label>
              <Input id="plan-name" value={form.name} onChange={e => handleNameChange(e.target.value)} placeholder="f.eks. Starter, Pro, Enterprise" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="plan-slug">Slug</Label>
              <Input id="plan-slug" value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value, slugTouched: true }))}
                placeholder={toSlug(form.name) || "plan-slug"} className="font-mono text-sm" />
              <p className="text-[11px] text-muted-foreground">Auto-generert fra navn. Kan overstyres.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="plan-desc">Beskrivelse</Label>
              <Textarea id="plan-desc" value={form.description} onChange={e => set("description", e.target.value)}
                placeholder="Kort beskrivelse av hva planen inneholder..." rows={2} />
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-card rounded-xl border border-border p-5 space-y-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Prismodell</p>
            <PricingConfigurator cfg={form.price_config} onChange={cfg => set("price_config", cfg)} />
          </div>

          {/* Trial & users */}
          <div className="bg-card rounded-xl border border-border p-5 space-y-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Prøveperiode og brukere</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="trial-days">Prøvedager</Label>
                <Input id="trial-days" type="number" min="0" value={form.trial_days}
                  onChange={e => set("trial_days", Number(e.target.value))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="max-users">Maks brukere</Label>
                <Input id="max-users" type="number" min="0" value={form.max_users ?? ""}
                  onChange={e => set("max_users", e.target.value ? Number(e.target.value) : null)}
                  placeholder="Ubegrenset" />
              </div>
            </div>
          </div>

          {/* Verticals */}
          {verticals.length > 0 && (
            <div className="bg-card rounded-xl border border-border p-5 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Vertikaler</p>
              <p className="text-xs text-muted-foreground">Velg vertikaler for å se hvilke moduler som er relevante.</p>
              <div className="space-y-2">
                {verticals.map(v => {
                  const selected = form.vertical_ids.includes(v.id);
                  return (
                    <button key={v.id} type="button" onClick={() => toggleVertical(v.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors text-left",
                        selected ? "border-primary/40 bg-primary/5 text-foreground" : "border-border bg-background text-muted-foreground hover:bg-muted/40"
                      )}>
                      <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: v.color ?? "#6366f1" }} />
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
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Moduler</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">Inkludert</span> = inngår i planprisen.{" "}
                  <span className="font-medium text-violet-600 dark:text-violet-400">Tillegg</span> = kan kjøpes separat.
                </p>
              </div>
              {hasVerticalFilter && (
                <div className="flex items-center gap-1.5 text-[11px] text-primary bg-primary/10 px-2 py-1 rounded-md shrink-0">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  Fremhevet for valgte vertikaler
                </div>
              )}
            </div>
            <div>
              {platformModules.map(mod => {
                const state: ModuleState = form.included_modules.includes(mod.slug)
                  ? "included"
                  : form.addon_modules.includes(mod.slug)
                  ? "addon"
                  : "none";
                return (
                  <ModuleRow
                    key={mod.slug}
                    mod={mod}
                    state={state}
                    highlighted={isHighlighted(mod)}
                    onChange={s => handleModuleState(mod.slug, s)}
                  />
                );
              })}
            </div>
          </div>

          {/* Visibility */}
          <div className="bg-card rounded-xl border border-border p-5 space-y-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Synlighet og rekkefølge</p>
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
              <Input id="sort-order" type="number" value={form.sort_order}
                onChange={e => set("sort_order", Number(e.target.value))} className="w-28" />
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
          <PlanPreview form={form} modules={platformModules} />
          <p className="text-[11px] text-muted-foreground text-center">Oppdateres i sanntid</p>
        </div>
      </div>
    </div>
  );
}
