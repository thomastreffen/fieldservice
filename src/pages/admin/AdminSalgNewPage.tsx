import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";

type Vertical = { id: string; display_name: string };
type Profile = { user_id: string; full_name: string | null; email: string | null };

export default function AdminSalgNewPage() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [verticalId, setVerticalId] = useState("");
  const [source, setSource] = useState("manuelt");
  const [notes, setNotes] = useState("");
  const [assigneeId, setAssigneeId] = useState("");

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

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from("sales_leads").insert({
        name: name.trim(),
        email: email.trim() || null,
        company: company.trim() || null,
        phone: phone.trim() || null,
        vertical_id: verticalId || null,
        source,
        notes: notes.trim() || null,
        assignee_id: assigneeId || null,
        deal_stage: "Ny lead",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lead opprettet");
      navigate("/admin/salg");
    },
    onError: () => toast.error("Feil ved oppretting"),
  });

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/salg")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-xl font-bold">Ny lead</h1>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Navn *</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ola Nordmann" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">E-post</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ola@bedrift.no" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="company">Selskap</Label>
            <Input id="company" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Bedrift AS" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Telefon</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+47 123 45 678" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Vertikal</Label>
            <Select value={verticalId} onValueChange={setVerticalId}>
              <SelectTrigger>
                <SelectValue placeholder="Velg bransje..." />
              </SelectTrigger>
              <SelectContent>
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
        </div>

        <div className="space-y-1.5">
          <Label>Ansvarlig</Label>
          <Select value={assigneeId} onValueChange={setAssigneeId}>
            <SelectTrigger>
              <SelectValue placeholder="Velg ansvarlig..." />
            </SelectTrigger>
            <SelectContent>
              {profiles.map((p) => (
                <SelectItem key={p.user_id} value={p.user_id}>
                  {p.full_name ?? p.email ?? p.user_id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="notes">Notater</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ytterligere informasjon om denne leaden..."
            rows={4}
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            onClick={() => create.mutate()}
            disabled={!name.trim() || create.isPending}
            className="gap-2"
          >
            {create.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Opprett lead
          </Button>
          <Button variant="outline" onClick={() => navigate("/admin/salg")}>Avbryt</Button>
        </div>
      </div>
    </div>
  );
}
