import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { ChevronRight, Zap, Thermometer, Droplets, Layers, CheckCircle2, Loader2, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { createInternalLead } from "@/lib/internalLeads";
import { savePendingRegistration } from "@/lib/pendingRegistration";

const VERTICAL_ICONS: Record<string, typeof Layers> = {
  zap: Zap,
  thermometer: Thermometer,
  droplets: Droplets,
};

const ENUM_MODULES = new Set(["crm", "postkontoret", "ressursplanlegger"]);

function toSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/æ/g, "ae")
    .replace(/ø/g, "o")
    .replace(/å/g, "a")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

type Vertical = {
  id: string;
  slug: string;
  display_name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  default_modules: string[] | null;
};

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [selectedVertical, setSelectedVertical] = useState<Vertical | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [orgNumber, setOrgNumber] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const { data: verticals, isLoading } = useQuery<Vertical[]>({
    queryKey: ["public_verticals"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("verticals")
        .select("id, slug, display_name, description, icon, color, default_modules")
        .eq("is_active", true)
        .order("slug");
      if (error) throw error;
      return data as Vertical[];
    },
  });

  const slug = toSlug(companyName);

  function validateStep2() {
    if (!companyName.trim()) return "Selskapsnavn er påkrevd";
    if (!contactName.trim()) return "Kontaktperson er påkrevd";
    if (!email.trim() || !email.includes("@")) return "Ugyldig e-postadresse";
    if (password.length < 8) return "Passord må ha minst 8 tegn";
    if (password !== confirmPassword) return "Passordene stemmer ikke overens";
    return null;
  }

  async function handleSubmit() {
    if (!selectedVertical) return;
    if (!termsAccepted) { toast.error("Du må godta vilkårene"); return; }

    setSubmitting(true);
    try {
      // 1. Create auth user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: contactName } },
      });
      if (signUpError) throw signUpError;
      if (!authData.user?.id) throw new Error("Bruker ikke opprettet");

      const defaultModules = (selectedVertical.default_modules ?? []).filter((m) =>
        ENUM_MODULES.has(m)
      );

      if (!authData.session) {
        // Email confirmation is enabled — store the registration payload so
        // AppRoutes can complete it once a session is established after confirmation.
        savePendingRegistration({
          companyName: companyName.trim(),
          slug,
          verticalId: selectedVertical.id,
          contactName: contactName.trim(),
          email,
          defaultModules,
          verticalSlug: selectedVertical.slug,
        });
        setEmailSent(true);
        setSubmitting(false);
        return;
      }

      // 2. Session is established — call as authenticated user (auth.uid() works)
      const { data: tenantId, error: rpcError } = await (supabase as any).rpc(
        "register_trial_tenant",
        {
          p_company_name: companyName.trim(),
          p_slug:         slug,
          p_vertical_id:  selectedVertical.id,
          p_contact_name: contactName.trim(),
          p_email:        email,
          p_default_modules: defaultModules,
        }
      );
      if (rpcError) throw rpcError;

      // 3. Fire-and-forget lead in internal CRM
      createInternalLead({
        name: contactName.trim(),
        email,
        company: companyName.trim(),
        source: "trial",
        verticalSlug: selectedVertical.slug,
        tenantId: tenantId as string,
      });

      sessionStorage.setItem("trial_welcome", "1");
      window.location.href = "/tenant";
    } catch (err: any) {
      toast.error(err.message ?? "Registrering feilet");
      setSubmitting(false);
    }
  }

  // Email confirmation required — show a waiting screen
  if (emailSent) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <MailCheck className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Sjekk e-posten din</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Vi har sendt en bekreftelseslenke til{" "}
            <span className="font-semibold text-foreground">{email}</span>.
            Klikk på lenken for å aktivere kontoen og starte prøveperioden.
          </p>
          <p className="text-xs text-muted-foreground pt-4">
            Ikke fått e-post?{" "}
            <button
              className="text-primary underline underline-offset-2"
              onClick={() => {
                supabase.auth.resend({ type: "signup", email });
                toast.success("Bekreftelseslenke sendt på nytt");
              }}
            >
              Send på nytt
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center mx-auto mb-3">
            <Layers className="w-5 h-5 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">VPKontroll</h1>
          <p className="text-sm text-muted-foreground mt-1">Start din gratis 14-dagers prøveperiode</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors",
                  step > s
                    ? "bg-primary text-primary-foreground"
                    : step === s
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {step > s ? <CheckCircle2 className="w-4 h-4" /> : s}
              </div>
              {s < 3 && (
                <div className={cn("w-12 h-0.5", step > s ? "bg-primary" : "bg-muted")} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1 — Velg vertikal */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h2 className="text-lg font-semibold">Velg din bransje</h2>
              <p className="text-sm text-muted-foreground">Systemet tilpasses din bransje</p>
            </div>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {verticals?.map((v) => {
                  const Icon = (v.icon && VERTICAL_ICONS[v.icon]) || Layers;
                  const isSelected = selectedVertical?.id === v.id;
                  return (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVertical(v)}
                      className={cn(
                        "relative p-5 rounded-xl border-2 text-left transition-all hover:border-primary/50",
                        isSelected
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border bg-card"
                      )}
                    >
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
                        style={{ backgroundColor: v.color ? v.color + "20" : undefined }}
                      >
                        <Icon
                          className="w-5 h-5"
                          style={{ color: v.color ?? undefined }}
                        />
                      </div>
                      <p className="font-semibold text-sm">{v.display_name}</p>
                      {v.description && (
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                          {v.description}
                        </p>
                      )}
                      {isSelected && (
                        <div className="absolute top-3 right-3">
                          <CheckCircle2 className="w-4 h-4 text-primary" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
            <div className="flex justify-end pt-2">
              <Button
                onClick={() => setStep(2)}
                disabled={!selectedVertical}
                className="gap-2"
              >
                Neste <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2 — Om bedriften */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h2 className="text-lg font-semibold">Om bedriften</h2>
              <p className="text-sm text-muted-foreground">Fyll inn informasjon om din bedrift og bruker</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="companyName">Selskapsnavn *</Label>
                <Input
                  id="companyName"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Eks. Norsk VVS AS"
                />
                {companyName && (
                  <p className="text-xs text-muted-foreground">
                    Domene: <span className="font-mono">{slug}</span>
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="orgNumber">Organisasjonsnummer</Label>
                <Input
                  id="orgNumber"
                  value={orgNumber}
                  onChange={(e) => setOrgNumber(e.target.value)}
                  placeholder="123 456 789 (valgfritt)"
                />
              </div>
              <div className="border-t border-border pt-4 space-y-4">
                <p className="text-sm font-medium text-muted-foreground">Administratorkonto</p>
                <div className="space-y-1.5">
                  <Label htmlFor="contactName">Fullt navn *</Label>
                  <Input
                    id="contactName"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Ola Nordmann"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">E-post *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ola@bedrift.no"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="password">Passord *</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min. 8 tegn"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="confirmPassword">Bekreft passord *</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Gjenta passord"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(1)}>Tilbake</Button>
              <Button
                onClick={() => {
                  const err = validateStep2();
                  if (err) { toast.error(err); return; }
                  setStep(3);
                }}
                className="gap-2"
              >
                Neste <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3 — Bekreftelse */}
        {step === 3 && selectedVertical && (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h2 className="text-lg font-semibold">Bekreftelse</h2>
              <p className="text-sm text-muted-foreground">Se over informasjonen og start prøveperioden</p>
            </div>
            <div className="bg-card border border-border rounded-xl divide-y divide-border overflow-hidden">
              <div className="p-4">
                <p className="text-xs text-muted-foreground mb-0.5">Bransje</p>
                <p className="font-medium text-sm">{selectedVertical.display_name}</p>
              </div>
              <div className="p-4">
                <p className="text-xs text-muted-foreground mb-0.5">Selskap</p>
                <p className="font-medium text-sm">{companyName}</p>
                {orgNumber && <p className="text-xs text-muted-foreground">Org.nr: {orgNumber}</p>}
              </div>
              <div className="p-4">
                <p className="text-xs text-muted-foreground mb-0.5">Administrator</p>
                <p className="font-medium text-sm">{contactName}</p>
                <p className="text-xs text-muted-foreground">{email}</p>
              </div>
              <div className="p-4 bg-muted/30">
                <p className="text-xs text-muted-foreground mb-0.5">Prøveperiode</p>
                <p className="font-medium text-sm">14 dager gratis</p>
                <p className="text-xs text-muted-foreground">
                  Utløper{" "}
                  {new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString("nb-NO", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-card border border-border rounded-xl">
              <Checkbox
                id="terms"
                checked={termsAccepted}
                onCheckedChange={(v) => setTermsAccepted(!!v)}
                className="mt-0.5"
              />
              <Label htmlFor="terms" className="text-sm leading-relaxed cursor-pointer">
                Jeg godtar{" "}
                <span className="text-primary underline underline-offset-2">vilkårene for bruk</span>{" "}
                og{" "}
                <span className="text-primary underline underline-offset-2">personvernreglene</span>
              </Label>
            </div>
            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(2)} disabled={submitting}>
                Tilbake
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting || !termsAccepted}
                className="gap-2"
              >
                {submitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Oppretter konto...</>
                ) : (
                  "Start gratis prøveperiode"
                )}
              </Button>
            </div>
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground mt-6">
          Har du allerede en konto?{" "}
          <a href="/login" className="text-primary underline underline-offset-2">
            Logg inn
          </a>
        </p>
      </div>
    </div>
  );
}
