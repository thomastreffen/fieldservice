import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdminUsers } from "@/hooks/useAdminUsers";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Task {
  id: string;
  title: string;
  type: string;
  priority: string;
  status: string;
  assignee_id: string | null;
  vertical_id: string | null;
  ticket_id: string | null;
  verticals: { display_name: string; color: string | null } | null;
}

interface Vertical { id: string; display_name: string }

const COLUMNS = [
  { status: "Backlog", dot: "bg-muted-foreground/60" },
  { status: "Under arbeid", dot: "bg-blue-500" },
  { status: "Review", dot: "bg-violet-500" },
  { status: "Ferdig", dot: "bg-emerald-500" },
];

const PRIORITY_COLORS: Record<string, string> = {
  Lav: "bg-muted text-muted-foreground",
  Normal: "bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-400",
  Høy: "bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-400",
  Kritisk: "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400",
};

const TYPE_COLORS: Record<string, string> = {
  "Feil": "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400",
  "Funksjonsønske": "bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-400",
  "Intern oppgave": "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400",
  "Tenant-bestilling": "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400",
};

function initials(user: AdminUser | undefined) {
  if (!user) return "?";
  return ((user.full_name || user.email || "?")[0]).toUpperCase();
}

export default function AdminProjectsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<string | null>(null);
  const [filterAssignee, setFilterAssignee] = useState("alle");
  const [filterVertical, setFilterVertical] = useState("alle");
  const [filterPriority, setFilterPriority] = useState("alle");
  const [filterType, setFilterType] = useState("alle");

  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ["project-tasks"],
    staleTime: 30_000,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("project_tasks")
        .select("id, title, type, priority, status, assignee_id, vertical_id, ticket_id, verticals(display_name, color)")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: adminUsers = [] } = useAdminUsers();

  const { data: verticals = [] } = useQuery<Vertical[]>({
    queryKey: ["verticals-list"],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data } = await (supabase as any).from("verticals").select("id, display_name");
      return data ?? [];
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await (supabase as any).from("project_tasks").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["project-tasks"] }),
    onError: () => toast.error("Kunne ikke oppdatere status"),
  });

  const filtered = tasks.filter(t => {
    if (filterAssignee !== "alle" && t.assignee_id !== filterAssignee) return false;
    if (filterVertical !== "alle" && t.vertical_id !== filterVertical) return false;
    if (filterPriority !== "alle" && t.priority !== filterPriority) return false;
    if (filterType !== "alle" && t.type !== filterType) return false;
    return true;
  });

  function handleDrop(status: string) {
    if (draggingId && draggingId !== status) {
      const task = tasks.find(t => t.id === draggingId);
      if (task && task.status !== status) {
        statusMutation.mutate({ id: draggingId, status });
      }
    }
    setDraggingId(null);
    setDragOverStatus(null);
  }

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Prosjekter</h1>
          <p className="text-muted-foreground mt-1">Interne oppgaver, feil og funksjonsønsker</p>
        </div>
        <Button onClick={() => navigate("/admin/projects/new")} className="gap-2">
          <Plus className="h-4 w-4" /> Ny oppgave
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Select value={filterAssignee} onValueChange={setFilterAssignee}>
          <SelectTrigger className="h-9 w-44"><SelectValue placeholder="Alle ansatte" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="alle">Alle ansatte</SelectItem>
            {adminUsers.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterVertical} onValueChange={setFilterVertical}>
          <SelectTrigger className="h-9 w-44"><SelectValue placeholder="Alle vertikaler" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="alle">Alle vertikaler</SelectItem>
            {verticals.map(v => <SelectItem key={v.id} value={v.id}>{v.display_name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="h-9 w-44"><SelectValue placeholder="Alle typer" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="alle">Alle typer</SelectItem>
            {["Feil", "Funksjonsønske", "Intern oppgave", "Tenant-bestilling"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="h-9 w-40"><SelectValue placeholder="Alle prioriteter" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="alle">Alle prioriteter</SelectItem>
            {["Kritisk", "Høy", "Normal", "Lav"].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Kanban board */}
      <div className="flex gap-4 overflow-x-auto pb-4 -mx-6 lg:-mx-8 px-6 lg:px-8">
        {COLUMNS.map(col => {
          const colTasks = filtered.filter(t => t.status === col.status);
          const isOver = dragOverStatus === col.status;
          return (
            <div
              key={col.status}
              className={cn(
                "flex-shrink-0 w-72 flex flex-col rounded-xl border border-border transition-colors",
                isOver ? "border-primary/50 bg-primary/5" : "bg-muted/20",
              )}
              onDragOver={e => { e.preventDefault(); setDragOverStatus(col.status); }}
              onDragLeave={() => setDragOverStatus(null)}
              onDrop={() => handleDrop(col.status)}
            >
              <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
                <span className={cn("h-2 w-2 rounded-full shrink-0", col.dot)} />
                <span className="text-sm font-semibold">{col.status}</span>
                <span className="text-xs text-muted-foreground bg-muted rounded-full px-1.5 py-0.5 ml-auto">
                  {colTasks.length}
                </span>
              </div>

              <div className="flex flex-col gap-2 p-2 flex-1 min-h-[120px]">
                {colTasks.map(task => {
                  const assignee = adminUsers.find(u => u.id === task.assignee_id);
                  return (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={() => setDraggingId(task.id)}
                      onDragEnd={() => { setDraggingId(null); setDragOverStatus(null); }}
                      onClick={() => navigate(`/admin/projects/${task.id}`)}
                      className={cn(
                        "bg-card border border-border rounded-lg p-3 cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all select-none",
                        draggingId === task.id && "opacity-50",
                      )}
                    >
                      <div className="flex flex-wrap gap-1 mb-2">
                        <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded", TYPE_COLORS[task.type] ?? "bg-muted text-muted-foreground")}>
                          {task.type}
                        </span>
                        <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded", PRIORITY_COLORS[task.priority] ?? "bg-muted text-muted-foreground")}>
                          {task.priority}
                        </span>
                      </div>
                      <p className="text-sm font-medium leading-snug line-clamp-2">{task.title}</p>
                      <div className="flex items-center justify-between mt-2.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {task.verticals && (
                            <span
                              className="text-[10px] text-muted-foreground px-1.5 py-0.5 rounded font-mono truncate max-w-[100px]"
                              style={{ backgroundColor: task.verticals.color ? `${task.verticals.color}20` : undefined }}
                            >
                              {task.verticals.display_name}
                            </span>
                          )}
                          {task.ticket_id && (
                            <button
                              className="text-[10px] text-primary hover:underline shrink-0"
                              onClick={e => { e.stopPropagation(); navigate(`/admin/support/${task.ticket_id}`); }}
                            >
                              #ticket
                            </button>
                          )}
                        </div>
                        {assignee && (
                          <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 ml-1">
                            <span className="text-[10px] font-semibold text-primary">{initials(assignee)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
