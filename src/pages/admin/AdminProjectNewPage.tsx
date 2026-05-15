import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { useAdminUsers } from "@/hooks/useAdminUsers";
import { supabase } from "@/integrations/supabase/client";
import { sendTeamsMessage, newTaskCard } from "@/lib/teamsWebhook";
import { createWorkItem } from "@/lib/azureDevops";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";

const TYPES = ["Feil", "Funksjonsønske", "Intern oppgave", "Tenant-bestilling"] as const;
const PRIORITIES = ["Lav", "Normal", "Høy", "Kritisk"] as const;
const STATUSES = ["Backlog", "Under arbeid", "Review", "Ferdig"] as const;

export default function AdminProjectNewPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { data: settings } = usePlatformSettings();

  const prefillTicketId = searchParams.get("ticket_id");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<string>("Intern oppgave");
  const [priority, setPriority] = useState<string>("Normal");
  const [status, setStatus] = useState<string>("Backlog");
  const [assigneeId, setAssigneeId] = useState<string>("ingen");
  const [verticalId, setVerticalId] = useState<string>("ingen");
  const [tenantId, setTenantId] = useState<string>("ingen");
  const [ticketId, setTicketId] = useState<string>("ingen");
  const [estimatedHours, setEstimatedHours] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: adminUsers = [] } = useAdminUsers();

  const { data: verticals = [] } = useQuery<{ id: string; display_name: string }[]>({
    queryKey: ["verticals-list"],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => { const { data } = await (supabase as any).from("verticals").select("id, display_name"); return data ?? []; },
  });

  const { data: tenants = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["tenants-list"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => { const { data } = await (supabase as any).from("tenants").select("id, name").order("name"); return data ?? []; },
  });

  const { data: tickets = [] } = useQuery<{ id: string; title: string }[]>({
    queryKey: ["support-tickets-list"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await (supabase as any).from("support_tickets").select("id, title").order("created_at", { ascending: false }).limit(60);
      return data ?? [];
    },
  });

  useEffect(() => {
    if (!prefillTicketId) return;
    (supabase as any)
      .from("support_tickets")
      .select("title, description, priority, tenant_id")
      .eq("id", prefillTicketId)
      .single()
      .then(({ data }: any) => {
        if (!data) return;
        setTitle(data.title);
        setDescription(data.description ?? "");
        setPriority(data.priority);
        if (data.tenant_id) setTenantId(data.tenant_id);
        setTicketId(prefillTicketId);
        setType("Funksjonsønske");
      });
  }, [prefillTicketId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !title.trim()) { toast.error("Tittel er påkrevd"); return; }

    setSaving(true);
    const { data, error } = await (supabase as any)
      .from("project_tasks")
      .insert({
        title: title.trim(),
        description: description.trim(),
        type,
        priority,
        status,
        assignee_id: assigneeId === "ingen" ? null : assigneeId,
        vertical_id: verticalId === "ingen" ? null : verticalId,
        tenant_id: tenantId === "ingen" ? null : tenantId,
        ticket_id: ticketId === "ingen" ? null : ticketId,
        estimated_hours: estimatedHours ? parseFloat(estimatedHours) : null,
        created_by: user.id,
      })
      .select("id")
      .single();
    setSaving(false);

    if (error) { toast.error("Kunne ikke opprette oppgave"); return; }
    toast.success("Oppgave opprettet");

    // Notifications (fire-and-forget)
    if (settings?.teams_enabled && settings.teams_webhook_url) {
      const assignee = adminUsers.find(u => u.id === assigneeId);
      const vertical = verticals.find(v => v.id === verticalId);
      sendTeamsMessage(
        settings.teams_webhook_url,
        newTaskCard({ id: data.id, title: title.trim(), type, priority }, assignee?.email ?? null, vertical?.display_name ?? null),
      ).catch(() => {});
    }
    if (settings?.devops_enabled && settings.devops_pat && type === "Funksjonsønske") {
      const vertical = verticals.find(v => v.id === verticalId);
      createWorkItem(
        { orgUrl: settings.devops_org_url, project: settings.devops_project, pat: settings.devops_pat, workItemType: settings.devops_work_item_type },
        { id: data.id, title: title.trim(), description: description.trim(), priority },
        tenants.find(t => t.id === tenantId)?.name ?? "",
        vertical?.display_name ?? null,
      ).catch(() => {});
    }

    navigate(`/admin/projects/${data.id}`);
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/projects")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ny oppgave</h1>
          <p className="text-muted-foreground mt-1">Opprett en ny prosjektoppgave</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-card rounded-xl border border-border p-6 space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="title">Tittel *</Label>
          <Input id="title" value={title} onChange={e => setTitle(e.target.value)} placeholder="Kort beskrivelse av oppgaven" required />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="desc">Beskrivelse</Label>
          <Textarea id="desc" value={description} onChange={e => setDescription(e.target.value)} placeholder="Detaljert beskrivelse..." rows={5} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Prioritet</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Tildelt</Label>
            <Select value={assigneeId} onValueChange={setAssigneeId}>
              <SelectTrigger><SelectValue placeholder="Ikke tildelt" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ingen">Ikke tildelt</SelectItem>
                {adminUsers.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Vertikal</Label>
            <Select value={verticalId} onValueChange={setVerticalId}>
              <SelectTrigger><SelectValue placeholder="Ingen" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ingen">Ingen</SelectItem>
                {verticals.map(v => <SelectItem key={v.id} value={v.id}>{v.display_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Tenant</Label>
            <Select value={tenantId} onValueChange={setTenantId}>
              <SelectTrigger><SelectValue placeholder="Ingen" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ingen">Ingen</SelectItem>
                {tenants.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Koblet ticket</Label>
            <Select value={ticketId} onValueChange={setTicketId}>
              <SelectTrigger><SelectValue placeholder="Ingen" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ingen">Ingen</SelectItem>
                {tickets.map(t => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="hours">Estimerte timer</Label>
            <Input id="hours" type="number" min="0" step="0.5" value={estimatedHours} onChange={e => setEstimatedHours(e.target.value)} placeholder="0" />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" disabled={saving} className="gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Opprett oppgave
          </Button>
          <Button type="button" variant="ghost" onClick={() => navigate("/admin/projects")}>Avbryt</Button>
        </div>
      </form>
    </div>
  );
}
