import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Loader2, ExternalLink, Plus } from "lucide-react";

const STAGES = ["Ny lead", "Kontaktet", "Demo booket", "Tilbud sendt", "Konvertert", "Tapt"];
const ACTIVITY_TYPES = ["notat", "samtale", "møte", "epost"];
const ACTIVITY_LABELS: Record<string, string> = {
  notat: "Notat", samtale: "Samtale", møte: "Møte", epost: "E-post",
};

type Lead = {
  id: string;
  name: string;
  email: string | null;
  company: string | null;
  phone: string | null;
  source: string;
  deal_stage: string;
  notes: string | null;
  vertical_id: string | null;
  assignee_id: string | null;
  tenant_id: string | null;
  ticket_id: string | null;
  created_at: string;
  verticals: { id: string; display_name: string } | null;
  tenants: { id: string; name: string } | null;
  support_tickets: { id: string; title: string } | null;
};

type Activity = {
  id: string;
  type: string;
  description: string | null;
  created_at: string;
  profiles: { full_name: string | null } | null;
};

type Vertical = { id: string; display_name: string };
type Profile = { user_id: string; full_name: string | null; email: string | null };

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "Nå";
  if (diff < 3600) return `${Math.floor(diff / 60)} min siden`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} t siden`;
  return `${Math.floor(diff / 86400)} d siden`;
}

export default function AdminSalgDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [verticalId, setVerticalId] = useState("");
  const [source, setSource] = useState("manuelt");
  const [stage, setStage] = useState("Ny lead");
  const [notes, setNotes] = useState("");
  const [assigneeId, setAssigneeId] = useState("");

  const [activityType, setActivityType] = useState("notat");
  const [activityDesc, setActivityDesc] = useState("");

  const { data: lead, isLoading } = useQuery<Lead | null>({
    queryKey: ["admin-sales-lead", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("sales_leads")
        .select("*, verticals(id, display_name), tenants(id, name), support_tickets(id, title)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as Lead;
    },
  });

  useEffect(() => {
    if (!lead) return;
    setName(lead.name);
    setEmail(lead.email ?? "");
    setCompany(lead.company ?? "");
    setPhone(lead.phone ?? "");
    setVerticalId(lead.vertical_id ?? "");
    setSource(lead.source);
    setStage(lead.deal_stage);
    setNotes(lead.notes ?? "");
    setAssigneeId(lead.assignee_id ?? "");
  }, [lead]);

  const { data: activities = [] } = useQuery<Activity[]>({
    queryKey: ["admin-sales-activities", id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("sales_activities")
        .select("id, type, description, created_at, profiles(full_name)")
        .eq("lead_id", id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: verticals = [] } = useQuery<Vertical[]>({
    queryKey: ["admin-verticals-list"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("verticals")
        .select("id, display_name")
        .eq("is_active", true)
        .order("display_name");
      return data ?? [];
    },
  });

  const { data: profiles = [] } = useQuery<Profile[]>({
    queryKey: ["admin-team-profiles"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("profiles")
        .select("user_id, full_name, email")
        .eq("is_active", true)
        .order("full_name");
      return data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any)
        .from("sales_leads")
        .update({
          name: name.trim(),
          email: email.trim() || null,
          company: company.trim() || null,
          phone: phone.trim() || null,
          vertical_id: verticalId || null,
          source,
          deal_stage: stage,
          notes: notes.trim() || null,
          assignee_id: assigneeId || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lagret");
      qc.invalidateQueries({ queryKey: ["admin-sales-lead", id] });
      qc.invalidateQueries({ queryKey: ["admin-sales-leads"] });
    },
    onError: () => toast.error("Lagring feilet"),
  });

  const addActivity = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await (supabase as any).from("sales_activities").insert({
        lead_id: id,
        type: activityType,
        description: activityDesc.trim() || null,
        performed_by: user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setActivityDesc("");
      qc.invalidateQueries({ queryKey: ["admin-sales-activities", id] });
    },
    onError: () => toast.error("Feil ved logging"),
  });

  const convertToTenant = () => {
    setStage("Konvertert");
    save.mutate();
    toast.info("Lead markert som Konvertert. Opprett tenant manuelt under Tenants.");
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!lead) {
    return <p className="text-muted-foreground">Lead ikke funnet.</p>;
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/salg")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-xl font-bold flex-1 truncate">{lead.name}</h1>
        <Badge variant="outline">{lead.deal_stage}</Badge>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Detaljer</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Navn</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>E-post</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Selskap</Label>
            <Input value={company} onChange={(e) => setCompany(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Telefon</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Vertikal</Label>
            <Select value={verticalId} onValueChange={setVerticalId}>
              <SelectTrigger><SelectValue placeholder="Ingen" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Ingen</SelectItem>
                {verticals.map((v) => (
                  <SelectItem key={v.id} value={v.id}>{v.display_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Kilde</Label>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="manuelt">Manuelt</SelectItem>
                <SelectItem value="kontaktskjema">Kontaktskjema</SelectItem>
                <SelectItem value="trial">Trial</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Stadium</Label>
            <Select value={stage} onValueChange={setStage}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Ansvarlig</Label>
            <Select value={assigneeId} onValueChange={setAssigneeId}>
              <SelectTrigger><SelectValue placeholder="Ingen" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Ingen</SelectItem>
                {profiles.map((p) => (
                  <SelectItem key={p.user_id} value={p.user_id}>
                    {p.full_name ?? p.email ?? p.user_id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Notater</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button onClick={() => save.mutate()} disabled={save.isPending} className="gap-2">
            {save.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Lagre
          </Button>
          {lead.tenant_id && (
            <Button variant="outline" size="sm" asChild className="gap-1.5">
              <Link to={`/admin/tenants/${lead.tenant_id}`}>
                <ExternalLink className="w-3.5 h-3.5" /> Se tenant
              </Link>
            </Button>
          )}
          {lead.ticket_id && (
            <Button variant="outline" size="sm" asChild className="gap-1.5">
              <Link to={`/admin/support/${lead.ticket_id}`}>
                <ExternalLink className="w-3.5 h-3.5" /> Se support-sak
              </Link>
            </Button>
          )}
          {lead.deal_stage !== "Konvertert" && !lead.tenant_id && (
            <Button variant="secondary" size="sm" className="ml-auto" onClick={convertToTenant}>
              Konverter til tenant
            </Button>
          )}
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Aktivitetslogg</h2>
        <div className="flex gap-2">
          <Select value={activityType} onValueChange={setActivityType}>
            <SelectTrigger className="w-32 shrink-0"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ACTIVITY_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{ACTIVITY_LABELS[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Beskriv aktiviteten..."
            value={activityDesc}
            onChange={(e) => setActivityDesc(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (activityDesc.trim()) addActivity.mutate();
              }
            }}
          />
          <Button
            onClick={() => { if (activityDesc.trim()) addActivity.mutate(); }}
            disabled={addActivity.isPending || !activityDesc.trim()}
            size="icon"
            className="shrink-0"
          >
            {addActivity.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          </Button>
        </div>

        <div className="space-y-3">
          {activities.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Ingen aktiviteter ennå.</p>
          )}
          {activities.map((a) => (
            <div key={a.id} className="flex gap-3 text-sm border-b border-border pb-3 last:border-0 last:pb-0">
              <Badge variant="outline" className="shrink-0 text-[10px] h-fit">
                {ACTIVITY_LABELS[a.type] ?? a.type}
              </Badge>
              <div className="flex-1 min-w-0">
                <p className="leading-relaxed">{a.description ?? "—"}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {a.profiles?.full_name ?? "Ukjent"} · {timeAgo(a.created_at)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
