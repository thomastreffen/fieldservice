import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import PublicLayout from "@/layouts/PublicLayout";
import { CheckCircle2, Loader2 } from "lucide-react";

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
        .from("contact_requests")
        .insert({ name: name.trim(), email: email.trim(), message: message.trim() });
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
          <p className="text-muted-foreground">Vi svarer vanligvis innen en arbeidsdag.</p>
        </div>
      </section>

      <section className="py-12 bg-background">
        <div className="max-w-xl mx-auto px-4 sm:px-6">
          {sent ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-xl font-bold mb-2">Melding sendt!</h2>
              <p className="text-muted-foreground">Takk for din henvendelse. Vi tar kontakt snart.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5 bg-card border border-border rounded-2xl p-7">
              <div className="space-y-1.5">
                <Label htmlFor="name">Navn</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ola Nordmann"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">E-post</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ola@bedrift.no"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="message">Melding</Label>
                <Textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Fortell oss hva du lurer på..."
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
            </form>
          )}
        </div>
      </section>
    </PublicLayout>
  );
}
