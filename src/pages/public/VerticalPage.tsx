import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import PublicLayout from "@/layouts/PublicLayout";
import {
  ArrowRight, Zap, Thermometer, Droplets, Layers,
  CheckCircle2, Briefcase, Users, Calendar, Shield, FileText, ShieldAlert,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const VERTICAL_ICONS: Record<string, LucideIcon> = {
  zap: Zap, thermometer: Thermometer, droplets: Droplets,
};
const MODULE_ICONS: Record<string, LucideIcon> = {
  crm: Users, jobs: Briefcase, assets: Layers, ressursplanlegger: Calendar,
  postkontoret: FileText, hms: Shield, warranties: ShieldAlert,
  service_agreements: FileText, el_certificates: Zap,
};
const MODULE_LABELS: Record<string, string> = {
  crm: "CRM og kunder", jobs: "Jobbstyring", assets: "Anleggsregister",
  ressursplanlegger: "Ressursplanlegger", postkontoret: "Postkontoret",
  hms: "HMS", warranties: "Garantisaker",
  service_agreements: "Serviceavtaler", el_certificates: "El-sertifikater",
};
const MODULE_DESCRIPTIONS: Record<string, string> = {
  crm: "Hold orden på kunder, kontakter og anlegg. Komplett historikk og søk.",
  jobs: "Opprett, planlegg og følg opp alle jobber fra ett sted.",
  assets: "Registrer og spor alle anlegg og utstyr hos kundene dine.",
  ressursplanlegger: "Visuell planlegging av tekniker-kapasitet med dra-og-slipp.",
  postkontoret: "Kommuniser med kunder og team via innebygd meldingssystem.",
  hms: "Dokumenter og følg opp HMS-rutiner og avvik direkte i felten.",
  warranties: "Administrer garantisaker og reklamasjoner effektivt.",
  service_agreements: "Hold styr på serviceavtaler med automatiske fornyelsesvarslinger.",
  el_certificates: "Utsted og arkiver elsertifikater direkte i systemet.",
};

const VERTICAL_HIGHLIGHTS: Record<string, { title: string; items: string[] }[]> = {
  varmepumpe: [
    { title: "Installasjoner og service", items: ["Registrer alle anlegg med full teknisk info", "Planlegg service og filterskift automatisk", "Utfør garantiarbeid med sporbar historikk"] },
    { title: "Økonomi og vekst", items: ["Serviceavtaler med automatisk fornyelse", "Tilbud og faktura fra ett sted", "Selg mer til eksisterende kunder"] },
  ],
  vvs: [
    { title: "Prosjekt og drift", items: ["Håndter store og små prosjekter fra samme system", "Ressursplanlegger for rørleggere i felten", "Materiell og tidregistrering per jobb"] },
    { title: "Kunder og avtaler", items: ["Komplett kunderegister med anleggshistorikk", "Serviceavtaler med automatiske varsler", "Digital dokumentasjon og HMS"] },
  ],
  elektro: [
    { title: "Samsvar og sertifikater", items: ["Utsted elsertifikater direkte i systemet", "Sporbar dokumentasjon for kontroll", "Avvikshåndtering og HMS-rapportering"] },
    { title: "Planlegging og team", items: ["Ressursplanlegger for elektrikere", "Oppdragsstyring i sanntid", "Mobilapp for teknikere i felten"] },
  ],
};

const TESTIMONIALS: Record<string, { initials: string; name: string; company: string; quote: string }> = {
  varmepumpe: { initials: "AM", name: "Astrid Moen", company: "Norsk Varmepumpe AS", quote: "Ressursplanleggeren alene er verdt prisen. Vi slipper å ringe rundt for å finne ledig tekniker." },
  vvs: { initials: "OL", name: "Ole Larsen", company: "Larsen VVS AS", quote: "FieldService har fullstendig forandret hvordan vi jobber. Alle jobber, kunder og avtaler på ett sted — endelig." },
  elektro: { initials: "KH", name: "Knut Hansen", company: "Hansen Elektro", quote: "Enkelt å komme i gang, og support er lynrask. Anbefales sterkt til alle servicebedrifter." },
};

type Vertical = {
  id: string; slug: string; display_name: string;
  description: string | null; icon: string | null; color: string | null;
};
type Module = { slug: string; name: string; description: string | null; is_core: boolean };

export default function VerticalPage() {
  const { slug } = useParams<{ slug: string }>();

  const { data: vertical, isLoading } = useQuery<Vertical | null>({
    queryKey: ["public_vertical", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("verticals")
        .select("id, slug, display_name, description, icon, color")
        .eq("slug", slug)
        .eq("is_active", true)
        .single();
      return data as Vertical ?? null;
    },
  });

  const { data: modules } = useQuery<Module[]>({
    queryKey: ["public_vertical_modules", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("platform_modules")
        .select("slug, name, description, is_core")
        .contains("compatible_verticals", [slug]);
      return (data ?? []) as Module[];
    },
  });

  const Icon = (vertical?.icon && VERTICAL_ICONS[vertical.icon]) || Layers;
  const coreModules = modules?.filter((m) => m.is_core) ?? [];
  const extraModules = modules?.filter((m) => !m.is_core) ?? [];
  const highlights = slug ? (VERTICAL_HIGHLIGHTS[slug] ?? []) : [];
  const testimonial = slug ? TESTIMONIALS[slug] : null;

  if (isLoading) {
    return (
      <PublicLayout>
        <div className="flex justify-center py-32">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </PublicLayout>
    );
  }

  if (!vertical) {
    return (
      <PublicLayout>
        <div className="max-w-2xl mx-auto px-4 py-32 text-center">
          <h1 className="text-2xl font-bold mb-3">Bransje ikke funnet</h1>
          <p className="text-muted-foreground mb-6">Vi fant ingen aktiv bransje med den adressen.</p>
          <Button asChild variant="outline"><Link to="/bransjer">Se alle bransjer</Link></Button>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      {/* Hero with brand color gradient */}
      <section
        className="pt-16 pb-20 relative overflow-hidden"
        style={{ background: vertical.color ? `linear-gradient(135deg, ${vertical.color}25 0%, ${vertical.color}08 50%, transparent 100%)` : undefined }}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg"
            style={{ backgroundColor: vertical.color ? vertical.color + "25" : undefined }}
          >
            <Icon className="w-10 h-10" style={{ color: vertical.color ?? undefined }} />
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">
            FieldService for {vertical.display_name.toLowerCase()}
          </h1>
          {vertical.description && (
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
              {vertical.description}
            </p>
          )}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" asChild className="gap-2 h-12 px-8 text-base">
              <Link to="/register">Start gratis demo <ArrowRight className="w-4 h-4" /></Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="h-12 px-8 text-base">
              <Link to="/kontakt">Ta kontakt</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Core modules — "Hva er inkludert" */}
      {coreModules.length > 0 && (
        <section className="py-16 bg-background">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <h2 className="text-2xl font-bold text-center mb-2">Hva er inkludert</h2>
            <p className="text-center text-muted-foreground mb-10">Disse modulene er inkludert i alle planer for {vertical.display_name.toLowerCase()}.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {coreModules.map((m) => {
                const ModIcon = MODULE_ICONS[m.slug] ?? CheckCircle2;
                return (
                  <div key={m.slug} className="flex gap-4 p-5 rounded-xl border border-border bg-card hover:border-primary/20 transition-colors">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: vertical.color ? vertical.color + "15" : undefined }}
                    >
                      <ModIcon className="w-5 h-5" style={{ color: vertical.color ?? undefined }} />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <p className="font-semibold text-sm">{MODULE_LABELS[m.slug] ?? m.name}</p>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {MODULE_DESCRIPTIONS[m.slug] ?? m.description ?? ""}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Feature highlights */}
      {highlights.length > 0 && (
        <section className="py-16 bg-muted/30 border-y border-border">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <h2 className="text-2xl font-bold text-center mb-10">Spesielt tilpasset {vertical.display_name.toLowerCase()}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              {highlights.map((h) => (
                <div key={h.title}>
                  <h3 className="font-bold mb-4">{h.title}</h3>
                  <ul className="space-y-3">
                    {h.items.map((item) => (
                      <li key={item} className="flex items-start gap-3">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span className="text-sm text-muted-foreground">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Add-on modules */}
      {extraModules.length > 0 && (
        <section className="py-12 bg-background border-b border-border">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <h2 className="text-xl font-bold text-center mb-2">Tilleggsmoduler</h2>
            <p className="text-center text-sm text-muted-foreground mb-8">Utvid systemet med moduler etter behov.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {extraModules.map((m) => {
                const ModIcon = MODULE_ICONS[m.slug] ?? CheckCircle2;
                return (
                  <div key={m.slug} className="flex items-center gap-3 p-4 rounded-lg border border-border bg-card">
                    <ModIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                    <p className="text-sm font-medium">{MODULE_LABELS[m.slug] ?? m.name}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Testimonial */}
      {testimonial && (
        <section className="py-16 bg-muted/30 border-b border-border">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
            <blockquote>
              <p className="text-lg text-muted-foreground italic leading-relaxed mb-5">"{testimonial.quote}"</p>
              <footer className="flex items-center justify-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
                  style={{ backgroundColor: vertical.color ?? "#6366f1" }}
                >
                  {testimonial.initials}
                </div>
                <div className="text-left">
                  <p className="font-semibold text-sm">{testimonial.name}</p>
                  <p className="text-xs text-muted-foreground">{testimonial.company}</p>
                </div>
              </footer>
            </blockquote>
          </div>
        </section>
      )}
    </PublicLayout>
  );
}
