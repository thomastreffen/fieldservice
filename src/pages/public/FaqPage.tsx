import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import PublicLayout from "@/layouts/PublicLayout";
import { Button } from "@/components/ui/button";
import { ChevronDown, ArrowRight, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type FaqEntry = { q: string; a: string };
type FaqData = Record<string, FaqEntry[]>;

const STATIC_FAQ: FaqData = {
  "Kom i gang": [
    { q: "Hvor lang tid tar det å komme i gang?", a: "Under 5 minutter. Du velger bransje, legger inn firmainfo og er klar til å registrere den første jobben med en gang." },
    { q: "Trenger jeg å installere noe?", a: "Nei. FieldService er en nettbasert løsning som fungerer direkte i nettleseren på PC, nettbrett og mobil. Ingen installasjon kreves." },
    { q: "Kan jeg importere eksisterende kunder og anlegg?", a: "Ja, vi støtter import via CSV-fil. Ta kontakt med oss, så hjelper vi deg med oppsett og kartlegging av felter." },
    { q: "Hva skjer med dataene mine etter prøveperioden?", a: "Dataene beholdes. Du velger om du vil oppgradere til en betalt plan. Velger du å ikke fortsette, kan du eksportere alt innhold innen 30 dager." },
    { q: "Kan kollegene mine også bruke systemet?", a: "Ja. Du kan invitere teknikere og andre ansatte allerede i prøveperioden. Alle har tilgang med det rollenivået du angir." },
    { q: "Kreves det opplæring for å bruke FieldService?", a: "Nei, systemet er designet for å være intuitivt. Vi tilbyr likevel en gratis onboarding-samtale for alle nye kunder, slik at dere starter optimalt." },
  ],
  "Prising": [
    { q: "Hva koster FieldService?", a: "Vi tilbyr flere planer avhengig av antall brukere og moduler. Se vår prisside for oppdaterte priser på måneds- og årsabonnement." },
    { q: "Er det bindingstid?", a: "Nei. Månedlig abonnement kan sies opp når som helst uten ekstra kostnader. Vi krever ingen minimum bindingstid." },
    { q: "Hva er inkludert i den gratis prøveperioden?", a: "Full tilgang til alle moduler i 14 dager. Ingen kredittkort kreves. Du bestemmer selv hvilke moduler du ønsker å teste." },
    { q: "Kan jeg endre plan underveis?", a: "Ja, du kan oppgradere eller nedjustere planen din når som helst direkte fra innstillinger. Endringer trer i kraft umiddelbart." },
    { q: "Tilbyr dere rabatter ved årsabonnement?", a: "Ja, vi gir rabatt for alle kunder som velger årsabonnement. Ta kontakt med oss for å høre hva som passer best for din bedrift." },
  ],
  "Sikkerhet": [
    { q: "Hvor lagres dataene mine?", a: "Alle data lagres i europeiske datasentre (EU-region) med høy tilgjengelighet, redundans og kryptering i transit og hvile." },
    { q: "Er FieldService GDPR-kompatibelt?", a: "Ja. Vi følger GDPR og norske personvernregler fullt ut. Vi har databehandleravtale tilgjengelig for alle kunder." },
    { q: "Hvem har tilgang til dataene mine?", a: "Kun du og de brukerne du selv inviterer. FieldService-ansatte har strengt begrenset tilgang og logger all aktivitet." },
    { q: "Kan jeg eksportere dataene mine?", a: "Ja. Du kan eksportere kunder, jobber, anlegg og annet innhold til CSV eller Excel direkte fra systemet." },
    { q: "Hva skjer med dataene om jeg avslutter abonnementet?", a: "Vi sletter dataene dine 30 dager etter avslutning. I mellomtiden kan du eksportere alt. Vi sender påminnelse før sletting." },
  ],
  "Moduler": [
    { q: "Hva er en modul?", a: "En modul er en avgrenset del av systemet — for eksempel Jobbstyring, CRM, Ressursplanlegger eller Postkontoret. Du aktiverer kun det bedriften trenger." },
    { q: "Kan jeg aktivere og deaktivere moduler selv?", a: "Ja, admin-brukere kan slå moduler av og på direkte under Innstillinger → Moduler, uten å kontakte oss." },
    { q: "Hvilke moduler er inkludert som standard?", a: "Alle planer inkluderer CRM, Jobbstyring og Anleggsregister. Ressursplanlegger og Postkontoret er tilleggsmoduler på utvalgte planer." },
    { q: "Er Ressursplanleggeren tilgjengelig for alle bransjer?", a: "Ja. Ressursplanleggeren fungerer for alle bransjer og lar deg visuelt planlegge tekniker-arbeid for hele uken med dra-og-slipp." },
    { q: "Kan jeg bygge egne skjemaer og sjekklister?", a: "Ja. Med Skjema- og mal-modulen kan du bygge egne sjekklister, inspeksjonsskjemaer og servicerapporter som teknikerne fyller ut i felten." },
    { q: "Støttes integrasjoner med andre systemer?", a: "Vi jobber løpende med integrasjoner. Ta kontakt for å høre om vi støtter ditt regnskapssystem eller andre verktøy du bruker." },
  ],
  "Support": [
    { q: "Hvordan kontakter jeg support?", a: "Via e-post på hei@fieldservice.no, eller gjennom supportsystemet direkte i appen under Mine saker. Vi er tilgjengelige man–fre kl. 08–16." },
    { q: "Hva er responstiden for support?", a: "Vi svarer innen én arbeidsdag på alle henvendelser. Kritiske driftsfeil behandles samme dag." },
    { q: "Tilbyr dere onboarding og opplæring?", a: "Ja. Vi tilbyr en gratis onboarding-samtale for alle nye kunder, der vi setter opp systemet etter din bransje og hjelper dere i gang." },
    { q: "Finnes det brukerdokumentasjon?", a: "Ja, vi har en kunnskapsbase med videoguider og artikler tilgjengelig direkte i appen. Den oppdateres løpende." },
    { q: "Hva gjør jeg om jeg finner en feil?", a: "Rapporter den via supportsystemet i appen eller på e-post. Vi tar alle feilrapporter seriøst og gir tilbakemelding innen én arbeidsdag." },
  ],
};

function AccordionItem({ q, a }: FaqEntry) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left flex items-start justify-between gap-4 py-4 px-0 hover:text-foreground transition-colors"
      >
        <span className="text-sm font-medium leading-relaxed">{q}</span>
        <ChevronDown
          className={cn("w-4 h-4 shrink-0 mt-0.5 transition-transform text-muted-foreground", open && "rotate-180")}
        />
      </button>
      {open && (
        <div className="pb-4 text-sm text-muted-foreground leading-relaxed">
          {a}
        </div>
      )}
    </div>
  );
}

