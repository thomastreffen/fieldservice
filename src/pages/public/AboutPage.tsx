import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import PublicLayout from "@/layouts/PublicLayout";
import { ArrowRight, Heart, Shield, Zap } from "lucide-react";

export default function AboutPage() {
  const { data: cms } = useQuery<Record<string, string>>({
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

  const omOss = cms?.["cms.om_oss"] ?? "FieldService er bygget av fagfolk med lang erfaring fra servicebransjen.";

  return (
    <PublicLayout>
      <section className="bg-gradient-to-b from-muted/40 to-background pt-16 pb-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight mb-4">Om FieldService</h1>
          <p className="text-lg text-muted-foreground leading-relaxed">{omOss}</p>
        </div>
      </section>

      <section className="py-16 bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 grid grid-cols-1 sm:grid-cols-3 gap-8">
          {[
            { icon: Heart, title: "Bygget med omsorg", description: "Vi bryr oss om brukeropplevelsen og jobber kontinuerlig med å gjøre systemet bedre." },
            { icon: Shield, title: "Trygg og pålitelig", description: "Data lagres sikkert i Europa med daglig backup og høy oppetid." },
            { icon: Zap, title: "Alltid i utvikling", description: "Nye funksjoner og forbedringer lanseres regelmessig basert på tilbakemeldinger fra brukere." },
          ].map(({ icon: Icon, title, description }) => (
            <div key={title} className="text-center">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-bold mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="py-16 bg-muted/30 border-t border-border text-center">
        <div className="max-w-xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl font-bold mb-3">Vil du vite mer?</h2>
          <p className="text-muted-foreground mb-6">Ta kontakt med oss, eller start en gratis prøveperiode med én gang.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild className="gap-2">
              <Link to="/register">Start gratis <ArrowRight className="w-4 h-4" /></Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/kontakt">Ta kontakt</Link>
            </Button>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
