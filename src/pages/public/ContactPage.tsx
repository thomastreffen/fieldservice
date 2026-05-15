import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import PublicLayout from "@/layouts/PublicLayout";
import { CheckCircle2, Loader2, Mail, Phone, Clock } from "lucide-react";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      setError("Fyll inn alle feltene");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const { error: dbError } = await (supabase as any)
        .from("support_tickets")
        .insert({
          title: `Salgshenvendelse fra ${name.trim()}`,
          description: `Kontakt: ${email.trim()}\n\n${message.trim()}`,
          category: "salg",
          priority: "Normal",
          status: "Åpen",
          tenant_id: null,
          created_by: null,
        });
      if (dbError) throw dbError;
      setSent(true);
    } catch (err: any) {
      setError(err.message ?? "Noe gikk galt. Prøv igjen.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PublicLayout>
      <section className="bg-gradient-to-b from-muted/40 to-background pt-16 pb-8 text-center">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <h1 className="text-4xl font-extrabold tracking-tight mb-3">Ta kontakt</h1>
          <p className="text-muted-foreground text-lg">Vi hjelper deg gjerne. Forvent svar innen én arbeidsdag.</p>
        </div>
      </section>

      <section className="py-12 bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-5 gap-10">
          {/* Contact info */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h2 className="font-bold text-lg mb-4">Kontaktinformasjon</h2>
              <div className="space-y-4">
                {[
                  { icon: Mail, label: "E-post", value: "hei@fieldservice.no" },
                  { icon: Phone, label: "Telefon", value: "+47 000 00 000" },
                  { icon: Clock, label: "Åpningstider", value: "Man–fre 08:00–16:00" },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="text-sm font-medium">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
              <p className="text-sm font-semibold mb-1">Vil du prøve først?</p>
              <p className="text-xs text-muted-foreground mb-3">Start en gratis 14-dagers prøveperiode uten kredittkort.</p>
              <Button asChild size="sm" className="w-full">
                <a href="/register">Start gratis demo</a>
              </Button>
            </div>
          </div>

          {/* Form */}
          <div className="lg:col-span-3">
            {sent ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-5">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                </div>
                <h2 className="text-xl font-bold mb-2">Melding sendt!</h2>
                <p className="text-muted-foreground">Takk for din henvendelse. Vi tar kontakt innen én arbeidsdag.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5 bg-card border border-border rounded-2xl p-7">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Navn</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ola Nordmann" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">E-post</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ola@bedrift.no" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="message">Melding</Label>
                  <Textarea
                    id="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Fortell oss hva du lurer på, hvilken bransje du er i, og hvor mange ansatte dere er..."
                    rows={5}
                    required
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? (
                    <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Sender...</>
                  ) : (
                    "Send melding"
                  )}
                </Button>
                <p className="text-xs text-center text-muted-foreground">Vi svarer innen én arbeidsdag på hverdager.</p>
              </form>
            )}
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
