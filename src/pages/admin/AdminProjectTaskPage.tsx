import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { supabase } from "@/integrations/supabase/client";
import { sendTeamsMessage, taskStatusCard } from "@/lib/teamsWebhook";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Send, Bot } from "lucide-react";
import { cn } from "@/lib/utils";

interface Task {
  id: string; title: string; description: string; type: string; priority: string; status: string;
  assignee_id: string | null; vertical_id: string | null; tenant_id: string | null;
  ticket_id: string | null; estimated_hours: number | null; logged_hours: number;
  created_at: string; updated_at: string;
  verticals: { display_name: string; color: string | null } | null;
  tenants: { name: string } | null;
  support_tickets: { id: string; title: string } | null;
}

interface Comment {
  id: string; author_id: string | null; comment: string; is_system: boolean; created_at: string;
  profiles: { full_name: string | null; email: string | null } | null;
}

const TYPES = ["Feil", "Funksjonsønske", "Intern oppgave", "Tenant-bestilling"];
const PRIORITIES = ["Lav", "Normal", "Høy", "Kritisk"];
const STATUSES = ["Backlog", "Under arbeid", "Review", "Ferdig"];

const STATUS_COLORS: Record<string, string> = {
  Backlog: "bg-muted text-muted-foreground",
  "Under arbeid": "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400",
  Review: "bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-400",
  Ferdig: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400",
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("nb-NO", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function AdminProjectTaskPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: settings } = usePlatformSettings();

  const [comment, setComment] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editType, setEditType] = useState("");
  const [editPriority, setEditPriority] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editAssignee, setEditAssignee] = useState("ingen");
  const [editVertical, setEditVertical] = useState("ingen");
  const [editTenant, setEditTenant] = useState("ingen");
  const [editTicket, setEditTicket] = useState("ingen");
  const [editEstimated, setEditEstimated] = useState("");
  const [editLogged, setEditLogged] = useState("");

  const { data: task, isLoading } = useQuery<Task>({
    queryKey: ["project-task", id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("project_tasks")
        .select("*, verticals(display_name, color), tenants(name), support_tickets(id, title)")
        .eq("id", id)
        .single();
      return data;
    },
  });

  const { data: comments = [] } = useQuery<Comment[]>({
    queryKey: ["task-comments", id],
    enabled: !!id,
    staleTime: 15_000,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("task_comments")
        .select("id, author_id, comment, is_system, created_at, profiles(full_name, email)")
        .eq("task_id", id)
        .order("created_at", { ascending: true });
      return data ?? [];
    },
  });

  const { data: adminUsers = [] } = useQuery<{ id: string; email: string | null; full_name: string | null }[]>({
    queryKey: ["admin-users-list"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await (supabase as any).from("user_roles").select("user_id, profiles(email, full_name)").eq("role", "master_admin");
      return (data ?? []).map((r: any) => ({ id: r.user_id, email: r.profiles?.email ?? null, full_name: r.profiles?.full_name ?? null }));
    },
  });

  const { data: verticals = [] } = useQuery<{ id: string; display_name: string }[]>({
    queryKey: ["verticals-list"], staleTime: 10 * 60 * 1000,
    queryFn: async () => { const { data } = await (supabase as any).from("verticals").select("id, display_name"); return data ?? []; },
  });
  const { data: tenants = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["tenants-list"], staleTime: 5 * 60 * 1000,
    queryFn: async () => { const { data } = await (supabase as any).from("tenants").select("id, name").order("name"); return data ?? []; },
  });
  const { data: tickets = [] } = useQuery<{ id: string; title: string }[]>({
    queryKey: ["support-tickets-list"], staleTime: 60_000,
    queryFn: async () => {
      const { data } = await (supabase as any).from("support_tickets").select("id, title").order("created_at", { ascending: false }).limit(60);
      return data ?? [];
    },
  });

  useEffect(() => {
    if (!task) return;
    setEditTitle(task.title);
    setEditDescription(task.description);
    setEditType(task.type);
    setEditPriority(task.priority);
    setEditStatus(task.status);
    setEditAssignee(task.assignee_id ?? "ingen");
    setEditVertical(task.vertical_id ?? "ingen");
    setEditTenant(task.tenant_id ?? "ingen");
    setEditTicket(task.ticket_id ?? "ingen");
    setEditEstimated(task.estimated_hours != null ? String(task.estimated_hours) : "");
    setEditLogged(String(task.logged_hours));
  }, [task]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const patch = {
        title: editTitle.trim(),
        description: editDescription.trim(),
        type: editType,
        priority: editPriority,
        status: editStatus,
        assignee_id: editAssignee === "ingen" ? null : editAssignee,
        vertical_id: editVertical === "ingen" ? null : editVertical,
        tenant_id: editTenant === "ingen" ? null : editTenant,
        ticket_id: editTicket === "ingen" ? null : editTicket,
        estimated_hours: editEstimated ? parseFloat(editEstimated) : null,
        logged_hours: parseFloat(editLogged) || 0,
      };
      const { error } = await (supabase as any).from("project_tasks").update(patch).eq("id", id);
      if (error) throw error;
      return patch;
    },
    onSuccess: async (patch) => {
      if (task && patch.status !== task.status) {
        await (supabase as any).from("task_comments").insert({
          task_id: id, author_id: null,
          comment: `Status endret fra «${task.status}» til «${patch.status}»`,
          is_system: true,
        });
        if (settings?.teams_enabled && settings.teams_webhook_url) {
          sendTeamsMessage(settings.teams_webhook_url, taskStatusCard({ id: id!, title: editTitle }, patch.status))
            .catch(() => {});
        }
        qc.invalidateQueries({ queryKey: ["task-comments", id] });
      }
      qc.invalidateQueries({ queryKey: ["project-task", id] });
      qc.invalidateQueries({ queryKey: ["project-tasks"] });
      toast.success("Endringer lagret");
    },
    onError: () => toast.error("Kunne ikke lagre"),
  });

  const commentMutation = useMutation({
    mutationFn: async () => {
      if (!comment.trim() || !user) return;
      const { error } = await (supabase as any).from("task_comments").insert({
        task_id: id, author_id: user.id, comment: comment.trim(), is_system: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setComment("");
      qc.invalidateQueries({ queryKey: ["task-comments", id] });
    },
    onError: () => toast.error("Kunne ikke legge til kommentar"),
  });

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!task) return (
    <div className="text-center py-20">
      <p className="text-muted-foreground">Oppgave ikke funnet</p>
      <Button variant="ghost" className="mt-4" onClick={() => navigate("/admin/projects")}>Tilbake</Button>
    </div>
  );

  return (
    <div className="flex gap-6 items-start">
      {/* Main */}
      <div className="flex-1 min-w-0 space-y-6">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" className="mt-1 shrink-0" onClick={() => navigate("/admin/projects")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={cn("text-[11px] font-medium px-2.5 py-0.5 rounded-full shrink-0", STATUS_COLORS[task.status] ?? "bg-muted text-muted-foreground")}>
                {task.status}
              </span>
            </div>
            <Input
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              className="text-2xl font-bold border-0 bg-transparent px-0 focus-visible:ring-0 h-auto"
            />
          </div>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="gap-2 shrink-0">
            {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Lagre
          </Button>
        </div>

        <div className="bg-card rounded-xl border border-border p-5 space-y-1.5">
          <Label>Beskrivelse</Label>
          <Textarea
            value={editDescription}
            onChange={e => setEditDescription(e.target.value)}
            placeholder="Legg til en beskrivelse..."
            rows={6}
          />
        </div>

        {/* Activity + comments */}
        <div className="space-y-3">
          <p className="text-sm font-semibold">Aktivitet</p>
          {comments.map(c => (
            <div
              key={c.id}
              className={cn(
                "rounded-xl border p-4",
                c.is_system
                  ? "border-muted bg-muted/30"
                  : "border-border bg-card",
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                {c.is_system ? (
                  <Bot className="h-4 w-4 text-muted-foreground shrink-0" />
                ) : (
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-[10px] font-semibold text-primary">
                      {(c.profiles?.full_name || c.profiles?.email || "?")[0].toUpperCase()}
                    </span>
                  </div>
                )}
                <p className="text-xs font-medium">
                  {c.is_system ? "System" : (c.profiles?.full_name || c.profiles?.email || "Ukjent")}
                </p>
                <p className="text-[11px] text-muted-foreground">{formatTime(c.created_at)}</p>
              </div>
              <p className={cn("text-sm whitespace-pre-wrap", c.is_system && "text-muted-foreground italic")}>{c.comment}</p>
            </div>
          ))}

          <div className="bg-card rounded-xl border border-border p-4 space-y-3">
            <Textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Skriv en kommentar..."
              rows={3}
              onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) commentMutation.mutate(); }}
            />
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-muted-foreground">Ctrl+Enter for å sende</p>
              <Button size="sm" onClick={() => commentMutation.mutate()} disabled={commentMutation.isPending || !comment.trim()} className="gap-2">
                {commentMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Kommenter
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <aside className="w-64 shrink-0 space-y-4">
        <div className="bg-card rounded-xl border border-border p-4 space-y-4">
          <Field label="Type">
            <Select value={editType} onValueChange={setEditType}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Prioritet">
            <Select value={editPriority} onValueChange={setEditPriority}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Status">
            <Select value={editStatus} onValueChange={setEditStatus}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Tildelt">
            <Select value={editAssignee} onValueChange={setEditAssignee}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Ikke tildelt" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ingen">Ikke tildelt</SelectItem>
                {adminUsers.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Vertikal">
            <Select value={editVertical} onValueChange={setEditVertical}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Ingen" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ingen">Ingen</SelectItem>
                {verticals.map(v => <SelectItem key={v.id} value={v.id}>{v.display_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Tenant">
            <Select value={editTenant} onValueChange={setEditTenant}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Ingen" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ingen">Ingen</SelectItem>
                {tenants.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Koblet ticket">
            <Select value={editTicket} onValueChange={setEditTicket}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Ingen" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ingen">Ingen</SelectItem>
                {tickets.map(t => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          {task.support_tickets && (
            <button
              onClick={() => navigate(`/admin/support/${task.support_tickets!.id}`)}
              className="text-xs text-primary hover:underline"
            >
              Åpne koblet ticket →
            </button>
          )}
        </div>

        <div className="bg-card rounded-xl border border-border p-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Timer</p>
          <Field label="Estimert">
            <Input type="number" min="0" step="0.5" value={editEstimated} onChange={e => setEditEstimated(e.target.value)} className="h-8 text-xs" placeholder="0" />
          </Field>
          <Field label="Logget">
            <Input type="number" min="0" step="0.5" value={editLogged} onChange={e => setEditLogged(e.target.value)} className="h-8 text-xs" placeholder="0" />
          </Field>
        </div>

        <div className="bg-card rounded-xl border border-border p-4 space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Info</p>
          <p className="text-[11px] text-muted-foreground">Opprettet {formatTime(task.created_at)}</p>
          <p className="text-[11px] text-muted-foreground">Oppdatert {formatTime(task.updated_at)}</p>
        </div>
      </aside>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}
