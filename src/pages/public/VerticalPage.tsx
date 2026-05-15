import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import PublicLayout from "@/layouts/PublicLayout";
import {
  ArrowRight, Zap, Thermometer, Droplets, Layers,
  CheckCircle2, Briefcase, Users, Calendar, Shield, FileText, ShieldAlert,
} from "lucide-react";
import { LucideIcon } from "lucide-react";

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
  hms: "Dokumenter og følg opp HMS-rutiner og avvik.",
  warranties: "Administrer garantisaker og reklamasjoner effektivt.",
  service_agreements: "Hold styr på serviceavtaler med automatiske fornyelsesvarslinger.",
  el_certificates: "Utsted og arkiver elsertifikater direkte i systemet.",
};

type Vertical = {
  id: string; slug: string; display_name: string;
  description: string | null; icon: string | null; color: string | null;
  default_modules: string[] | null;
};

export default function VerticalPage() {
  const { slug } = useParams<{ slug: string }>();

  const { data: vertical, isLoading, isError } = useQuery<Vertical | null>({
    queryKey: ["public_vertical", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("verticals")
        .select("id, slug, display_name, description, icon, color, default_modules")
        .eq("slug", slug)
        .eq("is_active", true)
        .single();
      if (error) return null;
      return data as Vertical;
    },
  });

  const { data: modules } = useQuery({
    queryKey: ["public_vertical_modules", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("platform_modules")
        .select("slug, name, description, is_core")
        .contains("compatible_verticals", [slug]);
      if (error) throw error;
      return data as { slug: string; name: string; description: string | null; is_core: boolean }[];
    },
  });

  const Icon = (vertical?.icon && VERTICAL_ICONS[vertical.icon]) || Layers;

  if (isLoading) {
    return (
      <PublicLayout>
        <div className="flex justify-center py-32">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </PublicLayout>
    );
  }

  if (isError || !vertical) {
    return (
      <PublicLayout>
        <div className="max-w-2xl mx-auto px-4 py-32 text-center">
          <h1 className="text-2xl font-bold mb-3">Bransje ikke funnet</h1>
          <p className="text-muted-foreground mb-6">Vi fant ingen aktiv bransje med den adressen.</p>
          <Button asChild variant="outline"><Link to="/">Tilbake til forsiden</Link></Button>
        </div>
      </PublicLayout>
    );
  }

  const coreModules = modules?.filter((m) => m.is_core) ?? [];
  const extraModules = modules?.filter((m) => !m.is_core) ?? [];

  return (
    <PublicLayout>
      {/* Hero */}
      <section
        className="pt-16 pb-20 text-center relative overflow-hidden"
        style={{ background: vertical.color ? `linear-gradient(to bottom, ${vertical.color}12, transparent)` : undefined }}
      >
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
            style={{ backgroundColor: vertical.color ? vertical.color + "20" : undefined }}
          >
            <Icon className="w-8 h-8" style={{ color: vertical.color ?? undefined }} />
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">{vertical.display_name}</h1>
          {vertical.description && (
            <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8 leading-relaxed">
              {vertical.description}
            </p>
          )}
          <Button size="lg" asChild className="gap-2 h-12 px-8 text-base">
            <Link to="/register">Start gratis prøveperiode <ArrowRight className="w-4 h-4" /></Link>
          </Button>
        </div>
      </section>

      {/* Core modules */}
      {coreModules.length > 0 && (
        <section className="py-16 bg-background">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <h2 className="text-2xl font-bold text-center mb-10">Inkluderte moduler</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {coreModules.map((m) => {
                const ModIcon = MODULE_ICONS[m.slug] ?? CheckCircle2;
                return (
                  <div key={m.slug} className="flex gap-4 p-5 rounded-xl border border-border bg-card">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                      style={{ backgroundColor: vertical.color ? vertical.color + "15" : undefined }}
                    >
                      <ModIcon className="w-5 h-5" style={{ color: vertical.color ?? undefined }} />
                    </div>
                    <div>
                      <p className="font-semibold text-sm mb-1">{MODULE_LABELS[m.slug] ?? m.name}</p>
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

      {/* Add-on modules */}
      {extraModules.length > 0 && (
        <section className="py-12 bg-muted/30 border-t border-border">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <h2 className="text-xl font-bold text-center mb-8">Tilleggsmoduler</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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

      {/* CTA */}
      <section className="py-20 bg-background">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight mb-4">
            Klar til å prøve?
          </h2>
          <p className="text-muted-foreground mb-8">
            Start gratis i dag. Ingen kredittkort, ingen binding.
          </p>
          <Button size="lg" asChild className="gap-2 h-12 px-8 text-base">
            <Link to="/register">Kom i gang gratis <ArrowRight className="w-4 h-4" /></Link>
          </Button>
        </div>
      </section>
    </PublicLayout>
  );
}
