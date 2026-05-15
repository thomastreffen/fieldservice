import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import PublicLayout from "@/layouts/PublicLayout";
import {
  ArrowRight, Zap, Users, Calendar, Shield, Briefcase, Mail,
  Thermometer, Droplets, Layers, CheckCircle2, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
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

/* ── Shared browser chrome wrapper ── */
function BrowserChrome() {
  return (
    <div className="flex items-center gap-1.5 px-3 py-2 bg-muted/80 border-b border-border">
      <div className="w-2 h-2 rounded-full bg-red-400/70" />
      <div className="w-2 h-2 rounded-full bg-yellow-400/70" />
      <div className="w-2 h-2 rounded-full bg-green-400/70" />
      <div className="flex-1 mx-3 h-3.5 rounded bg-border/50" />
    </div>
  );
}

/* Mini sidebar shared across all mockups */
function MiniSidebar({ activeIndex = 0 }: { activeIndex?: number }) {
  const items = [
    { label: "Dashboard", w: "62%" },
    { label: "Kontakter", w: "68%" },
    { label: "Jobber", w: "55%" },
    { label: "Kalender", w: "64%" },
    { label: "Anlegg", w: "50%" },
    { label: "Moduler", w: "58%" },
  ];
  return (
    <div className="w-[19%] bg-card border-r border-border p-2 space-y-0.5 shrink-0 overflow-hidden">
      <div className="flex items-center gap-1.5 px-1 mb-3">
        <div className="w-4 h-4 rounded-sm bg-primary/70 shrink-0" />
        <div className="h-2 bg-muted-foreground/20 rounded w-12" />
      </div>
      {items.map((item, i) => (
        <div
          key={i}
          className={cn(
            "h-5 rounded flex items-center gap-1.5 px-1.5",
            i === activeIndex ? "bg-primary/15" : ""
          )}
        >
          <div className={cn("w-2 h-2 rounded-sm shrink-0", i === activeIndex ? "bg-primary/60" : "bg-muted")} />
          <div
            className={cn("h-1.5 rounded", i === activeIndex ? "bg-primary/40" : "bg-muted")}
            style={{ width: item.w }}
          />
        </div>
      ))}
    </div>
  );
}

/* ── Dashboard Mockup (hero) ── */
function DashboardMockup() {
  return (
    <div className="w-full rounded-xl border border-border/60 shadow-2xl shadow-black/10 overflow-hidden bg-background">
      <BrowserChrome />
      <div className="flex" style={{ minHeight: 230 }}>
        <MiniSidebar activeIndex={0} />
        <div className="flex-1 p-3 space-y-2.5 overflow-hidden bg-background">
          {/* Topbar placeholder */}
          <div className="flex items-center justify-between mb-1">
            <div className="h-3 bg-muted rounded w-28" />
            <div className="flex gap-1.5">
              <div className="w-6 h-6 rounded-full bg-primary/20" />
            </div>
          </div>
          {/* KPI cards */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "12", sub: "Aktive jobber", color: "bg-blue-50 dark:bg-blue-950/30", dot: "bg-blue-400" },
              { label: "4", sub: "Teknikere i dag", color: "bg-emerald-50 dark:bg-emerald-950/30", dot: "bg-emerald-400" },
              { label: "87k", sub: "Inntekt MTD", color: "bg-violet-50 dark:bg-violet-950/30", dot: "bg-violet-400" },
            ].map((c, i) => (
              <div key={i} className={cn("rounded-lg p-2", c.color)}>
                <div className="flex items-center gap-1 mb-1">
                  <div className={cn("w-1.5 h-1.5 rounded-full", c.dot)} />
                  <div className="h-1.5 bg-current/10 rounded w-10" />
                </div>
                <div className="text-[11px] font-bold opacity-70">{c.label}</div>
                <div className="h-1.5 bg-current/10 rounded w-14 mt-1" />
              </div>
            ))}
          </div>
          {/* Technician list */}
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="px-2.5 py-1.5 bg-muted/40 flex items-center gap-2">
              <div className="h-1.5 bg-muted-foreground/25 rounded w-20" />
            </div>
            {[
              { dot: "bg-emerald-400", label1: "bg-muted w-14", label2: "bg-emerald-200/80 w-10" },
              { dot: "bg-amber-400",   label1: "bg-muted w-16", label2: "bg-amber-200/80 w-12" },
              { dot: "bg-blue-400",    label1: "bg-muted w-12", label2: "bg-blue-200/80 w-8" },
            ].map((row, i) => (
              <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 border-t border-border">
                <div className={cn("w-2 h-2 rounded-full shrink-0", row.dot)} />
                <div className={cn("h-1.5 rounded flex-1", row.label1)} />
                <div className={cn("h-1.5 rounded", row.label2)} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Jobs Screen Mockup ── */
function JobsMockup() {
  const badges = [
    { label: "Pågår", cls: "bg-amber-100 text-amber-700" },
    { label: "Fullført", cls: "bg-emerald-100 text-emerald-700" },
    { label: "Åpen", cls: "bg-blue-100 text-blue-700" },
    { label: "Avventer", cls: "bg-gray-100 text-gray-500" },
    { label: "Fullført", cls: "bg-emerald-100 text-emerald-700" },
  ];
  const rows = [
    ["#JB-142", "Larsen VVS AS", "Servicebesøk", 0],
    ["#JB-141", "Hansen Elektro", "Installasjon",  1],
    ["#JB-140", "Moen Bygg AS",   "Reparasjon",    2],
    ["#JB-139", "Nilsen AS",      "Inspeksjon",    3],
    ["#JB-138", "Berg Service",   "Servicebesøk",  4],
  ];
  return (
    <div className="flex-1 p-3 overflow-hidden bg-background space-y-2">
      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-1">
        <div className="h-6 rounded bg-muted flex-1" />
        <div className="h-6 w-14 rounded bg-primary/70" />
      </div>
      {/* Table */}
      <div className="border border-border rounded-lg overflow-hidden text-[10px]">
        <div className="grid grid-cols-[40px_1fr_1fr_70px_55px] gap-x-2 px-2.5 py-1.5 bg-muted/40 border-b border-border">
          {["ID", "Kunde", "Type", "Status", "Dato"].map((h) => (
            <div key={h} className="h-1.5 bg-muted-foreground/30 rounded" />
          ))}
        </div>
        {rows.map(([id, kunde, type, bi], i) => (
          <div key={i} className="grid grid-cols-[40px_1fr_1fr_70px_55px] gap-x-2 px-2.5 py-1.5 border-t border-border items-center">
            <div className="h-1.5 bg-muted rounded" style={{ width: "80%" }} />
            <div className="h-1.5 bg-muted rounded" style={{ width: "75%" }} />
            <div className="h-1.5 bg-muted rounded" style={{ width: "65%" }} />
            <div className={cn("rounded-full px-1.5 py-0.5 text-[8px] font-semibold leading-tight inline-block truncate", badges[bi as number].cls)}>
              {badges[bi as number].label}
            </div>
            <div className="h-1.5 bg-muted rounded" style={{ width: "70%" }} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Planner Screen Mockup ── */
function PlannerMockup() {
  const days = ["Man", "Tir", "Ons", "Tor", "Fre"];
  const techRows = [
    { initials: "ON", blocks: [true, false, true, true, false], colors: ["bg-blue-200", "", "bg-blue-300", "bg-blue-200", ""] },
    { initials: "PA", blocks: [false, true, true, false, true], colors: ["", "bg-violet-200", "bg-violet-300", "", "bg-violet-200"] },
    { initials: "LM", blocks: [true, true, false, true, true], colors: ["bg-emerald-200", "bg-emerald-300", "", "bg-emerald-200", "bg-emerald-200"] },
    { initials: "KH", blocks: [false, false, true, true, false], colors: ["", "", "bg-amber-200", "bg-amber-300", ""] },
  ];
  return (
    <div className="flex-1 p-3 overflow-hidden bg-background space-y-2">
      {/* Week nav */}
      <div className="flex items-center gap-2 mb-1">
        <div className="h-5 w-5 rounded bg-muted" />
        <div className="h-2 bg-muted rounded w-24" />
        <div className="h-5 w-5 rounded bg-muted" />
        <div className="ml-auto h-5 w-12 rounded bg-primary/70" />
      </div>
      {/* Grid */}
      <div className="border border-border rounded-lg overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[52px_1fr_1fr_1fr_1fr_1fr] border-b border-border bg-muted/40">
          <div className="px-2 py-1.5" />
          {days.map((d) => (
            <div key={d} className="px-1 py-1.5 text-[9px] font-semibold text-center text-muted-foreground">{d}</div>
          ))}
        </div>
        {/* Rows */}
        {techRows.map((row, ri) => (
          <div key={ri} className="grid grid-cols-[52px_1fr_1fr_1fr_1fr_1fr] border-t border-border">
            <div className="flex items-center px-2 py-2">
              <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[7px] font-bold text-primary shrink-0">
                {row.initials}
              </div>
            </div>
            {row.blocks.map((has, di) => (
              <div key={di} className="p-0.5 min-h-[28px] flex items-center">
                {has && (
                  <div className={cn("rounded w-full h-5", row.colors[di])} />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Contacts Screen Mockup ── */
function ContactsMockup() {
  const rows = [
    { initials: "OL", name: "Ole Larsen",    company: "Larsen VVS AS",   age: "3d" },
    { initials: "AN", name: "Anna Nilsen",   company: "Moen Bygg AS",    age: "1u" },
    { initials: "PH", name: "Per Hansen",    company: "Hansen Elektro",  age: "4d" },
    { initials: "KB", name: "Kari Berg",     company: "Berg Service AS", age: "2d" },
  ];
  return (
    <div className="flex-1 p-3 overflow-hidden bg-background space-y-2">
      {/* Search + button */}
      <div className="flex items-center gap-2 mb-1">
        <div className="h-6 rounded bg-muted flex-1" />
        <div className="h-6 w-20 rounded bg-primary/70" />
      </div>
      {/* Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="grid grid-cols-[24px_1fr_1fr_50px] gap-x-2 px-2.5 py-1.5 bg-muted/40 border-b border-border">
          {["", "Navn / Bedrift", "E-post", "Kontakt"].map((h, i) => (
            <div key={i} className="h-1.5 bg-muted-foreground/25 rounded" />
          ))}
        </div>
        {rows.map((row, i) => (
          <div key={i} className="grid grid-cols-[24px_1fr_1fr_50px] gap-x-2 px-2.5 py-1.5 border-t border-border items-center">
            <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[7px] font-bold text-primary">
              {row.initials}
            </div>
            <div className="space-y-1">
              <div className="h-1.5 bg-muted rounded" style={{ width: "75%" }} />
              <div className="h-1.5 bg-muted/60 rounded" style={{ width: "60%" }} />
            </div>
            <div className="h-1.5 bg-muted rounded" style={{ width: "70%" }} />
            <div className="h-1.5 bg-muted/60 rounded" style={{ width: "60%" }} />
          </div>
        ))}
      </div>
    </div>
  );
}

const SCREEN_TABS = [
  { key: "dashboard", label: "Dashboard", desc: "Oversikt over dagen, KPI-er og teknikere" },
  { key: "jobs",      label: "Jobbstyring", desc: "Alle jobber med status og filtrering" },
  { key: "planner",   label: "Ressursplanlegger", desc: "Ukentlig planlegging med dra-og-slipp" },
  { key: "contacts",  label: "CRM Kontakter", desc: "Kontaktpersoner og kundehistorikk" },
];

function AppShowcaseSection() {
  const [active, setActive] = useState("dashboard");
  const current = SCREEN_TABS.find((t) => t.key === active)!;

  return (
    <section className="py-20 bg-muted/20 border-y border-border">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold tracking-tight mb-3">Se systemet i aksjon</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Intuitivt design bygget for servicehverdagen — fra kontor til felt.
          </p>
        </div>

        {/* Tab bar */}
        <div className="flex flex-wrap gap-2 justify-center mb-8">
          {SCREEN_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActive(tab.key)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all border",
                active === tab.key
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-background text-muted-foreground border-border hover:text-foreground hover:border-primary/40"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Mockup window */}
        <div className="w-full rounded-xl border border-border/60 shadow-2xl shadow-black/10 overflow-hidden bg-background">
          <BrowserChrome />
          <div className="flex" style={{ minHeight: 340 }}>
            <MiniSidebar activeIndex={active === "dashboard" ? 0 : active === "contacts" ? 1 : active === "jobs" ? 2 : 3} />
            {active === "dashboard" && (
              <div className="flex-1 p-3 overflow-hidden bg-background space-y-2.5">
                <div className="flex items-center justify-between mb-0.5">
                  <div className="space-y-0.5">
                    <div className="h-2.5 bg-foreground/15 rounded w-40" />
                    <div className="h-1.5 bg-muted rounded w-28" />
                  </div>
                  <div className="flex gap-1.5">
                    <div className="w-6 h-6 rounded-full bg-primary/15" />
                  </div>
                </div>
                {/* KPI row */}
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { n: "12", lbl: "Aktive jobber",  bg: "bg-blue-50 dark:bg-blue-950/30",    dot: "bg-blue-400" },
                    { n: "4",  lbl: "Teknikere",       bg: "bg-emerald-50 dark:bg-emerald-950/30", dot: "bg-emerald-400" },
                    { n: "87k",lbl: "Inntekt MTD",     bg: "bg-violet-50 dark:bg-violet-950/30",  dot: "bg-violet-400" },
                    { n: "3",  lbl: "Åpne varsler",    bg: "bg-orange-50 dark:bg-orange-950/30",  dot: "bg-orange-400" },
                  ].map((c, i) => (
                    <div key={i} className={cn("rounded-lg p-2.5", c.bg)}>
                      <div className={cn("w-2 h-2 rounded-full mb-1.5", c.dot)} />
                      <div className="text-[13px] font-bold opacity-60">{c.n}</div>
                      <div className="h-1.5 bg-current/10 rounded w-14 mt-1.5" />
                    </div>
                  ))}
                </div>
                {/* Two column layout */}
                <div className="grid grid-cols-[1fr_1fr] gap-2.5">
                  {/* Teknikere i dag */}
                  <div className="border border-border rounded-lg overflow-hidden">
                    <div className="px-2.5 py-1.5 bg-muted/40 border-b border-border">
                      <div className="h-1.5 bg-muted-foreground/25 rounded w-24" />
                    </div>
                    {[
                      { dot: "bg-emerald-400", w1: "w-16", w2: "w-10", badge: "bg-emerald-100" },
                      { dot: "bg-amber-400",   w1: "w-14", w2: "w-12", badge: "bg-amber-100" },
                      { dot: "bg-blue-400",    w1: "w-12", w2: "w-8",  badge: "bg-blue-100" },
                      { dot: "bg-gray-300",    w1: "w-15", w2: "w-9",  badge: "bg-gray-100" },
                    ].map((row, i) => (
                      <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 border-t border-border">
                        <div className={cn("w-2 h-2 rounded-full shrink-0", row.dot)} />
                        <div className={cn("h-1.5 rounded flex-1 bg-muted")} />
                        <div className={cn("h-3 w-8 rounded-full", row.badge)} />
                      </div>
                    ))}
                  </div>
                  {/* Oppstartssjekk */}
                  <div className="border border-border rounded-lg overflow-hidden">
                    <div className="px-2.5 py-1.5 bg-muted/40 border-b border-border">
                      <div className="h-1.5 bg-muted-foreground/25 rounded w-28" />
                    </div>
                    {[true, true, true, false, false].map((done, i) => (
                      <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 border-t border-border">
                        <div className={cn("w-3 h-3 rounded-sm border shrink-0 flex items-center justify-center",
                          done ? "bg-primary/80 border-primary" : "border-border"
                        )}>
                          {done && <div className="w-1.5 h-1 border-b border-r border-white rotate-45 -translate-y-px" />}
                        </div>
                        <div className={cn("h-1.5 rounded flex-1", done ? "bg-muted" : "bg-muted-foreground/15")} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {active === "jobs" && <JobsMockup />}
            {active === "planner" && <PlannerMockup />}
            {active === "contacts" && <ContactsMockup />}
          </div>
        </div>

        {/* Caption */}
        <p className="text-center text-sm text-muted-foreground mt-4">
          <span className="font-medium text-foreground">{current.label}:</span> {current.desc}
        </p>
      </div>
    </section>
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

      {/* ── App Showcase ── */}
      <AppShowcaseSection />

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
