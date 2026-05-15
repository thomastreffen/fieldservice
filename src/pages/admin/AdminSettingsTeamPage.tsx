import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdminUsers } from "@/hooks/useAdminUsers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, UserPlus, Shield, Mail } from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SERVICE_ROLE_KEY = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY as string;

function initials(fullName: string | null, email: string | null) {
  const name = fullName || email || "?";
  return name[0].toUpperCase();
}

export default function AdminSettingsTeamPage() {
  const qc = useQueryClient();
  const { data: members = [], isLoading } = useAdminUsers();
  const [email, setEmail] = useState("");
  const [inviting, setInviting] = useState(false);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;
    setInviting(true);
    try {
      // Send Supabase auth invite — returns the created user object including its ID
      const res = await fetch(`${SUPABASE_URL}/auth/v1/invite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
          "apikey": SERVICE_ROLE_KEY,
        },
        body: JSON.stringify({ email: trimmed }),
      });
      const invited = await res.json();
      if (!res.ok || !invited?.id) {
        throw new Error(invited?.msg || invited?.error_description || "Ukjent feil");
      }

      // Grant master_admin role immediately so they have access when they sign in
      const { error: roleError } = await (supabase as any)
        .from("user_roles")
        .upsert({ user_id: invited.id, role: "master_admin" }, { onConflict: "user_id,role" });
      if (roleError) throw roleError;

      toast.success(`Invitasjon sendt til ${trimmed}`);
      setEmail("");
      qc.invalidateQueries({ queryKey: ["admin-users-list"] });
    } catch (err: any) {
      toast.error(err?.message ?? "Kunne ikke sende invitasjon");
    } finally {
      setInviting(false);
    }
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Teammedlemmer</h1>
        <p className="text-muted-foreground mt-1">Administrer master admin-teamet og inviter nye medlemmer</p>
      </div>

      {/* Current members */}
      <div className="bg-card rounded-xl border border-border divide-y divide-border">
        <div className="px-5 py-3 flex items-center gap-2">
          <Shield className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm font-semibold">
            Nåværende teammedlemmer
            {!isLoading && (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                ({members.length})
              </span>
            )}
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : members.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-muted-foreground">
            Ingen teammedlemmer funnet
          </div>
        ) : (
          members.map((member) => (
            <div key={member.id} className="flex items-center gap-4 px-5 py-4">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-sm font-semibold text-primary">
                  {initials(member.full_name, member.email)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {member.full_name || <span className="text-muted-foreground italic">Ikke satt</span>}
                </p>
                <p className="text-xs text-muted-foreground truncate">{member.email ?? member.id}</p>
              </div>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-primary/10 text-primary shrink-0">
                Master Admin
              </span>
            </div>
          ))
        )}
      </div>

      {/* Invite form */}
      <div className="bg-card rounded-xl border border-border p-5 space-y-4">
        <div className="flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm font-semibold">Inviter nytt teammedlem</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Brukeren mottar en e-post med lenke for å sette opp kontoen sin. De får automatisk master admin-tilgang.
        </p>
        <form onSubmit={handleInvite} className="flex gap-3">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="invite-email" className="text-xs">E-postadresse</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="invite-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="navn@example.com"
                className="pl-9"
                required
              />
            </div>
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={inviting || !email.trim()} className="gap-2">
              {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              Send invitasjon
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
