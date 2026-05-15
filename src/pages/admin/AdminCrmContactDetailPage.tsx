import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { toast } from "sonner";
import {
  Loader2, ArrowLeft, Mail, Phone, Building2, TrendingUp, ClipboardList,
  Pencil, ExternalLink, StickyNote, Phone as PhoneIcon, CalendarDays, Send, Loader2 as Spin,
} from "lucide-react";
import { ActivityFeedList } from "@/components/crm/ActivityFeedList";
import type { ActivityEntry } from "@/hooks/useActivityLog";
import { cn } from "@/lib/utils";

const STAGES = ["Ny lead", "Kontaktet", "Demo booket", "Tilbud sendt", "Konvertert", "Tapt"];

type Contact = {
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
  created_at: string;
  verticals: { id: string; display_name: string } | null;
  tenants: { id: string; name: string } | null;
};

type Vertical = { id: string; display_name: string };

const ACTIVITY_MODES = [
  { value: "notat",   label: "Notat",   icon: StickyNote },
  { value: "samtale", label: "Samtale", icon: PhoneIcon },
  { value: "møte",    label: "Møte",    icon: CalendarDays },
  { value: "epost",   label: "E-post",  icon: Mail },
] as const;
type ActivityMode = (typeof ACTIVITY_MODES)[number]["value"];

function PlatformActivityComposer({ contactId, onSubmitted }: { contactId: string; onSubmitted: () => void }) {
  const [mode, setMode] = useState<ActivityMode>("notat");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await (supabase as any).from("platform_activities").insert({
        contact_id: contactId,
        type: mode,
        description: text.trim(),
        performed_by: user?.id ?? null,
      });
      if (error) throw error;
      setText("");
      onSubmitted();
    } catch {
      toast.error("Kunne ikke lagre aktivitet");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-3 border-b border-border space-y-2">
      <div className="flex gap-1">
        {ACTIVITY_MODES.map((m) => (
          <button
            key={m.value}
            onClick={() => setMode(m.value)}
            className={cn(
              "flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-lg text-[10px] font-medium transition-all",
              mode === m.value ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
            )}
          >
            <m.icon className="h-3.5 w-3.5" />
            {m.label}
          </button>
        ))}
      </div>
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={`Logg ${ACTIVITY_MODES.find((m) => m.value === mode)?.label.toLowerCase()}…`}
        rows={2}
        className="text-xs resize-none"
        onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit(); }}
      />
      <Button
        size="sm"
        className="w-full h-7 text-xs gap-1.5"
        onClick={handleSubmit}
        disabled={sending || !text.trim()}
      >
        {sending ? <Spin className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
        Logg
      </Button>
    </div>
  );
}

