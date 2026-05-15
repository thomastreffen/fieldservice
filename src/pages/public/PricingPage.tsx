import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import PublicLayout from "@/layouts/PublicLayout";
import { SeoHead } from "@/components/SeoHead";
import { CheckCircle2, ArrowRight, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const MODULE_LABELS: Record<string, string> = {
  crm: "CRM og kunder",
  postkontoret: "Postkontoret",
  ressursplanlegger: "Ressursplanlegger",
  jobs: "Jobbstyring",
  assets: "Anleggsregister",
  hms: "HMS",
  warranties: "Garantisaker",
  service_agreements: "Serviceavtaler",
  el_certificates: "El-sertifikater",
};

type Plan = {
  id: string;
  name: string;
  description: string | null;
  price_monthly: number;
  price_yearly: number | null;
  trial_days: number;
  included_modules: string[] | null;
  addon_modules: string[] | null;
  max_users: number | null;
  price_config: any;
  sort_order: number;
};

function formatPrice(amount: number) {
  return Number(amount).toLocaleString("nb-NO");
}

function PriceDisplay({ plan }: { plan: Plan }) {
  const cfg = plan.price_config as any;
  const type = cfg?.type;

  if (type === "per_seat") {
    return (
      <div>
        <div className="flex items-end gap-1">
          <span className="text-4xl font-extrabold">{formatPrice(cfg.per_seat_price ?? plan.price_monthly)}</span>
          <span className="text-muted-foreground text-sm mb-1"> kr/bruker/mnd</span>
        </div>
        {cfg.base_price > 0 && (
          <p className="text-xs text-muted-foreground mt-1">+ {formatPrice(cfg.base_price)} kr grunnpris</p>
        )}
      </div>
    );
  }

  if (type === "tiered" && cfg?.tiers?.length) {
    const first = cfg.tiers[0];
    return (
      <div>
        <div className="flex items-end gap-1">
          <span className="text-4xl font-extrabold">Fra {formatPrice(first.price)}</span>
          <span className="text-muted-foreground text-sm mb-1"> kr/mnd</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">Pristrinn basert på bruk</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-end gap-1">
        <span className="text-4xl font-extrabold">
          {plan.price_monthly > 0 ? formatPrice(plan.price_monthly) : "Gratis"}
        </span>
        {plan.price_monthly > 0 && (
          <span className="text-muted-foreground text-sm mb-1"> kr/mnd</span>
        )}
      </div>
      {plan.price_yearly && plan.price_yearly > 0 && (
        <p className="text-xs text-muted-foreground mt-1">{formatPrice(plan.price_yearly)} kr/år (spar {Math.round((1 - plan.price_yearly / (plan.price_monthly * 12)) * 100)}%)</p>
      )}
    </div>
  );
}

export default function PricingPage() {
  const { data: plans, isLoading } = useQuery<Plan[]>({
    queryKey: ["public_plans"],
    staleTime: 120_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saas_plans")
        .select("id, name, description, price_monthly, price_yearly, trial_days, included_modules, addon_modules, max_users, price_config, sort_order")
        .eq("is_active", true)
        .eq("is_visible", true)
        .order("sort_order");
      if (error) throw error;
      return data as Plan[];
    },
  });

  const featured = plans?.[Math.floor((plans.length - 1) / 2)];

  return (
    <PublicLayout>
      <SeoHead
        title="Priser – FieldService"
        description="Enkle og transparente priser. Start gratis i 14 dager, ingen kredittkort."
        canonicalPath="/priser"
      />
      {/* Header */}
      <section className="bg-gradient-to-b from-muted/40 to-background pt-16 pb-12 text-center">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <h1 className="text-4xl font-extrabold tracking-tight mb-4">Enkle priser for alle størrelser</h1>
          <p className="text-lg text-muted-foreground">
            Start gratis. Ingen kredittkort. Oppgrader når du er klar.
          </p>
        </div>
      </section>

      {/* Plans */}
      <section className="py-12 bg-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          {isLoading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !plans?.length ? (
            <p className="text-center text-muted-foreground py-20">Ingen planer tilgjengelig for øyeblikket.</p>
          ) : (
            <div className={cn(
              "grid gap-6",
              plans.length === 1 ? "max-w-sm mx-auto" :
              plans.length === 2 ? "grid-cols-1 sm:grid-cols-2 max-w-3xl mx-auto" :
              "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
            )}>
              {plans.map((plan) => {
                const isFeatured = plan.id === featured?.id;
                const included = (plan.included_modules as string[] ?? []);
                const addon = (plan.addon_modules as string[] ?? []);
                return (
                  <div
                    key={plan.id}
                    className={cn(
                      "relative rounded-2xl border p-7 flex flex-col",
                      isFeatured
                        ? "border-primary shadow-lg shadow-primary/10 bg-primary/5"
                        : "border-border bg-card"
                    )}
                  >
                    {isFeatured && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="bg-primary text-primary-foreground text-[11px] font-semibold px-3 py-1 rounded-full">
                          Mest populær
                        </span>
                      </div>
                    )}

                    <div className="mb-5">
                      <h3 className="font-bold text-lg mb-1">{plan.name}</h3>
                      {plan.description && (
                        <p className="text-sm text-muted-foreground">{plan.description}</p>
                      )}
                    </div>

                    <div className="mb-6">
                      <PriceDisplay plan={plan} />
                      {plan.trial_days > 0 && (
                        <p className="text-xs text-primary font-medium mt-2">{plan.trial_days} dager gratis prøveperiode</p>
                      )}
                    </div>

                    {plan.max_users && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4">
                        <Users className="w-3.5 h-3.5" />
                        {plan.max_users === 1 ? "1 bruker" : `Opptil ${plan.max_users} brukere`}
                      </div>
                    )}

                    {included.length > 0 && (
                      <ul className="space-y-2 mb-6 flex-1">
                        {included.map((m) => (
                          <li key={m} className="flex items-center gap-2 text-sm">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                            {MODULE_LABELS[m] ?? m}
                          </li>
                        ))}
                        {addon.map((m) => (
                          <li key={m} className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span className="w-4 h-4 flex items-center justify-center text-xs shrink-0">+</span>
                            {MODULE_LABELS[m] ?? m} (tillegg)
                          </li>
                        ))}
                      </ul>
                    )}

                    <div className="mt-auto space-y-2">
                      <Button
                        asChild
                        className="w-full gap-2"
                        variant={isFeatured ? "default" : "outline"}
                      >
                        <Link to="/register">
                          Start gratis demo <ArrowRight className="w-4 h-4" />
                        </Link>
                      </Button>
                      <Link
                        to="/kontakt"
                        className="block text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Usikker? Ta kontakt med oss
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* FAQ / trust signals */}
      <section className="py-16 bg-muted/30 border-t border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl font-bold mb-8">Vanlige spørsmål</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-left">
            {[
              { q: "Kreves det kredittkort for prøveperioden?", a: "Nei. Du starter uten kredittkort og bestemmer deg når prøveperioden er over." },
              { q: "Kan jeg avbryte når som helst?", a: "Ja. Det er ingen bindingstid. Du kan avslutte abonnementet når du ønsker." },
              { q: "Hva skjer etter prøveperioden?", a: "Du velger en plan og fortsetter, eller avslutter uten kostnad." },
              { q: "Får jeg support?", a: "Ja. Alle kunder får tilgang til vårt supportsystem direkte i løsningen." },
            ].map(({ q, a }) => (
              <div key={q} className="bg-background rounded-xl border border-border p-5">
                <p className="font-semibold text-sm mb-2">{q}</p>
                <p className="text-sm text-muted-foreground">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
