import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import PublicLayout from "@/layouts/PublicLayout";
import {
  ArrowRight, Zap, Users, Calendar, Shield, Briefcase, Clock, CheckCircle2,
  Thermometer, Droplets, Layers,
} from "lucide-react";
import { LucideIcon } from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  zap: Zap, users: Users, calendar: Calendar, shield: Shield,
  briefcase: Briefcase, clock: Clock, thermometer: Thermometer,
  droplets: Droplets, layers: Layers, checkCircle2: CheckCircle2,
};
const VERTICAL_ICONS: Record<string, LucideIcon> = {
  zap: Zap, thermometer: Thermometer, droplets: Droplets,
};

type CmsSettings = Record<string, string>;
type Feature = { icon: string; title: string; description: string };
type Vertical = {
  id: string; slug: string; display_name: string;
  description: string | null; icon: string | null; color: string | null;
};

function useCms() {
  return useQuery<CmsSettings>({
    queryKey: ["cms_settings"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("platform_settings")
        .select("key, value")
        .like("key", "cms.%");
      if (error) throw error;
      return Object.fromEntries((data as { key: string; value: string }[]).map((r) => [r.key, r.value]));
    },
  });
}

export default function LandingPage() {
  const { data: cms } = useCms();

  const headline = cms?.["cms.hero.headline"] ?? "Alt du trenger for feltservice – på ett sted";
  const subheadline = cms?.["cms.hero.subheadline"] ?? "Start gratis prøveperiode i dag.";
  const ctaText = cms?.["cms.hero.cta_text"] ?? "Start gratis prøveperiode";

  let features: Feature[] = [];
  try { features = JSON.parse(cms?.["cms.features"] ?? "[]"); } catch {}

  const { data: verticals } = useQuery<Vertical[]>({
    queryKey: ["public_verticals"],
    staleTime: 300_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("verticals")
        .select("id, slug, display_name, description, icon, color")
        .eq("is_active", true)
        .order("slug");
      if (error) throw error;
      return data as Vertical[];
    },
  });

  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-muted/40 to-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-20 pb-24 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium mb-6">
            <Clock className="w-3.5 h-3.5" /> 14 dager gratis — ingen kredittkort
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight mb-6">
            {headline}
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            {subheadline}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" asChild className="gap-2 text-base h-12 px-8">
              <Link to="/register">{ctaText} <ArrowRight className="w-4 h-4" /></Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="h-12 px-8 text-base">
              <Link to="/priser">Se priser</Link>
            </Button>
          </div>
        </div>
        {/* Decorative gradient blobs */}
        <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl" />
      </section>

      {/* Features */}
      {features.length > 0 && (
        <section className="py-20 bg-background">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight mb-3">Bygget for servicehverdagen</h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Alt du trenger fra én plattform — ingen integrasjoner mellom fem ulike verktøy.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((f, i) => {
                const Icon = ICONS[f.icon] ?? CheckCircle2;
                return (
                  <div key={i} className="p-6 rounded-xl border border-border bg-card hover:border-primary/30 transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="font-semibold text-sm mb-2">{f.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Verticals */}
      {(verticals?.length ?? 0) > 0 && (
        <section className="py-20 bg-muted/30">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight mb-3">Tilpasset din bransje</h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Systemet konfigurerer seg automatisk for din bransje med relevante moduler og arbeidsflyt.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {verticals?.map((v) => {
                const Icon = (v.icon && VERTICAL_ICONS[v.icon]) || Layers;
                return (
                  <div
                    key={v.id}
                    className="p-6 rounded-xl border-2 border-border bg-card hover:border-primary/20 transition-all group"
                    style={{ borderColor: undefined }}
                  >
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                      style={{ backgroundColor: v.color ? v.color + "20" : undefined }}
                    >
                      <Icon className="w-6 h-6" style={{ color: v.color ?? undefined }} />
                    </div>
                    <h3 className="font-bold text-base mb-2">{v.display_name}</h3>
                    {v.description && (
                      <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                        {v.description}
                      </p>
                    )}
                    <Link
                      to={`/bransjer/${v.slug}`}
                      className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:gap-2 transition-all"
                    >
                      Les mer <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Social proof placeholder */}
      <section className="py-16 bg-background border-y border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-8">
            Brukt av servicebedrifter over hele Norge
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 opacity-40">
            {["Bedrift AS", "Service Gruppen", "Teknikk Pro", "NordService", "VVS Konsern"].map((name) => (
              <span key={name} className="text-lg font-bold text-muted-foreground">{name}</span>
            ))}
          </div>
          <blockquote className="mt-12 max-w-2xl mx-auto">
            <p className="text-lg text-muted-foreground italic leading-relaxed">
              "FieldService har gjort hverdagen vår betydelig enklere. Vi sparer timer hver uke på administrasjon."
            </p>
            <footer className="mt-3 text-sm font-medium">— Ola Nordmann, Daglig leder</footer>
          </blockquote>
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="py-20 bg-background">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight mb-3">Enkle og transparente priser</h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Ingen skjulte kostnader. Start gratis og oppgrader når du er klar.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" asChild className="gap-2 h-12 px-8 text-base">
              <Link to="/register">Start gratis <ArrowRight className="w-4 h-4" /></Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="h-12 px-8 text-base">
              <Link to="/priser">Se alle priser</Link>
            </Button>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
