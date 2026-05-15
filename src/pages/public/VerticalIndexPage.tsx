import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import PublicLayout from "@/layouts/PublicLayout";
import { SeoHead } from "@/components/SeoHead";
import { Zap, Thermometer, Droplets, Layers, ArrowRight } from "lucide-react";
import { LucideIcon } from "lucide-react";

const VERTICAL_ICONS: Record<string, LucideIcon> = {
  zap: Zap, thermometer: Thermometer, droplets: Droplets,
};

type Vertical = {
  id: string; slug: string; display_name: string;
  description: string | null; icon: string | null; color: string | null;
};

export default function VerticalIndexPage() {
  const { data: verticals, isLoading } = useQuery<Vertical[]>({
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
      <SeoHead
        title="Bransjer – FieldService"
        description="FieldService er tilpasset for varmepumpe, VVS og elektrobransjen. Velg din bransje og se hva systemet gjør for deg."
        canonicalPath="/bransjer"
      />
      <section className="bg-gradient-to-b from-muted/40 to-background pt-16 pb-12 text-center">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <h1 className="text-4xl font-extrabold tracking-tight mb-4">Velg din bransje</h1>
          <p className="text-lg text-muted-foreground">
            FieldService tilpasses automatisk for din bransje med riktige moduler og arbeidsflyt.
          </p>
        </div>
      </section>

      <section className="py-12 bg-background">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          {isLoading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {verticals?.map((v) => {
                const Icon = (v.icon && VERTICAL_ICONS[v.icon]) || Layers;
                return (
                  <Link
                    key={v.id}
                    to={`/bransjer/${v.slug}`}
                    className="block p-7 rounded-2xl border-2 border-border bg-card hover:border-primary/30 hover:shadow-md transition-all group"
                  >
                    <div
                      className="w-14 h-14 rounded-xl flex items-center justify-center mb-5"
                      style={{ backgroundColor: v.color ? v.color + "20" : undefined }}
                    >
                      <Icon className="w-7 h-7" style={{ color: v.color ?? undefined }} />
                    </div>
                    <h2 className="font-bold text-lg mb-2">{v.display_name}</h2>
                    {v.description && (
                      <p className="text-sm text-muted-foreground leading-relaxed mb-4">{v.description}</p>
                    )}
                    <span className="inline-flex items-center gap-1 text-sm font-medium text-primary group-hover:gap-2 transition-all">
                      Les mer <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </PublicLayout>
  );
}
