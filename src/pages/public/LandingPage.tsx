import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import PublicLayout from "@/layouts/PublicLayout";
import {
  ArrowRight, Zap, Users, Calendar, Shield, Briefcase, Mail,
  Thermometer, Droplets, Layers, CheckCircle2, ChevronRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  zap: Zap, users: Users, calendar: Calendar, shield: Shield,
  briefcase: Briefcase, mail: Mail, thermometer: Thermometer,
  droplets: Droplets, layers: Layers,
};
const VERTICAL_ICONS: Record<string, LucideIcon> = {
  zap: Zap, thermometer: Thermometer, droplets: Droplets,
};
const MODULE_LABELS: Record<string, string> = {
  crm: "CRM og kunder", jobs: "Jobbstyring", assets: "Anleggsregister",
  ressursplanlegger: "Ressursplanlegger", postkontoret: "Postkontoret",
  hms: "HMS", warranties: "Garantisaker",
  service_agreements: "Serviceavtaler", el_certificates: "El-sertifikater",
};

type CmsSettings = Record<string, string>;
type Feature = { icon: string; title: string; description: string };
type Vertical = {
  id: string; slug: string; display_name: string;
  description: string | null; icon: string | null; color: string | null;
  default_modules: string[] | null;
};

function useCms() {
  return useQuery<CmsSettings>({
    queryKey: ["cms_settings"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("platform_settings")
        .select("key, value")
        .like("key", "cms.%");
      return Object.fromEntries((data ?? []).map((r: any) => [r.key, r.value]));
    },
  });
}

