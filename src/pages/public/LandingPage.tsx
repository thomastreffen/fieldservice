import { useState, useEffect, useRef, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import PublicLayout from "@/layouts/PublicLayout";
import { SeoHead } from "@/components/SeoHead";
import {
  ArrowRight, Zap, Users, Calendar, Shield, Briefcase, Mail,
  Thermometer, Droplets, Layers, CheckCircle2, Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

// ─── Icon maps ────────────────────────────────────────────────────────────────
const VERTICAL_ICONS: Record<string, LucideIcon> = {
  zap: Zap, thermometer: Thermometer, droplets: Droplets,
};
const MODULE_LABELS: Record<string, string> = {
  crm: "CRM og kunder", jobs: "Jobbstyring", assets: "Anleggsregister",
  ressursplanlegger: "Ressursplanlegger", postkontoret: "Postkontoret",
  hms: "HMS", warranties: "Garantisaker",
  service_agreements: "Serviceavtaler", el_certificates: "El-sertifikater",
};

// ─── Types ────────────────────────────────────────────────────────────────────
type CmsSettings = Record<string, string>;
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

// ─── Scroll reveal ────────────────────────────────────────────────────────────
type RevealDir = "up" | "left" | "right";
const HIDDEN: Record<RevealDir, string> = {
  up:    "opacity-0 translate-y-8",
  left:  "opacity-0 -translate-x-8",
  right: "opacity-0 translate-x-8",
};

function Reveal({ children, className, direction = "up", delay = 0 }: {
  children: ReactNode; className?: string; direction?: RevealDir; delay?: number;
}) {
  const [vis, setVis] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setTimeout(() => setVis(true), delay); io.disconnect(); } },
      { threshold: 0.07, rootMargin: "0px 0px -40px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [delay]);
  return (
    <div
      ref={ref}
      style={{ transitionTimingFunction: "cubic-bezier(0.16,1,0.3,1)" }}
      className={cn(
        "transition-[opacity,transform] duration-700",
        vis ? "opacity-100 translate-y-0 translate-x-0" : HIDDEN[direction],
        className
      )}
    >
      {children}
    </div>
  );
}

// ─── Mockup components ────────────────────────────────────────────────────────
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

function MiniSidebar({ activeIndex = 0 }: { activeIndex?: number }) {
  const items = [
    { w: "62%" }, { w: "68%" }, { w: "55%" }, { w: "64%" }, { w: "50%" }, { w: "58%" },
  ];
  return (
    <div className="w-[19%] bg-card border-r border-border p-2 space-y-0.5 shrink-0 overflow-hidden">
      <div className="flex items-center gap-1.5 px-1 mb-3">
        <div className="w-4 h-4 rounded-sm bg-primary/70 shrink-0" />
        <div className="h-2 bg-muted-foreground/20 rounded w-12" />
      </div>
      {items.map((item, i) => (
        <div key={i} className={cn("h-5 rounded flex items-center gap-1.5 px-1.5", i === activeIndex && "bg-primary/15")}>
          <div className={cn("w-2 h-2 rounded-sm shrink-0", i === activeIndex ? "bg-primary/60" : "bg-muted")} />
          <div className={cn("h-1.5 rounded", i === activeIndex ? "bg-primary/40" : "bg-muted")} style={{ width: item.w }} />
        </div>
      ))}
    </div>
  );
}

function DashboardMockup() {
  return (
    <div className="w-full rounded-xl border border-border/60 shadow-2xl shadow-primary/[0.07] overflow-hidden bg-background">
      <BrowserChrome />
      <div className="flex" style={{ minHeight: 240 }}>
        <MiniSidebar activeIndex={0} />
        <div className="flex-1 p-3 space-y-2.5 overflow-hidden bg-background">
          <div className="flex items-center justify-between mb-1">
            <div className="space-y-0.5">
              <div className="h-2.5 bg-foreground/15 rounded w-36" />
              <div className="h-1.5 bg-muted rounded w-24" />
            </div>
            <div className="w-6 h-6 rounded-full bg-primary/20" />
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[
              { n: "12", bg: "bg-blue-50",    dot: "bg-blue-400" },
              { n: "4",  bg: "bg-emerald-50", dot: "bg-emerald-400" },
              { n: "87k",bg: "bg-violet-50",  dot: "bg-violet-400" },
              { n: "3",  bg: "bg-orange-50",  dot: "bg-orange-400" },
            ].map((c, i) => (
              <div key={i} className={cn("rounded-lg p-2.5", c.bg)}>
                <div className={cn("w-2 h-2 rounded-full mb-1.5", c.dot)} />
                <div className="text-[13px] font-bold opacity-60">{c.n}</div>
                <div className="h-1.5 bg-black/5 rounded w-12 mt-1" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="px-2.5 py-1.5 bg-muted/40 border-b border-border">
                <div className="h-1.5 bg-muted-foreground/25 rounded w-24" />
              </div>
              {[
                { dot: "bg-emerald-400", badge: "bg-emerald-100" },
                { dot: "bg-amber-400",   badge: "bg-amber-100" },
                { dot: "bg-blue-400",    badge: "bg-blue-100" },
                { dot: "bg-gray-300",    badge: "bg-gray-100" },
              ].map((row, i) => (
                <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 border-t border-border">
                  <div className={cn("w-2 h-2 rounded-full shrink-0", row.dot)} />
                  <div className="h-1.5 rounded flex-1 bg-muted" />
                  <div className={cn("h-3 w-8 rounded-full", row.badge)} />
                </div>
              ))}
            </div>
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="px-2.5 py-1.5 bg-muted/40 border-b border-border">
                <div className="h-1.5 bg-muted-foreground/25 rounded w-28" />
              </div>
              {[true, true, true, false, false].map((done, i) => (
                <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 border-t border-border">
                  <div className={cn("w-3 h-3 rounded-sm border shrink-0 flex items-center justify-center", done ? "bg-primary/80 border-primary" : "border-border")}>
                    {done && <div className="w-1.5 h-1 border-b border-r border-white rotate-45 -translate-y-px" />}
                  </div>
                  <div className={cn("h-1.5 rounded flex-1", done ? "bg-muted" : "bg-muted-foreground/15")} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function JobsMockup() {
  const badges = [
    { label: "Pågår",    cls: "bg-amber-100 text-amber-700" },
    { label: "Fullført", cls: "bg-emerald-100 text-emerald-700" },
    { label: "Åpen",     cls: "bg-blue-100 text-blue-700" },
    { label: "Avventer", cls: "bg-gray-100 text-gray-500" },
    { label: "Fullført", cls: "bg-emerald-100 text-emerald-700" },
  ];
  return (
    <div className="flex-1 p-3 overflow-hidden bg-background space-y-2">
      <div className="flex items-center gap-2 mb-1">
        <div className="h-6 rounded bg-muted flex-1" />
        <div className="h-6 w-14 rounded bg-primary/70" />
      </div>
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="grid grid-cols-[40px_1fr_1fr_70px_55px] gap-x-2 px-2.5 py-1.5 bg-muted/40 border-b border-border">
          {[0,1,2,3,4].map((i) => <div key={i} className="h-1.5 bg-muted-foreground/30 rounded" />)}
        </div>
        {badges.map((b, i) => (
          <div key={i} className="grid grid-cols-[40px_1fr_1fr_70px_55px] gap-x-2 px-2.5 py-1.5 border-t border-border items-center">
            <div className="h-1.5 bg-muted rounded" style={{ width: "80%" }} />
            <div className="h-1.5 bg-muted rounded" style={{ width: "75%" }} />
            <div className="h-1.5 bg-muted rounded" style={{ width: "65%" }} />
            <div className={cn("rounded-full px-1.5 py-0.5 text-[8px] font-semibold leading-tight inline-block", b.cls)}>{b.label}</div>
            <div className="h-1.5 bg-muted rounded" style={{ width: "70%" }} />
          </div>
        ))}
      </div>
    </div>
  );
}

function PlannerMockup() {
  const days = ["Man", "Tir", "Ons", "Tor", "Fre"];
  const rows = [
    { initials: "ON", blocks: [true,false,true,true,false], colors: ["bg-blue-200","","bg-blue-300","bg-blue-200",""] },
    { initials: "PA", blocks: [false,true,true,false,true], colors: ["","bg-violet-200","bg-violet-300","","bg-violet-200"] },
    { initials: "LM", blocks: [true,true,false,true,true], colors: ["bg-emerald-200","bg-emerald-300","","bg-emerald-200","bg-emerald-200"] },
    { initials: "KH", blocks: [false,false,true,true,false], colors: ["","","bg-amber-200","bg-amber-300",""] },
  ];
  return (
    <div className="flex-1 p-3 overflow-hidden bg-background space-y-2">
      <div className="flex items-center gap-2 mb-1">
        <div className="h-5 w-5 rounded bg-muted" />
        <div className="h-2 bg-muted rounded w-24" />
        <div className="h-5 w-5 rounded bg-muted" />
        <div className="ml-auto h-5 w-12 rounded bg-primary/70" />
      </div>
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="grid grid-cols-[52px_1fr_1fr_1fr_1fr_1fr] border-b border-border bg-muted/40">
          <div />
          {days.map((d) => <div key={d} className="px-1 py-1.5 text-[9px] font-semibold text-center text-muted-foreground">{d}</div>)}
        </div>
        {rows.map((row, ri) => (
          <div key={ri} className="grid grid-cols-[52px_1fr_1fr_1fr_1fr_1fr] border-t border-border">
            <div className="flex items-center px-2 py-2">
              <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[7px] font-bold text-primary shrink-0">{row.initials}</div>
            </div>
            {row.blocks.map((has, di) => (
              <div key={di} className="p-0.5 min-h-[28px] flex items-center">
                {has && <div className={cn("rounded w-full h-5", row.colors[di])} />}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function ContactsMockup() {
  return (
    <div className="flex-1 p-3 overflow-hidden bg-background space-y-2">
      <div className="flex items-center gap-2 mb-1">
        <div className="h-6 rounded bg-muted flex-1" />
        <div className="h-6 w-20 rounded bg-primary/70" />
      </div>
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="grid grid-cols-[24px_1fr_1fr_50px] gap-x-2 px-2.5 py-1.5 bg-muted/40 border-b border-border">
          {[0,1,2,3].map((i) => <div key={i} className="h-1.5 bg-muted-foreground/25 rounded" />)}
        </div>
        {["OL","AN","PH","KB"].map((initials, i) => (
          <div key={i} className="grid grid-cols-[24px_1fr_1fr_50px] gap-x-2 px-2.5 py-1.5 border-t border-border items-center">
            <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[7px] font-bold text-primary">{initials}</div>
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

function FeatureMockupWindow({ activeIndex, children }: { activeIndex: number; children: ReactNode }) {
  return (
    <div className="w-full rounded-xl border border-border/60 shadow-2xl shadow-black/[0.07] overflow-hidden bg-background">
      <BrowserChrome />
      <div className="flex" style={{ minHeight: 280 }}>
        <MiniSidebar activeIndex={activeIndex} />
        {children}
      </div>
    </div>
  );
}

// ─── App Showcase ─────────────────────────────────────────────────────────────
const SCREEN_TABS = [
  { key: "dashboard", label: "Dashboard",        desc: "Oversikt over dagen, KPI-er og teknikere",    idx: 0 },
  { key: "jobs",      label: "Jobbstyring",       desc: "Alle jobber med status og filtrering",        idx: 2 },
  { key: "planner",   label: "Ressursplanlegger", desc: "Ukentlig planlegging med dra-og-slipp",       idx: 3 },
  { key: "contacts",  label: "CRM Kontakter",     desc: "Kontaktpersoner og kundehistorikk",           idx: 1 },
];

function AppShowcaseSection() {
  const [active, setActive] = useState("dashboard");
  const current = SCREEN_TABS.find((t) => t.key === active)!;
  return (
    <section className="py-24 bg-background border-y border-border">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <Reveal className="text-center mb-10">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-3">PRODUKTET</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3">Se systemet i aksjon</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">Intuitivt design bygget for servicehverdagen — fra kontor til felt.</p>
        </Reveal>
        <Reveal delay={80} className="flex flex-wrap gap-2 justify-center mb-8">
          {SCREEN_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActive(tab.key)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 border",
                active === tab.key
                  ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20"
                  : "bg-background text-muted-foreground border-border hover:text-foreground hover:border-primary/40 hover:bg-primary/5"
              )}
            >
              {tab.label}
            </button>
          ))}
        </Reveal>
        <Reveal delay={140} className="w-full rounded-xl border border-border/60 shadow-2xl shadow-black/[0.07] overflow-hidden bg-background">
          <BrowserChrome />
          <div className="flex" style={{ minHeight: 340 }}>
            <MiniSidebar activeIndex={current.idx} />
            {active === "dashboard" && (
              <div className="flex-1 p-3 overflow-hidden bg-background space-y-2.5">
                <div className="flex items-center justify-between mb-0.5">
                  <div className="space-y-0.5">
                    <div className="h-2.5 bg-foreground/15 rounded w-40" />
                    <div className="h-1.5 bg-muted rounded w-28" />
                  </div>
                  <div className="w-6 h-6 rounded-full bg-primary/15" />
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { n: "12", bg: "bg-blue-50",    dot: "bg-blue-400" },
                    { n: "4",  bg: "bg-emerald-50", dot: "bg-emerald-400" },
                    { n: "87k",bg: "bg-violet-50",  dot: "bg-violet-400" },
                    { n: "3",  bg: "bg-orange-50",  dot: "bg-orange-400" },
                  ].map((c, i) => (
                    <div key={i} className={cn("rounded-lg p-2.5", c.bg)}>
                      <div className={cn("w-2 h-2 rounded-full mb-1.5", c.dot)} />
                      <div className="text-[13px] font-bold opacity-60">{c.n}</div>
                      <div className="h-1.5 bg-black/5 rounded w-14 mt-1.5" />
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="border border-border rounded-lg overflow-hidden">
                    <div className="px-2.5 py-1.5 bg-muted/40 border-b border-border"><div className="h-1.5 bg-muted-foreground/25 rounded w-24" /></div>
                    {[
                      { dot: "bg-emerald-400", badge: "bg-emerald-100" },
                      { dot: "bg-amber-400",   badge: "bg-amber-100" },
                      { dot: "bg-blue-400",    badge: "bg-blue-100" },
                      { dot: "bg-gray-300",    badge: "bg-gray-100" },
                    ].map((row, i) => (
                      <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 border-t border-border">
                        <div className={cn("w-2 h-2 rounded-full shrink-0", row.dot)} />
                        <div className="h-1.5 rounded flex-1 bg-muted" />
                        <div className={cn("h-3 w-8 rounded-full", row.badge)} />
                      </div>
                    ))}
                  </div>
                  <div className="border border-border rounded-lg overflow-hidden">
                    <div className="px-2.5 py-1.5 bg-muted/40 border-b border-border"><div className="h-1.5 bg-muted-foreground/25 rounded w-28" /></div>
                    {[true,true,true,false,false].map((done, i) => (
                      <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 border-t border-border">
                        <div className={cn("w-3 h-3 rounded-sm border shrink-0 flex items-center justify-center", done ? "bg-primary/80 border-primary" : "border-border")}>
                          {done && <div className="w-1.5 h-1 border-b border-r border-white rotate-45 -translate-y-px" />}
                        </div>
                        <div className={cn("h-1.5 rounded flex-1", done ? "bg-muted" : "bg-muted-foreground/15")} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {active === "jobs"     && <JobsMockup />}
            {active === "planner"  && <PlannerMockup />}
            {active === "contacts" && <ContactsMockup />}
          </div>
        </Reveal>
        <p className="text-center text-sm text-muted-foreground mt-4">
          <span className="font-medium text-foreground">{current.label}:</span> {current.desc}
        </p>
      </div>
    </section>
  );
}

// ─── Static data ──────────────────────────────────────────────────────────────
const TESTIMONIALS = [
  { initials: "OL", name: "Ole Larsen",  company: "Larsen VVS AS",      vertical: "VVS",        quote: "FieldService har fullstendig forandret hvordan vi jobber. Alle jobber, kunder og avtaler på ett sted — endelig.", color: "#06b6d4" },
  { initials: "AM", name: "Astrid Moen", company: "Norsk Varmepumpe AS", vertical: "Varmepumpe", quote: "Ressursplanleggeren alene er verdt prisen. Vi slipper å ringe rundt for å finne ledig tekniker.", color: "#6366f1" },
  { initials: "KH", name: "Knut Hansen", company: "Hansen Elektro",      vertical: "Elektro",    quote: "Enkelt å komme i gang, og support er lynrask. Anbefales sterkt til alle servicebedrifter.", color: "#f59e0b" },
];

const FEATURE_ROWS = [
  {
    label: "JOBBSTYRING",
    title: "Alle oppdrag under full kontroll",
    description: "Opprett, tilordne og følg opp jobber i sanntid. Fra kundebestilling til ferdig rapport — alt på ett sted.",
    bullets: [
      "Opprett jobber med ett klikk fra kundekortet",
      "Tilordne teknikere og sett frister automatisk",
      "Statusoppdateringer i sanntid fra felten",
    ],
    mockupIdx: 2,
    Mockup: JobsMockup,
    flip: false,
  },
  {
    label: "RESSURSPLANLEGGER",
    title: "Visuell planlegging med dra-og-slipp",
    description: "Se hvem som er ledig, book direkte i planleggeren og unngå dobbeltbooking. Enkelt og oversiktlig.",
    bullets: [
      "Ukentlig oversikt over alle teknikere",
      "Dra-og-slipp for rask omplanlegging",
      "Kapasitetsvisning og fravær i ett bilde",
    ],
    mockupIdx: 3,
    Mockup: PlannerMockup,
    flip: true,
  },
  {
    label: "CRM OG KUNDER",
    title: "Komplett kundekort med full historikk",
    description: "Samle alle kontakter, anlegg, jobber og avtaler på ett sted. Spar tid og gi bedre service.",
    bullets: [
      "Full historikk på alle anlegg og kunder",
      "Automatiske fornyelsesvarslinger på avtaler",
      "Søk og filtrer på tvers av hele kundebasen",
    ],
    mockupIdx: 1,
    Mockup: ContactsMockup,
    flip: false,
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const { data: cms } = useCms();
  const headline    = cms?.["cms.hero.headline"]    ?? "Alt du trenger for feltservice – på ett sted";
  const subheadline = cms?.["cms.hero.subheadline"] ?? "FieldService er et moderne system for servicebedrifter. Start gratis prøveperiode i dag.";
  const ctaText     = cms?.["cms.hero.cta_text"]    ?? "Start gratis prøveperiode";

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
      <SeoHead
        title="FieldService – Alt du trenger for feltservice"
        description="Moderne field service system for varmepumpe, elektro og VVS-bedrifter. Start gratis prøveperiode i dag."
        canonicalPath="/"
      />

      {/* ── 1. Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-background pt-16 pb-24">
        <div className="pointer-events-none absolute -top-24 -right-24 w-[700px] h-[700px] rounded-full bg-primary/[0.07] blur-[120px]" />
        <div className="pointer-events-none absolute top-1/2 -left-40 w-[500px] h-[500px] rounded-full bg-violet-400/[0.05] blur-[90px]" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 grid lg:grid-cols-2 gap-14 items-center">
          <Reveal direction="left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-7">
              <CheckCircle2 className="w-3.5 h-3.5" /> 14 dager gratis — ingen kredittkort
            </div>
            <h1 className="text-5xl sm:text-6xl font-black tracking-tight leading-[1.05] mb-6">
              {headline}
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed mb-9 max-w-lg">
              {subheadline}
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                size="lg"
                asChild
                className="gap-2 h-12 px-8 text-base font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
              >
                <Link to="/register">{ctaText} <ArrowRight className="w-4 h-4" /></Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="h-12 px-8 text-base hover:border-primary/50 hover:bg-primary/5 transition-all duration-200"
              >
                <Link to="/kontakt">Ta kontakt med oss</Link>
              </Button>
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-2 mt-6">
              {["Full tilgang i 14 dager", "Ingen kredittkort", "Data beholdes ved oppgradering"].map((t) => (
                <span key={t} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> {t}
                </span>
              ))}
            </div>
          </Reveal>

          <Reveal direction="right" delay={160} className="hidden lg:block">
            <DashboardMockup />
          </Reveal>
        </div>
      </section>

      {/* ── 2. Feature alternating rows ─────────────────────────────────────── */}
      <section className="bg-violet-50/70 border-y border-violet-100">
        {FEATURE_ROWS.map((feat) => (
          <div key={feat.label} className="border-b border-violet-100/60 last:border-0">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
                <Reveal direction={feat.flip ? "right" : "left"} className={cn(feat.flip && "lg:order-2")}>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-3">{feat.label}</p>
                  <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight mb-4">{feat.title}</h2>
                  <p className="text-lg text-muted-foreground leading-relaxed mb-6">{feat.description}</p>
                  <ul className="space-y-3 mb-7">
                    {feat.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                          <CheckCircle2 className="w-3 h-3 text-primary" />
                        </div>
                        <span className="text-sm text-muted-foreground leading-relaxed">{b}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    to="/register"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:gap-3 transition-all duration-200"
                  >
                    Kom i gang gratis <ArrowRight className="w-4 h-4" />
                  </Link>
                </Reveal>

                <Reveal direction={feat.flip ? "left" : "right"} delay={120} className={cn(feat.flip && "lg:order-1")}>
                  <FeatureMockupWindow activeIndex={feat.mockupIdx}>
                    <feat.Mockup />
                  </FeatureMockupWindow>
                </Reveal>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* ── 3. App Showcase ─────────────────────────────────────────────────── */}
      <AppShowcaseSection />

      {/* ── 4. How it works (dark) ──────────────────────────────────────────── */}
      <section className="py-24 bg-[#0c1123]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <Reveal className="text-center mb-16">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-400 mb-3">OPPSETT</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-3">Kom i gang på minutter</h2>
            <p className="text-slate-400 max-w-xl mx-auto">Ingen IT-avdeling nødvendig. Du er oppe og kjører samme dag.</p>
          </Reveal>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 relative">
            {[
              { step: "1", title: "Velg bransje", desc: "Velg mellom VVS, varmepumpe eller elektro. Systemet konfigureres automatisk for din bransje." },
              { step: "2", title: "Konfigurer", desc: "Aktiver modulene du trenger. Legg inn kunder og brukere med ett klikk." },
              { step: "3", title: "Kom i gang", desc: "Første jobb kan registreres innen 5 minutter. Teknikere får mobilapp med én gang." },
            ].map((s, i) => (
              <Reveal key={s.step} delay={i * 120} className="relative flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-white font-black text-xl mb-5 shadow-lg shadow-primary/50 relative z-10">
                  {s.step}
                </div>
                {i < 2 && (
                  <div className="hidden sm:block absolute top-7 left-[57%] right-0 h-px border-t-2 border-dashed border-white/10" />
                )}
                <h3 className="font-bold text-white mb-2 text-lg">{s.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{s.desc}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. Verticals ────────────────────────────────────────────────────── */}
      {(verticals?.length ?? 0) > 0 && (
        <section className="py-24 bg-violet-50/70 border-y border-violet-100">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <Reveal className="text-center mb-12">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-3">BRANSJER</p>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3">Tilpasset din bransje</h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Systemet leveres ferdig konfigurert for din bransje med de riktige modulene og arbeidsflyten.
              </p>
            </Reveal>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {verticals?.map((v, i) => {
                const Icon = (v.icon && VERTICAL_ICONS[v.icon]) || Layers;
                const mods = (v.default_modules ?? []).slice(0, 4);
                return (
                  <Reveal key={v.id} delay={i * 80}>
                    <div className="rounded-2xl overflow-hidden border border-border bg-background group hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 h-full flex flex-col">
                      <div
                        className="p-8 relative overflow-hidden flex-shrink-0"
                        style={{ background: v.color ? `linear-gradient(135deg, ${v.color}35, ${v.color}0d)` : undefined }}
                      >
                        <div
                          className="w-20 h-20 rounded-2xl flex items-center justify-center mb-5 shadow-sm"
                          style={{ background: v.color ? `linear-gradient(135deg, ${v.color}50, ${v.color}25)` : "hsl(var(--muted))" }}
                        >
                          <Icon className="w-10 h-10" style={{ color: v.color ?? undefined }} />
                        </div>
                        <h3 className="font-bold text-xl mb-2">{v.display_name}</h3>
                        {v.description && (
                          <p className="text-sm text-muted-foreground leading-relaxed">{v.description}</p>
                        )}
                      </div>
                      <div className="p-6 space-y-2 flex-1 flex flex-col">
                        <div className="space-y-2 flex-1">
                          {mods.map((m) => (
                            <div key={m} className="flex items-center gap-2 text-sm text-muted-foreground">
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                              {MODULE_LABELS[m] ?? m}
                            </div>
                          ))}
                        </div>
                        <Link
                          to={`/bransjer/${v.slug}`}
                          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary mt-4 group-hover:gap-2.5 transition-all duration-200"
                        >
                          Les mer <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── 6. Testimonials (dark) ──────────────────────────────────────────── */}
      <section className="py-24 bg-[#0c1123]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <Reveal className="text-center mb-12">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-400 mb-3">KUNDENE SIER</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-3">Servicebedrifter elsker FieldService</h2>
            <p className="text-slate-400">Over hele Norge bruker servicebedrifter FieldService daglig.</p>
          </Reveal>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t, i) => (
              <Reveal key={t.name} delay={i * 100}>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-7 flex flex-col h-full">
                  <div className="flex gap-0.5 mb-5">
                    {[0,1,2,3,4].map((s) => <Star key={s} className="w-4 h-4 text-amber-400 fill-amber-400" />)}
                  </div>
                  <p className="text-slate-300 leading-relaxed mb-6 flex-1">"{t.quote}"</p>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                      style={{ backgroundColor: t.color }}
                    >
                      {t.initials}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{t.name}</p>
                      <p className="text-xs text-slate-500">{t.company}</p>
                    </div>
                    <span
                      className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: t.color + "28", color: t.color }}
                    >
                      {t.vertical}
                    </span>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── 7. Pricing CTA ──────────────────────────────────────────────────── */}
      <section className="py-24 bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <Reveal className="text-center mb-10">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-3">PRISING</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3">Enkel og transparent prising</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">Start gratis. Velg en plan som passer bedriftens størrelse. Ingen skjulte kostnader.</p>
          </Reveal>
          <Reveal delay={80} className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
            {[
              { name: "Starter",    price: "Fra 499 kr",  desc: "For enkeltpersonforetak og små team" },
              { name: "Vekst",      price: "Fra 999 kr",  desc: "For voksende servicebedrifter", featured: true },
              { name: "Enterprise", price: "Kontakt oss", desc: "For store organisasjoner" },
            ].map((p) => (
              <div
                key={p.name}
                className={cn(
                  "rounded-xl border p-6 text-left transition-all duration-200 hover:shadow-md",
                  p.featured
                    ? "border-primary bg-primary/5 shadow-sm shadow-primary/10"
                    : "border-border bg-background hover:border-primary/30"
                )}
              >
                {p.featured && <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Populær</span>}
                <p className={cn("font-bold", p.featured ? "mt-1" : "mt-4")}>{p.name}</p>
                <p className="text-2xl font-extrabold mt-1 mb-1">{p.price}</p>
                <p className="text-xs text-muted-foreground">{p.desc}</p>
              </div>
            ))}
          </Reveal>
          <Reveal delay={160} className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              size="lg"
              asChild
              className="gap-2 h-12 px-8 text-base font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
            >
              <Link to="/register">Start gratis prøveperiode <ArrowRight className="w-4 h-4" /></Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              asChild
              className="h-12 px-8 text-base hover:border-primary/50 hover:bg-primary/5 transition-all duration-200"
            >
              <Link to="/priser">Se alle priser og moduler</Link>
            </Button>
          </Reveal>
        </div>
      </section>
    </PublicLayout>
  );
}