export default function AdminCrmContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({
    name: "", email: "", company: "", phone: "",
    vertical_id: "", source: "manuelt", deal_stage: "Ny lead", notes: "",
  });
  const [saving, setSaving] = useState(false);

  const { data: contact, isLoading } = useQuery<Contact | null>({
    queryKey: ["admin-crm-contact", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("platform_contacts")
        .select("*, verticals(id, display_name), tenants(id, name)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as Contact;
    },
  });

  const { data: verticals = [] } = useQuery<Vertical[]>({
    queryKey: ["admin-verticals-list"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("verticals").select("id, display_name").eq("is_active", true).order("display_name");
      return data ?? [];
    },
  });

  const { data: activities = [], refetch: refetchActivities } = useQuery<ActivityEntry[]>({
    queryKey: ["admin-crm-activities", id],
    enabled: !!id,
    queryFn: async () => {
      const { data: acts } = await (supabase as any)
        .from("platform_activities")
        .select("id, type, description, performed_by, created_at")
        .eq("contact_id", id)
        .order("created_at", { ascending: false });

      if (!acts?.length) return [];

      const performerIds = [...new Set((acts as any[]).map((a: any) => a.performed_by).filter(Boolean))];
      let nameMap = new Map<string, string>();
      if (performerIds.length > 0) {
        const { data: profiles } = await (supabase as any)
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", performerIds);
        nameMap = new Map((profiles || []).map((p: any) => [p.user_id, p.full_name || "Ukjent"]));
      }

      return (acts as any[]).map((a: any): ActivityEntry => ({
        id: a.id,
        type: a.type,
        action: a.type,
        title: null,
        description: a.description,
        performed_by: a.performed_by,
        performer_name: a.performed_by ? (nameMap.get(a.performed_by) ?? "Ukjent") : null,
        metadata: {},
        created_at: a.created_at,
      }));
    },
  });

  useEffect(() => {
    if (!contact) return;
    setForm({
      name: contact.name,
      email: contact.email ?? "",
      company: contact.company ?? "",
      phone: contact.phone ?? "",
      vertical_id: contact.vertical_id ?? "",
      source: contact.source,
      deal_stage: contact.deal_stage,
      notes: contact.notes ?? "",
    });
  }, [contact]);

  const saveEdit = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from("platform_contacts")
        .update({
          name: form.name.trim(),
          email: form.email || null,
          company: form.company || null,
          phone: form.phone || null,
          vertical_id: form.vertical_id || null,
          source: form.source,
          deal_stage: form.deal_stage,
          notes: form.notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
      toast.success("Lagret");
      setEditOpen(false);
      qc.invalidateQueries({ queryKey: ["admin-crm-contact", id] });
      qc.invalidateQueries({ queryKey: ["admin-crm-contacts"] });
    } catch (err: any) {
      toast.error(err.message ?? "Lagring feilet");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!contact) {
    return <div className="text-center py-20 text-muted-foreground">Kontakt ikke funnet</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/admin/crm/contacts"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {contact.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold">{contact.name}</h1>
              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                {contact.company && (
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3 w-3" />{contact.company}
                  </span>
                )}
                {contact.verticals && (
                  <Badge variant="secondary" className="text-[10px]">{contact.verticals.display_name}</Badge>
                )}
                <Badge variant="outline" className="text-[10px]">{contact.deal_stage}</Badge>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 mt-3 text-sm">
            {contact.email && (
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Mail className="h-3.5 w-3.5" />{contact.email}
              </span>
            )}
            {contact.phone && (
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Phone className="h-3.5 w-3.5" />{contact.phone}
              </span>
            )}
            {contact.tenants && (
              <Link
                to={`/admin/tenants/${contact.tenants.id}`}
                className="flex items-center gap-1 text-primary hover:underline text-sm"
              >
                <ExternalLink className="h-3.5 w-3.5" />{contact.tenants.name}
              </Link>
            )}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} className="gap-1.5">
          <Pencil className="h-3.5 w-3.5" />Rediger
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="overview" className="gap-1.5">
            <Building2 className="h-3.5 w-3.5" />Oversikt
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-1.5">
            <ClipboardList className="h-3.5 w-3.5" />Aktivitet ({activities.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="p-4 space-y-3">
              <h3 className="text-sm font-medium">Kontaktinfo</h3>
              <dl className="space-y-2 text-sm">
                {contact.email && (
                  <div>
                    <dt className="text-xs text-muted-foreground">E-post</dt>
                    <dd className="font-medium">{contact.email}</dd>
                  </div>
                )}
                {contact.phone && (
                  <div>
                    <dt className="text-xs text-muted-foreground">Telefon</dt>
                    <dd className="font-medium">{contact.phone}</dd>
                  </div>
                )}
                {contact.company && (
                  <div>
                    <dt className="text-xs text-muted-foreground">Selskap</dt>
                    <dd className="font-medium">{contact.company}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-xs text-muted-foreground">Kilde</dt>
                  <dd className="font-medium">{contact.source}</dd>
                </div>
              </dl>
            </Card>
            {contact.notes && (
              <Card className="p-4">
                <h3 className="text-sm font-medium mb-1">Notater</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{contact.notes}</p>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <Card className="overflow-hidden">
            <PlatformActivityComposer
              contactId={contact.id}
              onSubmitted={() => refetchActivities()}
            />
            <ActivityFeedList activities={activities} />
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit sheet */}
      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Rediger kontakt</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label>Navn *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>E-post</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Telefon</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Selskap</Label>
              <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Vertikal</Label>
                <Select value={form.vertical_id} onValueChange={(v) => setForm({ ...form, vertical_id: v })}>
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
                <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manuelt">Manuelt</SelectItem>
                    <SelectItem value="kontaktskjema">Kontaktskjema</SelectItem>
                    <SelectItem value="trial">Trial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Stadium</Label>
              <Select value={form.deal_stage} onValueChange={(v) => setForm({ ...form, deal_stage: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Notater</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
            </div>
          </div>
          <SheetFooter className="flex flex-row justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setEditOpen(false)}>Avbryt</Button>
            <Button onClick={saveEdit} disabled={saving || !form.name.trim()}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Lagre
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