function DashboardMockup() {
  return (
    <div className="w-full rounded-xl border border-border/60 shadow-2xl shadow-black/10 overflow-hidden bg-background">
      {/* Browser chrome */}
      <div className="flex items-center gap-1.5 px-3 py-2.5 bg-muted/80 border-b border-border">
        <div className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
        <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/80" />
        <div className="w-2.5 h-2.5 rounded-full bg-green-400/80" />
        <div className="flex-1 mx-3 h-4 rounded-md bg-border/50" />
      </div>
      {/* App layout */}
      <div className="flex" style={{ minHeight: 220 }}>
        {/* Sidebar */}
        <div className="w-[22%] bg-card border-r border-border p-2.5 space-y-1.5 shrink-0">
          <div className="flex items-center gap-1.5 mb-3 px-1">
            <div className="w-5 h-5 rounded bg-primary/70" />
            <div className="h-2.5 bg-muted-foreground/20 rounded w-16" />
          </div>
          {[100, 75, 90, 65, 80, 55].map((w, i) => (
            <div key={i} className={`h-5 rounded-md flex items-center gap-1.5 px-1 ${i === 0 ? "bg-primary/15" : ""}`}>
              <div className={`w-2.5 h-2.5 rounded-sm shrink-0 ${i === 0 ? "bg-primary/60" : "bg-muted"}`} />
              <div className={`h-2 rounded ${i === 0 ? "bg-primary/40" : "bg-muted"}`} style={{ width: `${w - 25}%` }} />
            </div>
          ))}
        </div>
        {/* Main content */}
        <div className="flex-1 p-3 space-y-2.5 overflow-hidden">
          {/* KPI cards */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { color: "bg-blue-50 dark:bg-blue-950/30", bar: "bg-blue-400/50", w: "w-12" },
              { color: "bg-emerald-50 dark:bg-emerald-950/30", bar: "bg-emerald-400/50", w: "w-10" },
              { color: "bg-violet-50 dark:bg-violet-950/30", bar: "bg-violet-400/50", w: "w-14" },
            ].map((c, i) => (
              <div key={i} className={`${c.color} rounded-lg p-2 space-y-1.5`}>
                <div className="h-1.5 bg-current/10 rounded w-10" />
                <div className={`h-3.5 ${c.bar} rounded ${c.w}`} />
              </div>
            ))}
          </div>
          {/* Table */}
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="grid grid-cols-4 gap-2 px-2.5 py-1.5 bg-muted/40">
              {[40, 25, 20, 15].map((w, i) => (
                <div key={i} className="h-2 bg-muted-foreground/20 rounded" style={{ width: `${w + 20}%` }} />
              ))}
            </div>
            {[
              ["bg-primary/10", "bg-muted", "bg-emerald-200/60", ""],
              ["bg-muted", "bg-muted", "bg-amber-200/60", ""],
              ["bg-muted", "bg-muted", "bg-muted", ""],
              ["bg-muted", "bg-muted", "bg-muted", ""],
            ].map((row, i) => (
              <div key={i} className="grid grid-cols-4 gap-2 px-2.5 py-1.5 border-t border-border">
                {row.map((cls, j) => (
                  <div key={j} className={`h-2 rounded ${cls || "bg-muted"}`} style={{ width: j === 0 ? "80%" : j === 2 ? "60%" : "70%" }} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const TESTIMONIALS = [
  { initials: "OL", name: "Ole Larsen", company: "Larsen VVS AS", vertical: "VVS", quote: "FieldService har fullstendig forandret hvordan vi jobber. Alle jobber, kunder og avtaler på ett sted — endelig.", color: "#06b6d4" },
  { initials: "AM", name: "Astrid Moen", company: "Norsk Varmepumpe AS", vertical: "Varmepumpe", quote: "Ressursplanleggeren alene er verdt prisen. Vi slipper å ringe rundt for å finne ledig tekniker.", color: "#6366f1" },
  { initials: "KH", name: "Knut Hansen", company: "Hansen Elektro", vertical: "Elektro", quote: "Enkelt å komme i gang, og support er lynrask. Anbefales sterkt til alle servicebedrifter.", color: "#f59e0b" },
];

const STATIC_FEATURES = [
  { icon: "briefcase", title: "Jobbstyring", description: "Opprett, planlegg og følg opp alle jobber fra ett sted. Full historikk og statusoversikt." },
  { icon: "users", title: "CRM og kunder", description: "Komplett kundekort med kontakter, anlegg, jobber og avtaler samlet på én plass." },
  { icon: "calendar", title: "Ressursplanlegger", description: "Visuell planlegging med dra-og-slipp. Se hvem som er ledig og book direkte." },
  { icon: "zap", title: "Serviceavtaler", description: "Hold styr på alle avtaler med automatiske fornyelsesvarslinger og oppfølging." },
  { icon: "mail", title: "Postkontoret", description: "Innebygd kommunikasjon med kunder og team. Ingen e-post som faller mellom stolene." },
  { icon: "shield", title: "HMS", description: "Dokumenter avvik, risikovurderinger og HMS-rutiner direkte i felten." },
];

export default function LandingPage() {
  const { data: cms } = useCms();

  const headline = cms?.["cms.hero.headline"] ?? "Alt du trenger for feltservice – på ett sted";
  const subheadline = cms?.["cms.hero.subheadline"] ?? "FieldService er et moderne system for servicebedrifter. Start gratis prøveperiode i dag.";
  const ctaText = cms?.["cms.hero.cta_text"] ?? "Start gratis prøveperiode";

  let cmsFeatures: Feature[] = [];
  try { cmsFeatures = JSON.parse(cms?.["cms.features"] ?? "[]"); } catch {}
  const features = cmsFeatures.length > 0 ? cmsFeatures : STATIC_FEATURES;

  const { data: verticals } = useQuery<Vertical[]>({
    queryKey: ["public_verticals"],
    staleTime: 300_000,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("verticals")
        .select("id, slug, display_name, description, icon, color, default_modules")
        .eq("is_active", true)
        .order("slug");
      return (data ?? []) as Vertical[];
    },
  });

  return (
    <PublicLayout>
      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-muted/50 via-muted/20 to-background pt-16 pb-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-5">
              <CheckCircle2 className="w-3.5 h-3.5" /> 14 dager gratis — ingen kredittkort
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.1] mb-5">
              {headline}
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-lg">
              {subheadline}
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button size="lg" asChild className="gap-2 h-12 px-7 text-base">
                <Link to="/register">{ctaText} <ArrowRight className="w-4 h-4" /></Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="h-12 px-7 text-base">
                <Link to="/kontakt">Ta kontakt med oss</Link>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-4 flex flex-wrap gap-3">
              <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Full tilgang i 14 dager</span>
              <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Ingen kredittkort</span>
              <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Data beholdes ved oppgradering</span>
            </p>
          </div>
          <div className="hidden lg:block">
            <DashboardMockup />
          </div>
        </div>
        <div className="pointer-events-none absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
      </section>

      {/* ── How it works ── */}
      <section className="py-16 bg-background border-y border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="text-center text-2xl font-bold mb-10">Kom i gang på minutter</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 relative">
            {[
              { step: "1", title: "Velg bransje", desc: "Velg mellom VVS, varmepumpe eller elektro. Systemet konfigureres automatisk." },
              { step: "2", title: "Konfigurer systemet", desc: "Aktiver modulene du trenger. Legg inn kunder og brukere med ett klikk." },
              { step: "3", title: "Kom i gang", desc: "Systemet er klart til bruk. Første jobb kan registreres innen 5 minutter." },
            ].map((s, i) => (
              <div key={i} className="relative flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg mb-4 relative z-10">
                  {s.step}
                </div>
                {i < 2 && (
                  <div className="hidden sm:block absolute top-6 left-[58%] right-0 h-px border-t-2 border-dashed border-border" />
                )}
                <h3 className="font-bold mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Verticals ── */}
      {(verticals?.length ?? 0) > 0 && (
        <section className="py-20 bg-background">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight mb-3">Tilpasset din bransje</h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Systemet leveres ferdig konfigurert for din bransje med de riktige modulene og arbeidsflyten.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {verticals?.map((v) => {
                const Icon = (v.icon && VERTICAL_ICONS[v.icon]) || Layers;
                const mods = (v.default_modules ?? []).slice(0, 4);
                return (
                  <div
                    key={v.id}
                    className="rounded-2xl overflow-hidden border border-border group hover:shadow-lg transition-shadow"
                  >
                    {/* Color header */}
                    <div
                      className="p-6 relative overflow-hidden"
                      style={{ background: v.color ? `linear-gradient(135deg, ${v.color}30, ${v.color}10)` : undefined }}
                    >
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
                        style={{ backgroundColor: v.color ? v.color + "25" : undefined }}
                      >
                        <Icon className="w-6 h-6" style={{ color: v.color ?? undefined }} />
                      </div>
                      <h3 className="font-bold text-lg">{v.display_name}</h3>
                      {v.description && (
                        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{v.description}</p>
                      )}
                    </div>
                    {/* Modules */}
                    <div className="p-5 bg-card space-y-1.5">
                      {mods.map((m) => (
                        <div key={m} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          {MODULE_LABELS[m] ?? m}
                        </div>
                      ))}
                      <Link
                        to={`/bransjer/${v.slug}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-primary mt-3 group-hover:gap-2 transition-all"
                      >
                        Les mer <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── Features grid ── */}
      <section className="py-20 bg-muted/30 border-y border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight mb-3">Alt i én løsning</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Ingen integrasjoner mellom fem ulike verktøy. Ett system som dekker hele servicehverdagen.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => {
              const Icon = ICONS[f.icon] ?? CheckCircle2;
              return (
                <div key={i} className="bg-background rounded-xl border border-border p-6 hover:border-primary/30 transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="py-20 bg-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight mb-3">Hva kundene sier</h2>
            <p className="text-muted-foreground">Servicebedrifter over hele Norge bruker FieldService daglig.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="bg-card rounded-2xl border border-border p-6 flex flex-col">
                <p className="text-sm text-muted-foreground leading-relaxed mb-5 flex-1">"{t.quote}"</p>
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                    style={{ backgroundColor: t.color }}
                  >
                    {t.initials}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.company}</p>
                  </div>
                  <span
                    className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: t.color + "20", color: t.color }}
                  >
                    {t.vertical}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing teaser ── */}
      <section className="py-20 bg-muted/30 border-t border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight mb-3">Enkel og transparent prising</h2>
          <p className="text-muted-foreground mb-10 max-w-xl mx-auto">
            Start gratis. Velg en plan som passer bedriftens størrelse. Ingen skjulte kostnader.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {[
              { name: "Starter", price: "Fra 499 kr", desc: "For enkeltpersonforetak og små team" },
              { name: "Vekst", price: "Fra 999 kr", desc: "For voksende servicebedrifter", featured: true },
              { name: "Enterprise", price: "Kontakt oss", desc: "For store organisasjoner" },
            ].map((p) => (
              <div
                key={p.name}
                className={`rounded-xl border p-5 text-left ${p.featured ? "border-primary bg-primary/5" : "border-border bg-background"}`}
              >
                {p.featured && (
                  <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Populær</span>
                )}
                <p className="font-bold mt-1">{p.name}</p>
                <p className="text-xl font-extrabold mt-1">{p.price}</p>
                <p className="text-xs text-muted-foreground mt-1">{p.desc}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" asChild className="gap-2 h-12 px-8 text-base">
              <Link to="/register">Start gratis prøveperiode <ArrowRight className="w-4 h-4" /></Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="h-12 px-8 text-base">
              <Link to="/priser">Se alle priser og moduler</Link>
            </Button>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
