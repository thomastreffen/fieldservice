import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import PublicLayout from "@/layouts/PublicLayout";
import {
  Clock, TrendingUp, ArrowRight, CheckCircle2,
  Briefcase, Users, Calendar, FileText, BarChart3,
  BadgePercent, ReceiptText, Wrench, ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

const HOURLY_RATE = 450; // NOK per admin time hour

/* ── Spar tid ── */
const TIME_SAVINGS = [
  {
    icon: Briefcase,
    module: "Jobbstyring",
    desc: "Planlegg, tildel og lukk jobber digitalt. Ingen manuell ringering, ingen papirskjemaer.",
    hours: 3,
    unit: "timer/uke per tekniker",
    color: "text-blue-600",
    bg: "bg-blue-50 dark:bg-blue-950/30",
  },
  {
    icon: Calendar,
    module: "Ressursplanlegger",
    desc: "Visuell ukeplan med dra-og-slipp. Driftslederen slipper å koordinere per telefon.",
    hours: 4,
    unit: "timer/uke for leder",
    color: "text-violet-600",
    bg: "bg-violet-50 dark:bg-violet-950/30",
  },
  {
    icon: FileText,
    module: "Digitale skjemaer",
    desc: "Teknikeren fyller ut sjekklister og servicerapporter direkte i appen — ferdig ved jobb-avslutning.",
    hours: 2,
    unit: "timer/uke per tekniker",
    color: "text-emerald-600",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
  },
  {
    icon: ReceiptText,
    module: "Automatisk rapportering",
    desc: "Jobbdata samles automatisk — ingen manuell oppsummering til fakturering eller ledelse.",
    hours: 2,
    unit: "timer/uke for kontor",
    color: "text-amber-600",
    bg: "bg-amber-50 dark:bg-amber-950/30",
  },
];

/* ── Øk mersalg ── */
const REVENUE_POINTS = [
  {
    icon: BarChart3,
    title: "Pipeline-oversikt",
    desc: "Se alle leads og salgsmuligheter i et Kanban-board. Følg opp der det monner.",
  },
  {
    icon: BadgePercent,
    title: "Serviceavtaler som selger",
    desc: "Systemet varsler deg om avtaler som nærmer seg forfall. Perfekt tidspunkt for mersalg og forlengelse.",
  },
  {
    icon: Wrench,
    title: "Anleggshistorikk",
    desc: "Full historikk på hvert anlegg gjør det enkelt å foreslå oppgradering eller ny service til riktig tid.",
  },
  {
    icon: Users,
    title: "Kundeoppfølging",
    desc: "CRM med kontaktpersoner, aktivitetslogg og oppfølgingspåminnelser — ingen lead går tapt.",
  },
];

/* ── Reduser kostnader ── */
const COST_POINTS = [
  { text: "Eliminér papirskjemaer og manuell overføring av data til systemene" },
  { text: "Reduser feilregistreringer med digitale sjekklister og validerte skjemaer" },
  { text: "Unngå dobbeltarbeid — ett system for felt, kontor og ledelse" },
  { text: "Bedre ressursutnyttelse: teknikere på veien, ikke på kontoret" },
  { text: "Raskere fakturering — jobbdata er klart med én gang jobben er lukket" },
  { text: "Færre misforståelser og reklamasjoner gjennom fullstendig dokumentasjon" },
];

/* ── ROI Calculator ── */
function RoiCalculator() {
  const [techCount, setTechCount] = useState(5);
  const [adminHours, setAdminHours] = useState(5);

  const results = useMemo(() => {
    const totalAdminHoursPerWeek = techCount * adminHours;
    const weeklySavingsHours = totalAdminHoursPerWeek * 0.65;
    const annualHoursSaved = weeklySavingsHours * 52;
    const annualSavingsNOK = Math.round(annualHoursSaved * HOURLY_RATE);
    // Rough plan cost: 799/mnd base + 199/seat above 1
    const monthlyPlanCost = 799 + Math.max(0, techCount - 1) * 199;
    const annualPlanCost = monthlyPlanCost * 12;
    const netRoi = annualSavingsNOK - annualPlanCost;
    const roiFactor = annualPlanCost > 0 ? (annualSavingsNOK / annualPlanCost).toFixed(1) : "—";
    const paybackMonths = annualSavingsNOK > 0
      ? Math.max(1, Math.round(annualPlanCost / (annualSavingsNOK / 12)))
      : "—";
    return { weeklySavingsHours: Math.round(weeklySavingsHours), annualHoursSaved: Math.round(annualHoursSaved), annualSavingsNOK, annualPlanCost, netRoi, roiFactor, paybackMonths };
  }, [techCount, adminHours]);

  function fmt(n: number) {
    return n.toLocaleString("nb-NO");
  }

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
      <div className="bg-primary/5 border-b border-border px-6 py-5">
        <h3 className="text-xl font-bold">ROI-kalkulator</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Juster tallene for din bedrift og se estimert besparelse per år.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-border">
        {/* Inputs */}
        <div className="p-6 space-y-8">
          {/* Antall teknikere */}
          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <label className="text-sm font-semibold">Antall teknikere</label>
              <span className="text-2xl font-extrabold text-primary tabular-nums">{techCount}</span>
            </div>
            <input
              type="range"
              min={1}
              max={30}
              value={techCount}
              onChange={(e) => setTechCount(Number(e.target.value))}
              className="w-full h-2 rounded-full accent-primary cursor-pointer"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1</span><span>15</span><span>30</span>
            </div>
          </div>

          {/* Admin timer per uke */}
          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <label className="text-sm font-semibold">Admin-timer per tekniker per uke</label>
              <span className="text-2xl font-extrabold text-primary tabular-nums">{adminHours}t</span>
            </div>
            <input
              type="range"
              min={1}
              max={20}
              value={adminHours}
              onChange={(e) => setAdminHours(Number(e.target.value))}
              className="w-full h-2 rounded-full accent-primary cursor-pointer"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1t</span><span>10t</span><span>20t</span>
            </div>
          </div>

          <div className="rounded-lg bg-muted/50 border border-border p-4 text-xs text-muted-foreground space-y-1">
            <p>Beregningen bruker en estimert tidsreduksjon på <strong>65 %</strong> av admin-arbeid.</p>
            <p>Timepris for admin-arbeid er satt til <strong>{fmt(HOURLY_RATE)} kr/t</strong> (norsk gjennomsnitt).</p>
          </div>
        </div>

        {/* Results */}
        <div className="p-6 space-y-4 bg-muted/20">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Estimert besparelse</p>

          {/* Big number */}
          <div className="rounded-xl bg-primary/10 border border-primary/20 p-5 text-center">
            <p className="text-xs text-muted-foreground mb-1">Estimert besparelse per år</p>
            <p className="text-4xl font-extrabold text-primary tabular-nums">
              {fmt(results.annualSavingsNOK)} kr
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              ({results.weeklySavingsHours} timer spart per uke)
            </p>
          </div>

          {/* Detail rows */}
          <div className="space-y-2">
            {[
              { label: "Timer spart per uke", value: `${results.weeklySavingsHours} t` },
              { label: "Timer spart per år", value: `${fmt(results.annualHoursSaved)} t` },
              { label: "Estimert plan-kostnad per år", value: `${fmt(results.annualPlanCost)} kr` },
              { label: "Netto ROI per år", value: `${results.netRoi >= 0 ? "+" : ""}${fmt(results.netRoi)} kr`, highlight: results.netRoi > 0 },
              { label: "ROI-faktor", value: `${results.roiFactor}× investeringen` },
              { label: "Tilbakebetalingstid", value: `${results.paybackMonths} mnd` },
            ].map((row) => (
              <div key={row.label} className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">{row.label}</span>
                <span className={cn("font-semibold tabular-nums", row.highlight && "text-emerald-600 dark:text-emerald-400")}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>

          <Button asChild className="w-full gap-2 mt-2">
            <Link to="/register">Start gratis prøveperiode <ArrowRight className="w-4 h-4" /></Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function VerdiskapingPage() {
  return (
    <PublicLayout>
      {/* ── Hero ── */}
      <section className="bg-gradient-to-b from-muted/40 to-background pt-16 pb-14 text-center">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-5">
            <BarChart3 className="w-3.5 h-3.5" /> Konkrete resultater for servicebedrifter
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.1] mb-5">
            Mer tid. Mer inntekt.<br className="hidden sm:block" /> Lavere kostnader.
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto mb-8">
            FieldService er ikke bare et system — det er en investering som betaler seg raskt. Se hva norske servicebedrifter oppnår.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" asChild className="gap-2 h-12 px-7 text-base">
              <Link to="/register">Start gratis prøveperiode <ArrowRight className="w-4 h-4" /></Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="h-12 px-7 text-base">
              <a href="#kalkulator">Beregn din ROI</a>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Big stats ── */}
      <section className="py-12 bg-background border-y border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
          {[
            { value: "65 %", label: "Mindre tid på administrasjon", color: "text-blue-600" },
            { value: "3× ", label: "Raskere fakturering etter jobb", color: "text-emerald-600" },
            { value: "20 %", label: "Økning i serviceavtale-salg", color: "text-violet-600" },
          ].map((s) => (
            <div key={s.label} className="space-y-1">
              <p className={cn("text-5xl font-extrabold tabular-nums", s.color)}>{s.value}</p>
              <p className="text-sm text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Spar tid ── */}
      <section className="py-20 bg-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-3xl font-bold">Spar tid</h2>
          </div>
          <p className="text-muted-foreground mb-10 max-w-xl">
            Hver modul kutter konkret admin-tid. Her er estimatene basert på erfaringer fra norske servicebedrifter.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {TIME_SAVINGS.map((item) => (
              <div key={item.module} className={cn("rounded-xl border border-border p-6 flex gap-5 items-start", item.bg)}>
                <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center shrink-0">
                  <item.icon className={cn("w-5 h-5", item.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold">{item.module}</h3>
                    <div className="text-right shrink-0">
                      <span className={cn("text-2xl font-extrabold tabular-nums", item.color)}>{item.hours}</span>
                      <p className="text-[10px] text-muted-foreground whitespace-nowrap">{item.unit}</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Øk mersalg ── */}
      <section className="py-20 bg-muted/30 border-y border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <h2 className="text-3xl font-bold">Øk mersalg</h2>
          </div>
          <p className="text-muted-foreground mb-10 max-w-xl">
            CRM og serviceavtaler i FieldService er bygget for å hjelpe deg selge mer til eksisterende kunder.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {REVENUE_POINTS.map((item) => (
              <div key={item.title} className="bg-background rounded-xl border border-border p-6 flex gap-4 items-start hover:border-emerald-300/60 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center shrink-0">
                  <item.icon className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1.5">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
          {/* Revenue highlight box */}
          <div className="mt-8 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 p-7 grid sm:grid-cols-2 gap-6 items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 mb-2">Eksempel</p>
              <h3 className="text-xl font-bold mb-2">Serviceavtaler betaler seg selv</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                En bedrift med 50 serviceavtaler til 2 000 kr/år = 100 000 kr garantert inntekt. Med varslinger om forfall øker fornyelsespraten fra 60 % til over 85 %.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Uten FieldService", value: "60 000 kr", sub: "60 % fornyelse" },
                { label: "Med FieldService", value: "85 000 kr", sub: "85 % fornyelse", highlight: true },
              ].map((box) => (
                <div key={box.label} className={cn(
                  "rounded-xl p-4 text-center border",
                  box.highlight
                    ? "bg-emerald-100 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700"
                    : "bg-background border-border"
                )}>
                  <p className="text-xs text-muted-foreground mb-1">{box.label}</p>
                  <p className={cn("text-xl font-extrabold", box.highlight && "text-emerald-700 dark:text-emerald-400")}>{box.value}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{box.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Reduser kostnader ── */}
      <section className="py-20 bg-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-orange-600" />
                </div>
                <h2 className="text-3xl font-bold">Reduser kostnader</h2>
              </div>
              <p className="text-muted-foreground mb-8 leading-relaxed">
                Feil og ineffektivitet i servicebransjen er kostbart. FieldService eliminerer de vanligste kildene til sløsing.
              </p>
              <ul className="space-y-3">
                {COST_POINTS.map((p, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <span className="text-sm leading-relaxed">{p.text}</span>
                  </li>
                ))}
              </ul>
            </div>
            {/* Cost comparison visual */}
            <div className="space-y-4">
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Kostnad per feil — gjennomsnitt</p>
              {[
                { label: "Feil dato på jobben (re-kjøring)", cost: "1 400 kr", bar: 70 },
                { label: "Manglende servicerapport (reklamasjon)", cost: "3 200 kr", bar: 100 },
                { label: "Dobbeltbooking av tekniker", cost: "900 kr", bar: 45 },
                { label: "Faktura sendt 2+ uker etter jobb", cost: "820 kr", bar: 40 },
              ].map((row) => (
                <div key={row.label} className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className="font-semibold text-destructive">{row.cost}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-destructive/50 rounded-full transition-all"
                      style={{ width: `${row.bar}%` }}
                    />
                  </div>
                </div>
              ))}
              <p className="text-xs text-muted-foreground pt-2">
                Kilde: bransjestudier fra norsk servicebransje. Tall er estimerte gjennomsnitt.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── ROI Calculator ── */}
      <section id="kalkulator" className="py-20 bg-muted/30 border-y border-border scroll-mt-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold tracking-tight mb-3">Beregn din besparelse</h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Legg inn tallene for din bedrift og se hva FieldService er verdt for deg.
            </p>
          </div>
          <RoiCalculator />
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-16 bg-background">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl font-bold mb-3">Klar til å effektivisere?</h2>
          <p className="text-muted-foreground mb-6">
            Start en gratis 14-dagers prøveperiode og se resultatene selv — ingen kredittkort kreves.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" asChild className="gap-2 h-12 px-7">
              <Link to="/register">Start gratis prøveperiode <ArrowRight className="w-4 h-4" /></Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="h-12 px-7">
              <Link to="/kontakt">Snakk med oss</Link>
            </Button>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
