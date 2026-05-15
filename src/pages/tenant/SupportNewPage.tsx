import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useVertical } from "@/hooks/useVertical";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Paperclip } from "lucide-react";
import { sendTeamsMessage, newTicketCard } from "@/lib/teamsWebhook";
import { createWorkItem } from "@/lib/azureDevops";

const CATEGORIES = ["Bug", "Spørsmål", "Funksjonsønske", "Annet"] as const;
const PRIORITIES = ["Lav", "Normal", "Høy", "Kritisk"] as const;

export default function SupportNewPage() {
  const navigate = useNavigate();
  const { tenantId, user } = useAuth();
  const { vertical } = useVertical();
  const { data: settings } = usePlatformSettings();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("Spørsmål");
  const [priority, setPriority] = useState<string>("Normal");
  const [saving, setSaving] = useState(false);
  const [tenantName, setTenantName] = useState<string>("");

  useEffect(() => {
    if (!tenantId) return;
    (supabase as any).from("tenants").select("name").eq("id", tenantId).single()
      .then(({ data }: any) => { if (data?.name) setTenantName(data.name); });
  }, [tenantId]);

  async function fireNotifications(ticket: { id: string; title: string; description: string; category: string; priority: string }) {
    if (!settings) return;
    const verticalName = vertical?.display_name ?? null;

    if (settings.teams_enabled && settings.teams_webhook_url && settings.teams_notify_new_ticket) {
      sendTeamsMessage(settings.teams_webhook_url, newTicketCard(ticket, tenantName, verticalName))
        .catch(() => { /* fire-and-forget */ });
    }

    if (settings.devops_enabled && settings.devops_pat && ticket.category === "Funksjonsønske") {
      createWorkItem(
        { orgUrl: settings.devops_org_url, project: settings.devops_project, pat: settings.devops_pat, workItemType: settings.devops_work_item_type },
        ticket,
        tenantName,
        verticalName,
      ).catch(() => { /* fire-and-forget */ });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!tenantId || !user) return;
    if (!title.trim() || !description.trim()) {
      toast.error("Fyll ut tittel og beskrivelse");
      return;
    }

    setSaving(true);
    const { data, error } = await (supabase as any)
      .from("support_tickets")
      .insert({
        tenant_id: tenantId,
        created_by: user.id,
        title: title.trim(),
        description: description.trim(),
        category,
        priority,
        status: "Åpen",
      })
      .select("id")
      .single();

    setSaving(false);
    if (error) {
      toast.error("Kunne ikke opprette ticket");
      return;
    }
    toast.success("Ticket opprettet");
    navigate(`/tenant/support/${data.id}`);
    fireNotifications({ id: data.id, title: title.trim(), description: description.trim(), category, priority });
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/tenant/support")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ny ticket</h1>
          <p className="text-muted-foreground mt-1">Send en supporthenvendelse til oss</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 bg-card rounded-xl border border-border p-6">
        <div className="space-y-1.5">
          <Label htmlFor="title">Tittel</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Kort beskrivelse av problemet"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="description">Beskrivelse</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Beskriv problemet eller spørsmålet i detalj..."
            rows={6}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Kategori</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Prioritet</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITIES.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Vedlegg</Label>
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-md border border-dashed border-border text-sm text-muted-foreground bg-muted/30 cursor-not-allowed select-none">
            <Paperclip className="h-4 w-4 shrink-0" />
            <span>Filopplasting kommer snart</span>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" disabled={saving} className="gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Send ticket
          </Button>
          <Button type="button" variant="ghost" onClick={() => navigate("/tenant/support")}>
            Avbryt
          </Button>
        </div>
      </form>
    </div>
  );
}
