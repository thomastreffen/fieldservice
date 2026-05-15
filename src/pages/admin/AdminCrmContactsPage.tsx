import { useState, useCallback, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Search, Phone, Mail, Building2, MoreHorizontal, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Contact = {
  id: string;
  name: string;
  email: string | null;
  company: string | null;
  phone: string | null;
  source: string;
  deal_stage: string;
  created_at: string;
  verticals: { id: string; slug: string; display_name: string } | null;
};

type Vertical = { id: string; display_name: string };

const SOURCE_COLORS: Record<string, string> = {
  kontaktskjema: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  trial: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  manuelt: "bg-muted text-muted-foreground",
};

const STAGES = ["Ny lead", "Kontaktet", "Demo booket", "Tilbud sendt", "Konvertert", "Tapt"];

function CrmSubNav() {
  const location = useLocation();
  return (
    <div className="flex gap-0 border-b border-border mb-5">
      <Link
        to="/admin/crm"
        className={cn(
          "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
          location.pathname === "/admin/crm"
            ? "border-primary text-foreground"
            : "border-transparent text-muted-foreground hover:text-foreground"
        )}
      >
        Pipeline
      </Link>
      <Link
        to="/admin/crm/contacts"
        className={cn(
          "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
          location.pathname.startsWith("/admin/crm/contacts")
            ? "border-primary text-foreground"
            : "border-transparent text-muted-foreground hover:text-foreground"
        )}
      >
        Kontakter
      </Link>
    </div>
  );
}

const EMPTY_FORM = {
  name: "", email: "", company: "", phone: "",
  vertical_id: "", source: "manuelt", deal_stage: "Ny lead", notes: "",
};

export default function AdminCrmContactsPage() {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [verticals, setVerticals] = useState<Vertical[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    const [{ data: c }, { data: v }] = await Promise.all([
      (supabase as any)
        .from("platform_contacts")
        .select("id, name, email, company, phone, source, deal_stage, created_at, verticals(id, slug, display_name)")
        .order("created_at", { ascending: false }),
      (supabase as any)
        .from("verticals")
        .select("id, display_name")
        .eq("is_active", true)
        .order("display_name"),
    ]);
    setContacts((c || []) as Contact[]);
    setVerticals((v || []) as Vertical[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  const openNew = () => {
    setEditContact(null);
    setForm(EMPTY_FORM);
    setSheetOpen(true);
  };

  const openEdit = (c: Contact) => {
    setEditContact(c);
    setForm({
      name: c.name,
      email: c.email ?? "",
      company: c.company ?? "",
      phone: c.phone ?? "",
      vertical_id: (c.verticals as any)?.id ?? "",
      source: c.source,
      deal_stage: c.deal_stage,
      notes: "",
    });
    setSheetOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email || null,
        company: form.company || null,
        phone: form.phone || null,
        vertical_id: form.vertical_id || null,
        source: form.source,
        deal_stage: form.deal_stage,
        notes: form.notes || null,
        updated_at: new Date().toISOString(),
      };
      if (editContact) {
        const { error } = await (supabase as any)
          .from("platform_contacts").update(payload).eq("id", editContact.id);
        if (error) throw error;
        toast.success("Kontakt oppdatert");
      } else {
        const { error } = await (supabase as any)
          .from("platform_contacts").insert(payload);
        if (error) throw error;
        toast.success("Kontakt opprettet");
      }
      setSheetOpen(false);
      fetchContacts();
    } catch (err: any) {
      toast.error(err.message ?? "Kunne ikke lagre");
    } finally {
      setSaving(false);
    }
  };

  const filtered = contacts.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.email ?? "").toLowerCase().includes(q) ||
      (c.company ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-0">
      <CrmSubNav />
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Kontaktpersoner</h1>
            <p className="text-sm text-muted-foreground mt-1">{contacts.length} kontaktpersoner totalt</p>
          </div>
          <Button onClick={openNew} className="gap-2">
            <Plus className="h-4 w-4" /> Ny kontaktperson
          </Button>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Søk kontaktpersoner..."
            className="pl-9"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-sm text-muted-foreground">
              {search ? `Ingen treff på «${search}»` : "Ingen kontakter ennå"}
            </p>
          </div>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Navn</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground hidden md:table-cell">Selskap</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground hidden sm:table-cell">E-post</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground hidden lg:table-cell">Stadium</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground hidden lg:table-cell">Kilde</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr
                      key={c.id}
                      className="border-b last:border-0 hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => navigate(`/admin/crm/contacts/${c.id}`)}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 shrink-0">
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                              {c.name.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{c.name}</p>
                            {c.verticals && (
                              <p className="text-xs text-muted-foreground">{c.verticals.display_name}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 hidden md:table-cell">
                        {c.company ? (
                          <span className="inline-flex items-center gap-1.5 text-xs">
                            <Building2 className="h-3 w-3 text-muted-foreground" />{c.company}
                          </span>
                        ) : <span className="text-muted-foreground/50">–</span>}
                      </td>
                      <td className="py-3 px-4 hidden sm:table-cell text-muted-foreground">{c.email || "–"}</td>
                      <td className="py-3 px-4 hidden lg:table-cell">
                        <span className="text-xs text-muted-foreground">{c.deal_stage}</span>
                      </td>
                      <td className="py-3 px-4 hidden lg:table-cell">
                        <Badge
                          variant="secondary"
                          className={cn("text-[10px] px-1.5 py-0.5", SOURCE_COLORS[c.source])}
                        >
                          {c.source}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={(e) => { e.stopPropagation(); openEdit(c); }}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editContact ? "Rediger kontakt" : "Ny kontakt"}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label>Navn *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ola Nordmann" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>E-post</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="ola@bedrift.no" />
              </div>
              <div className="space-y-1.5">
                <Label>Telefon</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+47 123 45 678" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Selskap</Label>
              <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Bedrift AS" />
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
            <Button variant="outline" onClick={() => setSheetOpen(false)}>Avbryt</Button>
            <Button onClick={save} disabled={saving || !form.name.trim()}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editContact ? "Lagre" : "Opprett"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