export default function FaqPage() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const { data: cmsRaw } = useQuery<string | null>({
    queryKey: ["cms_faq"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("platform_settings")
        .select("value")
        .eq("key", "cms.faq")
        .single();
      return data?.value ?? null;
    },
  });

  let faq: FaqData = STATIC_FAQ;
  if (cmsRaw) {
    try { faq = JSON.parse(cmsRaw); } catch {}
  }

  const categories = Object.keys(faq);
  const activeFirst = activeCategory ?? categories[0];

  return (
    <PublicLayout>
      {/* Header */}
      <section className="bg-gradient-to-b from-muted/40 to-background pt-16 pb-8 text-center">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <h1 className="text-4xl font-extrabold tracking-tight mb-3">Vanlige spørsmål</h1>
          <p className="text-muted-foreground text-lg">Alt du lurer på om FieldService — samlet på ett sted.</p>
        </div>
      </section>

      {/* FAQ body */}
      <section className="py-12 bg-background">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-10">
          {/* Category sidebar */}
          <nav className="space-y-1 lg:sticky lg:top-24 self-start">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  activeFirst === cat
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {cat}
              </button>
            ))}
          </nav>

          {/* Questions */}
          <div>
            {categories.map((cat) => (
              <div
                key={cat}
                id={cat}
                className={cn("mb-10", activeFirst !== cat && "hidden lg:block")}
              >
                <h2 className="text-xl font-bold mb-4 scroll-mt-24">{cat}</h2>
                <div className="bg-card border border-border rounded-xl px-5 divide-y-0">
                  {(faq[cat] ?? []).map((item) => (
                    <AccordionItem key={item.q} {...item} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-14 bg-muted/30 border-t border-border">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
            <MessageCircle className="w-7 h-7 text-primary" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Fant du ikke svaret?</h2>
          <p className="text-muted-foreground mb-6">
            Vi hjelper deg gjerne. Send oss en melding, så svarer vi innen én arbeidsdag.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" asChild className="gap-2 h-12 px-7">
              <Link to="/kontakt">Ta kontakt med oss <ArrowRight className="w-4 h-4" /></Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="h-12 px-7">
              <Link to="/register">Start gratis prøveperiode</Link>
            </Button>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
