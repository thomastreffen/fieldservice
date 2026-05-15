import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { sendTeamsMessage, statusChangeCard, assignmentCard } from "@/lib/teamsWebhook";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Send, Lock, Paperclip, X, FileText, Download } from "lucide-react";
import { useState, useRef } from "react";
import { cn } from "@/lib/utils";

interface Ticket {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  assignee_id: string | null;
  created_at: string;
  updated_at: string;
  tenant_id: string;
  tenants: {
    name: string;
    slug: string;
    status: string;
    vertical_id: string | null;
    verticals: { display_name: string; color: string | null } | null;
    tenant_subscriptions: { status: string; plan_id: string | null; saas_plans: { name: string } | null }[] | null;
    tenant_modules: { module_name: string; is_active: boolean }[] | null;
    profiles: { count: number }[] | null;
  } | null;
}

interface Message {
  id: string;
  sender_id: string;
  message: string;
  is_internal: boolean;
  created_at: string;
  attachment_path: string | null;
  attachment_name: string | null;
  attachment_mime: string | null;
  attachment_size: number | null;
}

interface AdminUser {
  id: string;
  email: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  "Åpen": "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400",
  "Under behandling": "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400",
  "Løst": "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400",
  "Lukket": "bg-muted text-muted-foreground",
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("nb-NO", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

const ACCEPTED_TYPES = "image/jpeg,image/png,image/gif,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain";
const MAX_FILE_SIZE = 10 * 1024 * 1024;

function isImage(mime: string | null) {
  return mime?.startsWith("image/") ?? false;
}

function senderLabel(msg: Message, adminUsers: AdminUser[], currentUserId: string | undefined) {
  const isAdmin = adminUsers.some((u) => u.id === msg.sender_id);
  if (msg.sender_id === currentUserId) return "Deg (admin)";
  if (isAdmin) {
    const u = adminUsers.find((u) => u.id === msg.sender_id);
    return u?.email ?? "Admin";
  }
  return "Tenant";
}

function AttachmentDisplay({ path, name, mime }: { path: string; name: string | null; mime: string | null }) {
  const [url, setUrl] = useState<string | null>(null);

  useState(() => {
    supabase.storage.from("ticket-attachments").createSignedUrl(path, 3600).then(({ data }) => {
      if (data?.signedUrl) setUrl(data.signedUrl);
    });
  });

  if (!url) return null;

  if (isImage(mime)) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="mt-3 block">
        <img src={url} alt={name ?? "vedlegg"} className="max-h-64 rounded-lg border border-border object-contain" />
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="mt-3 flex items-center gap-2 text-xs text-primary hover:underline"
    >
      <Download className="h-3.5 w-3.5 shrink-0" />
      {name ?? "Last ned vedlegg"}
    </a>
  );
}

export default function AdminSupportTicketPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: settings } = usePlatformSettings();

  const [reply, setReply] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [attachment, setAttachment] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: ticket, isLoading } = useQuery<Ticket>({
    queryKey: ["admin-support-ticket", id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("support_tickets")
        .select(`
          id, title, description, category, priority, status, assignee_id, created_at, updated_at, tenant_id,
          tenants(
            name, slug, status, vertical_id,
            verticals(display_name, color),
            tenant_subscriptions(status, plan_id, saas_plans(name)),
            tenant_modules(module_name, is_active),
            profiles(count)
          )
        `)
        .eq("id", id)
        .single();
      return data;
    },
  });

  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ["admin-support-messages", id],
    enabled: !!id,
    staleTime: 10_000,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("support_messages")
        .select(`id, sender_id, message, is_internal, created_at, attachment_path, attachment_name, attachment_mime, attachment_size`)
        .eq("ticket_id", id)
        .order("created_at", { ascending: true });
      return data ?? [];
    },
  });

  const { data: adminUsers = [] } = useQuery<AdminUser[]>({
    queryKey: ["admin-users-list"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("user_roles")
        .select("user_id, profiles(email)")
        .eq("role", "master_admin");
      return (data ?? []).map((r: any) => ({ id: r.user_id, email: r.profiles?.email ?? null }));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (patch: Partial<Pick<Ticket, "status" | "priority" | "assignee_id">>) => {
      const { error } = await (supabase as any)
        .from("support_tickets")
        .update(patch)
        .eq("id", id);
      if (error) throw error;
      return patch;
    },
    onSuccess: (patch) => {
      qc.invalidateQueries({ queryKey: ["admin-support-ticket", id] });
      qc.invalidateQueries({ queryKey: ["admin-support-tickets"] });
      if (!settings?.teams_enabled || !settings.teams_webhook_url || !ticket) return;
      const tenantName = ticket.tenants?.name ?? "";
      if (patch?.status && settings.teams_notify_status_change) {
        sendTeamsMessage(settings.teams_webhook_url, statusChangeCard(ticket, patch.status, tenantName))
          .catch(() => { /* fire-and-forget */ });
      }
      if ("assignee_id" in patch && patch.assignee_id && settings.teams_notify_assignment) {
        const assignee = adminUsers.find((u) => u.id === patch.assignee_id);
        const email = assignee?.email ?? patch.assignee_id;
        sendTeamsMessage(settings.teams_webhook_url, assignmentCard(ticket, email, tenantName))
          .catch(() => { /* fire-and-forget */ });
      }
    },
    onError: () => toast.error("Kunne ikke oppdatere ticket"),
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!reply.trim() && !attachment || !user) return;
      let attachmentPath: string | null = null;
      let attachmentName: string | null = null;
      let attachmentMime: string | null = null;
      let attachmentSize: number | null = null;
      if (attachment) {
        const ext = attachment.name.split(".").pop();
        const path = `${ticket?.tenant_id}/${id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("ticket-attachments")
          .upload(path, attachment);
        if (uploadError) throw uploadError;
        attachmentPath = path;
        attachmentName = attachment.name;
        attachmentMime = attachment.type;
        attachmentSize = attachment.size;
      }
      const { error } = await (supabase as any)
        .from("support_messages")
        .insert({
          ticket_id: id,
          sender_id: user.id,
          message: reply.trim(),
          is_internal: isInternal,
          attachment_path: attachmentPath,
          attachment_name: attachmentName,
          attachment_mime: attachmentMime,
          attachment_size: attachmentSize,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      setReply("");
      setAttachment(null);
      qc.invalidateQueries({ queryKey: ["admin-support-messages", id] });
      qc.invalidateQueries({ queryKey: ["admin-support-ticket", id] });
    },
    onError: () => toast.error("Kunne ikke sende melding"),
  });

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!ticket) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Ticket ikke funnet</p>
        <Button variant="ghost" className="mt-4" onClick={() => navigate("/admin/support")}>Tilbake</Button>
      </div>
    );
  }

  const tenant = ticket.tenants;
  const subscription = tenant?.tenant_subscriptions?.[0];
  const activeModules = (tenant?.tenant_modules ?? []).filter((m) => m.is_active);

  return (
    <div className="flex gap-6 items-start">
      {/* Main content */}
      <div className="flex-1 min-w-0 space-y-6">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" className="mt-1 shrink-0" onClick={() => navigate("/admin/support")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight">{ticket.title}</h1>
              <span className={cn("text-[11px] font-medium px-2.5 py-0.5 rounded-full shrink-0", STATUS_COLORS[ticket.status] ?? "bg-muted text-muted-foreground")}>
                {ticket.status}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{ticket.category} · Opprettet {formatTime(ticket.created_at)}</p>
          </div>
        </div>

        {/* Controls row */}
        <div className="bg-card rounded-xl border border-border p-4 flex flex-wrap gap-4">
          <div className="space-y-1 min-w-[140px]">
            <Label className="text-xs">Status</Label>
            <Select
              value={ticket.status}
              onValueChange={(v) => updateMutation.mutate({ status: v as any })}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["Åpen", "Under behandling", "Løst", "Lukket"].map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 min-w-[120px]">
            <Label className="text-xs">Prioritet</Label>
            <Select
              value={ticket.priority}
              onValueChange={(v) => updateMutation.mutate({ priority: v as any })}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["Lav", "Normal", "Høy", "Kritisk"].map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 min-w-[180px]">
            <Label className="text-xs">Tildelt</Label>
            <Select
              value={ticket.assignee_id ?? "ingen"}
              onValueChange={(v) => updateMutation.mutate({ assignee_id: v === "ingen" ? null : v })}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Ikke tildelt" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ingen">Ikke tildelt</SelectItem>
                {adminUsers.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.email ?? u.id}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Original description */}
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center">
              <span className="text-xs font-semibold text-muted-foreground">T</span>
            </div>
            <div>
              <p className="text-xs font-medium">Tenant</p>
              <p className="text-[11px] text-muted-foreground">{formatTime(ticket.created_at)}</p>
            </div>
          </div>
          <p className="text-sm whitespace-pre-wrap">{ticket.description}</p>
        </div>

        {/* Thread */}
        {messages.length > 0 && (
          <div className="space-y-3">
            {messages.map((msg) => {
              const isAdmin = adminUsers.some((u) => u.id === msg.sender_id);
              return (
                <div
                  key={msg.id}
                  className={cn(
                    "rounded-xl border p-5",
                    msg.is_internal
                      ? "border-amber-200 bg-amber-50 dark:border-amber-800/40 dark:bg-amber-950/20"
                      : isAdmin
                      ? "border-primary/20 bg-primary/5"
                      : "border-border bg-card"
                  )}
                >
                  <div className="flex items-center gap-2 mb-3">
                    {msg.is_internal && (
                      <Lock className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                    )}
                    <div className={cn("h-7 w-7 rounded-full flex items-center justify-center shrink-0", isAdmin ? "bg-primary" : "bg-muted")}>
                      <span className={cn("text-xs font-semibold", isAdmin ? "text-primary-foreground" : "text-muted-foreground")}>
                        {isAdmin ? "A" : "T"}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs font-medium flex items-center gap-1.5">
                        {senderLabel(msg, adminUsers, user?.id)}
                        {msg.is_internal && (
                          <span className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 px-1.5 py-0.5 rounded font-medium">
                            Intern notat
                          </span>
                        )}
                      </p>
                      <p className="text-[11px] text-muted-foreground">{formatTime(msg.created_at)}</p>
                    </div>
                  </div>
                  {msg.message && <p className="text-sm whitespace-pre-wrap">{msg.message}</p>}
                  {msg.attachment_path && (
                    <AttachmentDisplay path={msg.attachment_path} name={msg.attachment_name} mime={msg.attachment_mime} />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Reply */}
        <div className="bg-card rounded-xl border border-border p-5 space-y-3">
          <div className="flex items-center gap-4">
            <p className="text-sm font-medium">Svar</p>
            <button
              onClick={() => setIsInternal((v) => !v)}
              className={cn(
                "flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md font-medium transition-colors",
                isInternal
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
                  : "bg-muted text-muted-foreground hover:bg-muted/60"
              )}
            >
              <Lock className="h-3 w-3" />
              {isInternal ? "Intern notat" : "Eksternt svar"}
            </button>
          </div>
          {isInternal && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Intern notat er kun synlig for master admin-teamet
            </p>
          )}
          <Textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder={isInternal ? "Skriv et internt notat..." : "Skriv svar til tenant..."}
            rows={4}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) sendMutation.mutate();
            }}
          />
          {attachment && (
            <div className="flex items-center gap-2 text-xs bg-muted/50 px-3 py-2 rounded-lg">
              <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="truncate flex-1">{attachment.name}</span>
              <button onClick={() => setAttachment(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <p className="text-[11px] text-muted-foreground">Ctrl+Enter for å sende</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >
                <Paperclip className="h-3.5 w-3.5" />
                Vedlegg
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_TYPES}
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  if (f.size > MAX_FILE_SIZE) { toast.error("Maks filstørrelse er 10MB"); return; }
                  setAttachment(f);
                  e.target.value = "";
                }}
              />
            </div>
            <Button
              onClick={() => sendMutation.mutate()}
              disabled={sendMutation.isPending || (!reply.trim() && !attachment)}
              className="gap-2"
            >
              {sendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {isInternal ? "Lagre notat" : "Send svar"}
            </Button>
          </div>
        </div>
      </div>

      {/* Tenant sidebar */}
      {tenant && (
        <aside className="w-72 shrink-0 space-y-4">
          <div className="bg-card rounded-xl border border-border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tenant</p>
              <button
                onClick={() => navigate(`/admin/tenants/${ticket.tenant_id}`)}
                className="text-[11px] text-primary hover:underline"
              >
                Åpne
              </button>
            </div>
            <div>
              <p className="font-semibold text-sm">{tenant.name}</p>
              <p className="text-xs text-muted-foreground font-mono">{tenant.slug}</p>
            </div>
            {tenant.verticals && (
              <div className="flex items-center gap-2">
                <div
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: tenant.verticals.color ?? "#6366f1" }}
                />
                <p className="text-xs text-muted-foreground">{tenant.verticals.display_name}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="bg-muted/40 rounded-lg px-3 py-2">
                <p className="text-[10px] text-muted-foreground">Plan</p>
                <p className="text-xs font-semibold mt-0.5">{subscription?.saas_plans?.name ?? "—"}</p>
              </div>
              <div className="bg-muted/40 rounded-lg px-3 py-2">
                <p className="text-[10px] text-muted-foreground">Status</p>
                <p className="text-xs font-semibold mt-0.5 capitalize">{tenant.status}</p>
              </div>
            </div>
          </div>

          {activeModules.length > 0 && (
            <div className="bg-card rounded-xl border border-border p-4 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Aktive moduler</p>
              <div className="flex flex-wrap gap-1.5">
                {activeModules.map((m) => (
                  <span key={m.module_name} className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded font-mono">
                    {m.module_name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </aside>
      )}
    </div>
  );
}
